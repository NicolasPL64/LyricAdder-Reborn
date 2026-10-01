import { onMounted, onUnmounted, type Ref } from "vue"

import { ask } from "@tauri-apps/plugin-dialog"
import { backupLyrics, clearLyricsBackups, getLatestBackups, readBackup } from "@/utils/backup"

// Automatic backups (crash / power-loss safety): the plain lyrics text is saved
// on a fixed interval while editing. Backups live under the app-local data dir,
// keyed by a hash of the chart path. Nothing is written when the text has not
// changed. (The on-disk chart snapshot before each save lives in the view, in
// saveFile.)
const BACKUP_INTERVAL_MS = 15000

export function useAutoBackup(
    getPath: () => string,
    lyricsText: Ref<string>,
    syncEditorFromLyrics: () => void
) {
    let lastBackedUpText = "" // The text the newest lyrics backup already reflects
    let backupInterval: number | null = null
    let isFlushing = false

    // Forces a lyrics backup now. Does nothing if the text is already backed up
    // (the last created copy is enough; closing/leaving never forces a new one).
    async function flushLyricsBackup() {
        if (isFlushing) return
        const path = getPath()
        if (!path || lyricsText.value === lastBackedUpText) return
        isFlushing = true
        try {
            await backupLyrics(path, lyricsText.value)
            lastBackedUpText = lyricsText.value
        } catch (error) {
            console.error("Failed to back up the lyrics text", error)
        } finally {
            isFlushing = false
        }
    }

    async function promptForBackupRecovery() {
        const path = getPath()
        if (!path) return
        const latest = await getLatestBackups(path)
        if (!latest.lyrics) return

        const restore = await ask(
            "This song has unsaved lyrics from a previous session.\nRestore them?",
            {
                title: "Unsaved lyrics found",
                kind: "warning",
                okLabel: "Restore",
                cancelLabel: "Discard",
            }
        )
        if (!restore) {
            await clearLyricsBackups(path)
            return
        }
        try {
            lyricsText.value = await readBackup(latest.lyrics)
            syncEditorFromLyrics()
            lastBackedUpText = lyricsText.value
        } catch (error) {
            console.error("Failed to restore the lyrics backup", error)
        }
    }

    // Marks the current lyrics text as already backed up (right after a load or
    // save, so nothing is written for unchanged text).
    function markBackedUp() {
        lastBackedUpText = lyricsText.value
    }

    onMounted(() => {
        backupInterval = window.setInterval(() => void flushLyricsBackup(), BACKUP_INTERVAL_MS)
    })

    onUnmounted(() => {
        if (backupInterval !== null) {
            clearInterval(backupInterval)
            backupInterval = null
        }
        void flushLyricsBackup()
    })

    return { flushLyricsBackup, promptForBackupRecovery, markBackedUp }
}
