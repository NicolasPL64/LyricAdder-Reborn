import { watch, type WatchEvent } from "@tauri-apps/plugin-fs"
import { parseChart, type ParsedChartWithOriginal } from "./parseChart"

let fileWatcher: (() => void) | undefined

export async function createFileWatcher(
  path: string,
  isRereadOnChange: boolean,
  updateChart: (chart: ParsedChartWithOriginal) => void
) {
  if (isRereadOnChange) {
    const handleFileChange = async (event: WatchEvent) => {
      if (typeof event.type === "object" && "modify" in event.type) {
        console.log("File modified")
        const chart = await parseChart(path)
        updateChart(chart) // Executes the provided callback function with the new chart
      }
    }

    removeFileWatcher() // To remove any previous fileWatcher
    fileWatcher = await watch(path, handleFileChange, {
      delayMs: 300,
    })
  }
}

export function removeFileWatcher() {
  console.log(fileWatcher)
  if (fileWatcher) fileWatcher() // Removes the fileWatcher
}
