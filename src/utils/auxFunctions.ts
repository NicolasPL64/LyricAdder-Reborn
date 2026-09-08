import type { ChartEvent } from "./herochartio"

export function isLyricEvent(event: ChartEvent): boolean {
    return (
        (event.name.startsWith("lyric") || event.name.startsWith("Default")) && event.type === "E"
    )
}

// Order in which events sharing a tick are processed, from highest to lowest priority.
// Any event not listed (e.g. lyric/Default) is processed last.
export const EVENT_PRIORITY_ORDER: string[] = [
    "section",
    "phrase_start",
    "lyric",
    "Default",
    "phrase_end",
]

function eventPriority(event: ChartEvent): number {
    for (let i = 0; i < EVENT_PRIORITY_ORDER.length; i++) {
        if (event.name.startsWith(EVENT_PRIORITY_ORDER[i])) return i
    }
    return EVENT_PRIORITY_ORDER.length
}

export function compareEventPriority(a: ChartEvent, b: ChartEvent): number {
    return eventPriority(a) - eventPriority(b)
}

export function removeTrailingEmptyElements(arr: string[]): string[] {
    while (arr.length > 0 && arr[arr.length - 1].trim() === "") {
        arr.pop()
    }
    return arr
}
