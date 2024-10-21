import type { ChartEvent } from "./herochartio"

export function isLyricEvent(event: ChartEvent): boolean {
  return (event.name.startsWith("lyric") || event.name.startsWith("Default")) && event.type === "E"
}

export function removeTrailingEmptyElements(arr: string[]): string[] {
  while (arr.length > 0 && arr[arr.length - 1].trim() === "") {
    arr.pop()
  }
  return arr
}
