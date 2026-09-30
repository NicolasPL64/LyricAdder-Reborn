import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
    backupBeforeSave,
    backupLyrics,
    CHART_BACKUP_MAX_AGE_MS,
    clearLyricsBackups,
    getLatestBackups,
    hashPath,
    listBackups,
    MAX_BACKUPS_PER_KIND,
    parseTimestamp,
    pruneChartBackups,
    readBackup,
    timestamp,
} from "@/utils/backup"

vi.mock("@tauri-apps/api/path", () => ({
    appLocalDataDir: vi.fn().mockResolvedValue("/mock/appdata"),
    join: vi.fn((...parts: string[]) => parts.join("/")),
}))

const fsMock = vi.hoisted(() => ({
    mkdir: vi.fn(),
    readDir: vi.fn(),
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-fs", () => fsMock)

const entry = (name: string) => ({
    name,
    isFile: true,
    isDirectory: false,
    isSymlink: false,
})

const chartPath = "/songs/notes.chart"
const chartDir = () => `/mock/appdata/backups/${hashPath(chartPath)}`

beforeEach(() => {
    fsMock.mkdir.mockResolvedValue(undefined)
    fsMock.readDir.mockResolvedValue([])
    fsMock.readTextFile.mockResolvedValue("chart-content")
    fsMock.writeTextFile.mockResolvedValue(undefined)
    fsMock.rename.mockResolvedValue(undefined)
    fsMock.remove.mockResolvedValue(undefined)
})

describe("hashPath", () => {
    it("is stable and produces an 8-char hex hash", () => {
        expect(hashPath(chartPath)).toBe(hashPath(chartPath))
        expect(hashPath(chartPath)).toMatch(/^[0-9a-f]{8}$/)
    })

    it("differs for different paths", () => {
        expect(hashPath("/a/notes.chart")).not.toBe(hashPath("/b/notes.chart"))
    })
})

describe("timestamp / parseTimestamp", () => {
    it("round-trips a timestamp through parseTimestamp", () => {
        vi.setSystemTime(new Date("2026-09-29T10:05:07.123"))
        const ts = timestamp()
        expect(parseTimestamp(ts)).toBe(new Date("2026-09-29T10:05:07.123").getTime())
    })

    it("returns null for names that do not match the timestamp format", () => {
        expect(parseTimestamp("notes.chart")).toBeNull()
        expect(parseTimestamp("backup.tmp")).toBeNull()
    })
})

describe("backupLyrics", () => {
    beforeEach(() => {
        vi.setSystemTime(new Date("2026-09-29T10:05:07.123"))
    })

    it("creates the hashed folder and writes atomically", async () => {
        const file = await backupLyrics(chartPath, "hello world")

        expect(fsMock.mkdir).toHaveBeenCalledWith(chartDir(), { recursive: true })
        const expected = `${chartDir()}/${timestamp()}.lyrics.txt`
        expect(file).toBe(expected)
        expect(fsMock.writeTextFile).toHaveBeenCalledWith(`${expected}.tmp`, "hello world")
        expect(fsMock.rename).toHaveBeenCalledWith(`${expected}.tmp`, expected)
    })
})

describe("backupBeforeSave", () => {
    it("snapshots the on-disk chart before it is overwritten", async () => {
        vi.setSystemTime(new Date("2026-09-29T10:05:07.123"))
        fsMock.readTextFile.mockResolvedValue("original-chart")

        const file = await backupBeforeSave(chartPath)

        expect(fsMock.readTextFile).toHaveBeenCalledWith(chartPath)
        expect(file).toBe(`${chartDir()}/${timestamp()}.chart`)
    })

    it("returns null when the chart cannot be read", async () => {
        fsMock.readTextFile.mockRejectedValue(new Error("missing"))
        expect(await backupBeforeSave(chartPath)).toBeNull()
    })
})

describe("listBackups", () => {
    it("lists chart and lyrics backups newest first, ignoring other files", async () => {
        fsMock.readDir.mockResolvedValue([
            entry("2026-09-29_10-04-00-000.chart"),
            entry("2026-09-29_10-05-00-000.lyrics.txt"),
            entry("2026-09-29_10-03-00-000.chart"),
            entry("stray.tmp"),
            entry("notes.chart"),
        ])

        const backups = await listBackups(chartPath)

        expect(backups.map((b) => b.kind)).toEqual(["lyrics", "chart", "chart"])
        expect(backups[0].path).toBe(`${chartDir()}/2026-09-29_10-05-00-000.lyrics.txt`)
        expect(backups[0].timestamp).toBeGreaterThan(backups[1].timestamp)
    })

    it("returns an empty array when the folder does not exist", async () => {
        fsMock.readDir.mockRejectedValue(new Error("not found"))
        expect(await listBackups(chartPath)).toEqual([])
    })
})

describe("getLatestBackups", () => {
    it("returns the newest lyrics and chart backup", async () => {
        fsMock.readDir.mockResolvedValue([
            entry("2026-09-29_10-00-00-000.chart"),
            entry("2026-09-29_10-04-00-000.lyrics.txt"),
            entry("2026-09-29_10-05-00-000.lyrics.txt"),
        ])

        const latest = await getLatestBackups(chartPath)

        expect(latest.lyrics?.path).toContain("10-05-00")
        expect(latest.chart?.path).toContain("10-00-00")
    })
})

describe("readBackup", () => {
    it("reads the backup file contents", async () => {
        fsMock.readTextFile.mockResolvedValue("backed-up lyrics")
        const contents = await readBackup({
            path: `${chartDir()}/x.lyrics.txt`,
            timestamp: 0,
            kind: "lyrics",
        })
        expect(contents).toBe("backed-up lyrics")
        expect(fsMock.readTextFile).toHaveBeenCalledWith(`${chartDir()}/x.lyrics.txt`)
    })
})

describe("clearLyricsBackups", () => {
    it("removes lyrics backups and keeps chart snapshots", async () => {
        fsMock.readDir.mockResolvedValue([
            entry("2026-09-29_10-00-00-000.chart"),
            entry("2026-09-29_10-05-00-000.lyrics.txt"),
        ])

        await clearLyricsBackups(chartPath)

        expect(fsMock.remove).toHaveBeenCalledTimes(1)
        expect(fsMock.remove).toHaveBeenCalledWith(
            `${chartDir()}/2026-09-29_10-05-00-000.lyrics.txt`
        )
    })
})

describe("pruneChartBackups", () => {
    beforeEach(() => {
        vi.setSystemTime(new Date("2026-09-29T10:07:00.000"))
    })

    it("keeps only the newest MAX_BACKUPS_PER_KIND backups of each kind", async () => {
        const entries = Array.from({ length: MAX_BACKUPS_PER_KIND + 2 }, (_, i) =>
            entry(`2026-09-29_10-00-0${i}-000.chart`)
        )
        fsMock.readDir.mockResolvedValue(entries)

        await pruneChartBackups(chartPath)

        const removed = fsMock.remove.mock.calls.map((call) => call[0])
        expect(removed).toContain(`${chartDir()}/2026-09-29_10-00-00-000.chart`)
        expect(removed).toContain(`${chartDir()}/2026-09-29_10-00-01-000.chart`)
        expect(removed).toHaveLength(2)
    })

    it("drops chart snapshots older than the age cap", async () => {
        const oldName = "2026-08-01_10-00-00-000.chart"
        fsMock.readDir.mockResolvedValue([entry(oldName), entry("2026-09-29_10-00-00-000.chart")])

        const now = new Date("2026-09-29T10:07:00.000").getTime()
        expect(now - new Date("2026-08-01T10:00:00.000").getTime()).toBeGreaterThan(
            CHART_BACKUP_MAX_AGE_MS
        )

        await pruneChartBackups(chartPath)

        const removed = fsMock.remove.mock.calls.map((call) => call[0])
        expect(removed).toContain(`${chartDir()}/${oldName}`)
        expect(removed).not.toContain(`${chartDir()}/2026-09-29_10-00-00-000.chart`)
    })

    it("cleans up leftover temp files", async () => {
        fsMock.readDir.mockResolvedValue([
            entry("2026-09-29_10-00-00-000.chart"),
            entry("2026-09-29_10-00-00-000.lyrics.txt.tmp"),
        ])

        await pruneChartBackups(chartPath)

        const removed = fsMock.remove.mock.calls.map((call) => call[0])
        expect(removed).toContain(`${chartDir()}/2026-09-29_10-00-00-000.lyrics.txt.tmp`)
    })
})

afterEach(() => {
    vi.useRealTimers()
})
