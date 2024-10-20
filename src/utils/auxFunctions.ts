import type { ChartEvent } from "./herochartio"

export function isLyricEvent(event: ChartEvent): boolean {
  return (event.name.startsWith("lyric") || event.name.startsWith("Default")) && event.type === "E"
}
