import { createFileWatcher, removeFileWatcher } from "@/utils/watchFile"
import type { ParsedChartWithOriginal } from "@/utils/parseChart"

export function useChartWatcher(
    getPath: () => string,
    getRereadOnChange: () => boolean,
    onUpdate: (chart: ParsedChartWithOriginal) => void
) {
    async function setupFileWatcher() {
        try {
            await createFileWatcher(getPath(), getRereadOnChange(), onUpdate)
        } catch (error) {
            console.error("Failed to set up the chart file watcher", error)
        }
    }

    function teardownFileWatcher() {
        removeFileWatcher()
    }

    return { setupFileWatcher, teardownFileWatcher }
}
