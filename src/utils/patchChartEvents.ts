import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs"
import type { ChartEvent, ChartTrack } from "./herochartio"

export function serializeEventsBlock(events: ChartTrack<ChartEvent>): string {
    const lines = ["[Events]", "{"]
    for (const [tick, eventList] of Object.entries(events)) {
        for (const event of eventList) {
            lines.push(`  ${tick} = ${event.type} ${JSON.stringify(event.name)}`)
        }
    }
    lines.push("}")
    return lines.join("\n")
}

// Replaces only the [Events] section, leaving every other section byte for byte intact.
export function replaceEventsSection(content: string, eventsBlock: string): string {
    const eol = content.includes("\r\n") ? "\r\n" : "\n"
    const lines = content.split(/\r?\n/)
    const blockLines = eventsBlock.split("\n")

    const sectionIndex = lines.findIndex((line) => line.trim() === "[Events]")
    if (sectionIndex === -1) {
        return content + (content.endsWith("\n") ? "" : eol) + blockLines.join(eol) + eol
    }

    let endIndex = sectionIndex + 1
    while (endIndex < lines.length && lines[endIndex].trim() !== "{") endIndex++
    while (endIndex < lines.length && lines[endIndex].trim() !== "}") endIndex++

    if (endIndex >= lines.length) return content

    const newLines = [...lines.slice(0, sectionIndex), ...blockLines, ...lines.slice(endIndex + 1)]
    return newLines.join(eol)
}

export async function saveChartEventsOnly(events: ChartTrack<ChartEvent>, path: string) {
    const content = await readTextFile(path)
    const patched = replaceEventsSection(content, serializeEventsBlock(events))
    await writeTextFile(path, patched)
}
