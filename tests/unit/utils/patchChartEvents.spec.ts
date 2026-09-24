import { beforeEach, describe, expect, it, vi } from "vitest"

import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs"

import type { ChartEvent, ChartTrack } from "@/utils/herochartio"
import {
    replaceEventsSection,
    saveChartEventsOnly,
    serializeEventsBlock,
} from "@/utils/patchChartEvents"

vi.mock("@tauri-apps/plugin-fs", () => ({
    readTextFile: vi.fn(),
    writeTextFile: vi.fn(),
}))

describe("serializeEventsBlock", () => {
    it("serializes events with the canonical chart format", () => {
        const events: ChartTrack<ChartEvent> = {
            192: [{ type: "E", name: "phrase_start" }],
            240: [{ type: "E", name: "lyric a" }],
        }

        expect(serializeEventsBlock(events)).toBe(
            `[Events]\n{\n  192 = E "phrase_start"\n  240 = E "lyric a"\n}`
        )
    })
})

describe("replaceEventsSection", () => {
    it("replaces only the Events section, preserving the rest", () => {
        const content =
            `[Song]\n{\n  Offset = 0\n}\n[SyncTrack]\n{\n  0 = TS 4\n}\n[Events]\n{\n` +
            `  192 = E "phrase_start"\n}\n[ExpertSingle]\n{\n  384 = N 0 0\n}\n`
        const block = `[Events]\n{\n  192 = E "phrase_start"\n  240 = E "lyric a"\n}`
        const expected =
            `[Song]\n{\n  Offset = 0\n}\n[SyncTrack]\n{\n  0 = TS 4\n}\n` +
            `${block}\n[ExpertSingle]\n{\n  384 = N 0 0\n}\n`

        expect(replaceEventsSection(content, block)).toBe(expected)
    })

    it("appends an Events section when the file has none", () => {
        const content = `[Song]\n{\n  Offset = 0\n}`
        const block = `[Events]\n{\n  192 = E "phrase_start"\n}`

        expect(replaceEventsSection(content, block)).toBe(`${content}\n${block}\n`)
    })

    it("preserves CRLF line endings", () => {
        const content =
            `[SyncTrack]\r\n{\r\n  0 = TS 4\r\n}\r\n[Events]\r\n{\r\n` +
            `  192 = E "phrase_start"\r\n}\r\n`
        const block = `[Events]\n{\n  240 = E "lyric a"\n}`
        const expected =
            `[SyncTrack]\r\n{\r\n  0 = TS 4\r\n}\r\n` +
            `[Events]\r\n{\r\n  240 = E "lyric a"\r\n}\r\n`

        expect(replaceEventsSection(content, block)).toBe(expected)
    })

    it("leaves content untouched when the Events block is malformed", () => {
        const content = `[Events]`
        const block = `[Events]\n{\n  240 = E "lyric a"\n}`

        expect(replaceEventsSection(content, block)).toBe(content)
    })
})

describe("saveChartEventsOnly", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("reads the file, replaces the Events section and writes it back", async () => {
        const content =
            `[Song]\n{\n  Offset = 0\n}\n[Events]\n{\n` +
            `  192 = E "phrase_start"\n}\n[ExpertSingle]\n{\n  384 = N 0 0\n}\n`
        const events: ChartTrack<ChartEvent> = {
            192: [{ type: "E", name: "phrase_start" }],
            240: [{ type: "E", name: "lyric a" }],
        }
        vi.mocked(readTextFile).mockResolvedValue(content)

        await saveChartEventsOnly(events, "song.chart")

        expect(readTextFile).toHaveBeenCalledWith("song.chart")
        expect(writeTextFile).toHaveBeenCalledWith(
            "song.chart",
            `[Song]\n{\n  Offset = 0\n}\n[Events]\n{\n  192 = E "phrase_start"\n` +
                `  240 = E "lyric a"\n}\n[ExpertSingle]\n{\n  384 = N 0 0\n}\n`
        )
    })
})
