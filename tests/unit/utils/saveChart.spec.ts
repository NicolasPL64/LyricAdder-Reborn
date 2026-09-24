import { beforeEach, describe, expect, it, vi } from "vitest"

import * as patchChartEvents from "@/utils/patchChartEvents"
import { ChartIO } from "@/utils/herochartio"
import { parseLyricsToChart } from "@/utils/saveChart"
import { INTERNAL_EQUALS } from "@/utils/lyricsMarkup"

import { buildChart, lyricNames } from "../helpers/chart"

vi.mock("@/utils/patchChartEvents", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/patchChartEvents")>()
    return {
        ...actual,
        saveChartEventsOnly: vi.fn(),
    }
})

describe("parseLyricsToChart", () => {
    beforeEach(() => {
        localStorage.clear()
    })

    it("rewrites lyric events to match the edited lines", async () => {
        const chart = buildChart(`
            0 = E "phrase_start"
            1 = E "lyric"
            2 = E "lyric"
            3 = E "phrase_end"
            4 = E "phrase_start"
            5 = E "lyric"
            6 = E "phrase_end"
        `)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)
        vi.mocked(patchChartEvents.saveChartEventsOnly).mockResolvedValue(undefined)

        await parseLyricsToChart(["one two", "three"], "song.chart")

        const events = vi.mocked(patchChartEvents.saveChartEventsOnly).mock.calls[0][0]
        expect(lyricNames(events)).toEqual(["lyric one", "lyric two", "lyric three"])
        expect(patchChartEvents.saveChartEventsOnly).toHaveBeenCalledWith(
            expect.anything(),
            "song.chart"
        )
    })

    it("splits syllables on spaces, hyphens and equals signs", async () => {
        const chart = buildChart(`
            0 = E "phrase_start"
            1 = E "lyric"
            2 = E "lyric"
            3 = E "phrase_end"
            4 = E "phrase_start"
            5 = E "lyric"
            6 = E "lyric"
            7 = E "lyric"
            8 = E "phrase_end"
            9 = E "phrase_start"
            10 = E "lyric"
            11 = E "lyric"
            12 = E "phrase_end"
        `)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)
        vi.mocked(patchChartEvents.saveChartEventsOnly).mockResolvedValue(undefined)

        await parseLyricsToChart(["foo   bar", "foo-bar=bat", "a=b"], "song.chart")

        const events = vi.mocked(patchChartEvents.saveChartEventsOnly).mock.calls[0][0]
        expect(lyricNames(events)).toEqual([
            "lyric foo",
            "lyric bar",
            "lyric foo-",
            "lyric bar=",
            "lyric bat",
            "lyric a=",
            "lyric b",
        ])
    })

    it("keeps joined syllables (underscore) and markup within a single lyric event", async () => {
        const chart = buildChart(`
            0 = E "phrase_start"
            1 = E "lyric"
            2 = E "lyric"
            3 = E "lyric"
            4 = E "lyric"
            5 = E "phrase_end"
        `)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)
        vi.mocked(patchChartEvents.saveChartEventsOnly).mockResolvedValue(undefined)

        await parseLyricsToChart(["In_the be-gin-ning"], "song.chart")

        const events = vi.mocked(patchChartEvents.saveChartEventsOnly).mock.calls[0][0]
        expect(lyricNames(events)).toEqual([
            "lyric In_the",
            "lyric be-",
            "lyric gin-",
            "lyric ning",
        ])
    })

    it("restores internal equals markers back to a single lyric event", async () => {
        const chart = buildChart(`
            0 = E "phrase_start"
            1 = E "lyric"
            2 = E "lyric"
            3 = E "lyric"
            4 = E "phrase_end"
        `)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)
        vi.mocked(patchChartEvents.saveChartEventsOnly).mockResolvedValue(undefined)

        await parseLyricsToChart([`A${INTERNAL_EQUALS}B C=D`], "song.chart")

        const events = vi.mocked(patchChartEvents.saveChartEventsOnly).mock.calls[0][0]
        expect(lyricNames(events)).toEqual(["lyric A=B", "lyric C=", "lyric D"])
    })

    it("does not split on equals signs inside tag attributes", async () => {
        const chart = buildChart(`
            0 = E "phrase_start"
            1 = E "lyric"
            2 = E "phrase_end"
        `)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)
        vi.mocked(patchChartEvents.saveChartEventsOnly).mockResolvedValue(undefined)

        await parseLyricsToChart([`<color=red>A${INTERNAL_EQUALS}B`], "song.chart")

        const events = vi.mocked(patchChartEvents.saveChartEventsOnly).mock.calls[0][0]
        expect(lyricNames(events)).toEqual(["lyric <color=red>A=B"])
    })

    it("assigns lyrics correctly when they share a tick with phrase_start", async () => {
        const chart = buildChart(`
            192 = E "phrase_start"
            240 = E "lyric ñ"
            384 = E "lyric test"
            384 = E "phrase_start"
            384 = E "section Default"
            528 = E "phrase_end"
        `)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)
        vi.mocked(patchChartEvents.saveChartEventsOnly).mockResolvedValue(undefined)

        await parseLyricsToChart(["ñ", "test"], "song.chart")

        const events = vi.mocked(patchChartEvents.saveChartEventsOnly).mock.calls[0][0]
        expect(lyricNames(events)).toEqual(["lyric ñ", "lyric test"])
        expect(patchChartEvents.saveChartEventsOnly).toHaveBeenCalledWith(
            expect.anything(),
            "song.chart"
        )
    })
})
