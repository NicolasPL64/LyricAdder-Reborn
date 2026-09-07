import { beforeEach, describe, expect, it, vi } from "vitest"

import * as patchChartEvents from "@/utils/patchChartEvents"
import { ChartIO } from "@/utils/herochartio"
import { parseLyricsToChart } from "@/utils/saveChart"

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
            1 = E "lyric a"
            2 = E "lyric b"
            3 = E "phrase_end"
            4 = E "phrase_start"
            5 = E "lyric c"
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
            1 = E "lyric a"
            2 = E "lyric b"
            3 = E "phrase_end"
            4 = E "phrase_start"
            5 = E "lyric c"
            6 = E "lyric d"
            7 = E "lyric e"
            8 = E "phrase_end"
            9 = E "phrase_start"
            10 = E "lyric f"
            11 = E "lyric g"
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
})
