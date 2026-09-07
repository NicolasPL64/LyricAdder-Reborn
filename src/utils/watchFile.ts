import { watch, type WatchEvent, type WatchEventKind } from "@tauri-apps/plugin-fs"
import { parseChart, type ParsedChartWithOriginal } from "./parseChart"

let fileWatcher: (() => void) | undefined

export async function createFileWatcher(
    path: string,
    isRereadOnChange: boolean,
    updateChart: (chart: ParsedChartWithOriginal) => void
) {
    removeFileWatcher() // Always clean up any previous fileWatcher

    if (!isRereadOnChange) return

    const handleFileChange = async (event: WatchEvent) => {
        if (!isRelevantEvent(event)) return
        try {
            const chart = await parseChart(path)
            updateChart(chart) // Executes the provided callback function with the new chart
        } catch (error) {
            console.error("Failed to re-read the chart after a file change", error)
        }
    }

    fileWatcher = await watch(path, handleFileChange, {
        delayMs: 300,
    })
}

// Re-read the chart on any kind of file change (some editors save via rename/delete+create).
export function isRelevantEvent(event: WatchEvent): boolean {
    const kind: WatchEventKind = event.type
    if (typeof kind === "string") return kind === "any"
    return "any" in kind || "modify" in kind || "create" in kind || "remove" in kind
}

export function removeFileWatcher() {
    if (fileWatcher) {
        fileWatcher() // Removes the fileWatcher
        fileWatcher = undefined
    }
}
