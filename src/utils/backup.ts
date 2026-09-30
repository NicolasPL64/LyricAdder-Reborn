import { appLocalDataDir, join } from "@tauri-apps/api/path"
import { mkdir, readDir, readTextFile, remove, rename, writeTextFile } from "@tauri-apps/plugin-fs"

// Maximum number of backups kept per kind (lyrics / chart) for a single chart.
export const MAX_BACKUPS_PER_KIND = 5

// Chart snapshots older than this are pruned. Lyrics backups are transient and
// get cleared on save, so only chart snapshots expire by age.
export const CHART_BACKUP_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

const TIMESTAMP_REGEX = /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})-(\d{3})/

export type BackupKind = "chart" | "lyrics"

export interface BackupEntry {
    path: string
    timestamp: number
    kind: BackupKind
}

// Stable short hash of the absolute chart path, so the same file always maps to
// the same folder regardless of its (often generic, e.g. "notes.chart") name.
export function hashPath(path: string): string {
    let hash = 0x811c9dc5
    for (let i = 0; i < path.length; i++) {
        hash ^= path.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(16).padStart(8, "0")
}

// Local timestamp usable as a filename, lexicographically sortable (newest last).
export function timestamp(): string {
    const d = new Date()
    const pad = (n: number, width = 2) => String(n).padStart(width, "0")
    return (
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}`
    )
}

export function parseTimestamp(name: string): number | null {
    const match = name.match(TIMESTAMP_REGEX)
    if (!match) return null
    const [, year, month, day, hour, minute, second, ms] = match.map(Number)
    return new Date(year, month - 1, day, hour, minute, second, ms).getTime()
}

async function chartBackupDir(chartPath: string): Promise<string> {
    return await join(await appLocalDataDir(), "backups", hashPath(chartPath))
}

async function ensureChartBackupDir(chartPath: string): Promise<string> {
    const dir = await chartBackupDir(chartPath)
    await mkdir(dir, { recursive: true })
    return dir
}

// Writes to a temp file and renames, so a crash mid-write never leaves a
// half-written backup at the final path.
async function writeAtomic(filePath: string, contents: string): Promise<void> {
    const tmpPath = `${filePath}.tmp`
    await writeTextFile(tmpPath, contents)
    await rename(tmpPath, filePath)
}

// Saves the plain lyrics text of the current editing session.
export async function backupLyrics(chartPath: string, lyrics: string): Promise<string> {
    const dir = await ensureChartBackupDir(chartPath)
    const filePath = await join(dir, `${timestamp()}.lyrics.txt`)
    await writeAtomic(filePath, lyrics)
    return filePath
}

// Snapshot of the chart as it exists on disk, taken right before saving. The
// first call captures the original; later calls capture each previous state.
export async function backupBeforeSave(chartPath: string): Promise<string | null> {
    const contents = await readTextFile(chartPath).catch(() => null)
    if (contents === null) return null
    const dir = await ensureChartBackupDir(chartPath)
    const filePath = await join(dir, `${timestamp()}.chart`)
    await writeAtomic(filePath, contents)
    return filePath
}

export async function listBackups(chartPath: string): Promise<BackupEntry[]> {
    const dir = await chartBackupDir(chartPath)
    let entries
    try {
        entries = await readDir(dir)
    } catch {
        return [] // The folder does not exist yet.
    }

    const backups: BackupEntry[] = []
    for (const entry of entries) {
        if (!entry.isFile) continue
        const ts = parseTimestamp(entry.name)
        if (ts === null) continue
        if (entry.name.endsWith(".lyrics.txt")) {
            backups.push({
                path: await join(dir, entry.name),
                timestamp: ts,
                kind: "lyrics",
            })
        } else if (entry.name.endsWith(".chart")) {
            backups.push({
                path: await join(dir, entry.name),
                timestamp: ts,
                kind: "chart",
            })
        }
    }
    return backups.sort((a, b) => b.timestamp - a.timestamp)
}

export async function getLatestBackups(
    chartPath: string
): Promise<{ lyrics: BackupEntry | null; chart: BackupEntry | null }> {
    const backups = await listBackups(chartPath)
    return {
        lyrics: backups.find((b) => b.kind === "lyrics") ?? null,
        chart: backups.find((b) => b.kind === "chart") ?? null,
    }
}

export function readBackup(backup: BackupEntry): Promise<string> {
    return readTextFile(backup.path)
}

// Removes the lyrics backups once the chart has been saved successfully (the
// unsaved changes they held are now on disk).
export async function clearLyricsBackups(chartPath: string): Promise<void> {
    const backups = await listBackups(chartPath)
    await Promise.all(
        backups.filter((b) => b.kind === "lyrics").map((b) => remove(b.path).catch(() => undefined))
    )
}

// Keeps the newest backups of each kind (count cap) and drops chart snapshots
// older than the age cap. Also cleans up temp files left by interrupted writes.
export async function pruneChartBackups(chartPath: string): Promise<void> {
    const dir = await chartBackupDir(chartPath)
    const backups = await listBackups(chartPath)
    const now = Date.now()

    const cleanup: Promise<void>[] = []
    try {
        for (const entry of await readDir(dir)) {
            if (entry.name.endsWith(".tmp")) {
                cleanup.push(remove(await join(dir, entry.name)).catch(() => undefined))
            }
        }
    } catch {
        // Folder does not exist; nothing to prune.
    }

    for (const kind of ["chart", "lyrics"] as const) {
        const ofKind = backups
            .filter((b) => b.kind === kind)
            .sort((a, b) => b.timestamp - a.timestamp)
        ofKind.forEach((backup, index) => {
            const tooOld = kind === "chart" && now - backup.timestamp > CHART_BACKUP_MAX_AGE_MS
            const beyondCap = index >= MAX_BACKUPS_PER_KIND
            if (tooOld || beyondCap) cleanup.push(remove(backup.path).catch(() => undefined))
        })
    }

    await Promise.all(cleanup)
}
