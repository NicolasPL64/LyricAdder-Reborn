import { ChartIO, type Chart, type ChartEvent, type ChartTrack } from "@/utils/herochartio"

export function buildChart(events: string): Chart {
    return ChartIO.parse(`[Song]\n{\n}\n[Events]\n{\n${events}\n}\n`)
}

export function lyricNames(events: ChartTrack<ChartEvent>): string[] {
    return Object.values(events)
        .flat()
        .filter((event) => event.name.startsWith("lyric"))
        .map((event) => event.name)
}
