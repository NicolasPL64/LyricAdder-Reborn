import { beforeEach, describe, expect, it, vi } from "vitest"

import { extractLyrics, parseChart } from "@/utils/parseChart"
import { ChartIO } from "@/utils/herochartio"

import parsingChart from "../../files/chart-parsing.chart?raw"
import maxSectionSepChart from "../../files/max-section-separators.chart?raw"
import specialCharactersChart from "../../files/test1.chart?raw"

function buildEvents(events: string) {
    const chartText = `[Song]\n{\n}\n[Events]\n{\n${events}\n}\n`
    return ChartIO.parse(chartText).Events
}

describe("parseChart", () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it("extracts phrases and syllable counts from a loaded chart", async () => {
        const chart = ChartIO.parse(parsingChart)
        localStorage.setItem("maxSectionSeparators", "3")
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)

        await expect(parseChart("notes.chart")).resolves.toEqual({
            parsed: { chartLyrics: "hel-lo\nworld", chartSyllablesCount: [2, 1], errors: [] },
            original: chart,
        })
    })

    it("respects the maxSectionSeparators setting", async () => {
        const chart = ChartIO.parse(maxSectionSepChart)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)

        localStorage.setItem("maxSectionSeparators", "0")
        await expect(parseChart("notes.chart")).resolves.toMatchObject({
            parsed: { chartLyrics: "first\nalpha\nbeta" },
        })

        localStorage.setItem("maxSectionSeparators", "1")
        await expect(parseChart("notes.chart")).resolves.toMatchObject({
            parsed: { chartLyrics: "first\n\nalpha\nbeta" },
        })

        localStorage.setItem("maxSectionSeparators", "2")
        await expect(parseChart("notes.chart")).resolves.toMatchObject({
            parsed: { chartLyrics: "first\n\n\nalpha\nbeta" },
        })
    })

    it("extracts mixed lyric and default events with UTF-8 characters", async () => {
        const chart = ChartIO.parse(specialCharactersChart)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)

        await expect(parseChart("special-characters.chart")).resolves.toMatchObject({
            parsed: {
                chartLyrics: "ñ  a\né",
                chartSyllablesCount: [3, 2],
            },
        })
    })

    it("flags two consecutive phrase_start events without lyric events between them", () => {
        const { chartLyrics, errors } = extractLyrics(
            buildEvents(`
                0 = E "phrase_start"
                1 = E "phrase_start"
                2 = E "lyric A"
                3 = E "phrase_end"
            `)
        )

        expect(chartLyrics).toBe("A")
        expect(errors).toEqual([
            {
                message: "Two phrase_start events with no lyric events between them.",
                timestamps: [0, 1],
            },
        ])
    })

    it("flags a last phrase that is missing its closing phrase_end", () => {
        const { chartLyrics, errors } = extractLyrics(
            buildEvents(`
                0 = E "phrase_start"
                1 = E "lyric A"
            `)
        )

        expect(chartLyrics).toBe("A")
        expect(errors).toEqual([
            {
                message: "The last phrase is missing its closing phrase_end.",
                timestamps: [0],
            },
        ])
    })

    it("flags a phrase_end with no open phrase", () => {
        const { chartLyrics, errors } = extractLyrics(
            buildEvents(`
                0 = E "phrase_start"
                1 = E "lyric A"
                2 = E "phrase_end"
                3 = E "phrase_end"
            `)
        )

        expect(chartLyrics).toBe("A")
        expect(errors).toEqual([{ message: "phrase_end with no open phrase.", timestamps: [3] }])
    })

    it("flags a phrase_end with no lyric events since the last phrase_start", () => {
        const { chartLyrics, errors } = extractLyrics(
            buildEvents(`
                0 = E "phrase_start"
                1 = E "phrase_end"
            `)
        )

        expect(chartLyrics).toBe("")
        expect(errors).toEqual([
            {
                message: "phrase_end with no lyric events since the last phrase_start.",
                timestamps: [1],
            },
        ])
    })

    it("flags a lyric event without a preceding phrase_start", () => {
        const { chartLyrics, errors } = extractLyrics(
            buildEvents(`
                0 = E "lyric A"
                1 = E "phrase_start"
                2 = E "lyric B"
                3 = E "phrase_end"
            `)
        )

        expect(chartLyrics).toBe("A B")
        expect(errors).toEqual([
            {
                message: "Lyric event without a preceding phrase_start.",
                timestamps: [0],
            },
        ])
    })

    it("produces no errors for a well-formed chart", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(
            buildEvents(`
                0 = E "phrase_start"
                1 = E "lyric A"
                2 = E "phrase_end"
                3 = E "phrase_start"
                4 = E "lyric B"
                5 = E "phrase_end"
            `)
        )

        expect(chartLyrics).toBe("A\nB")
        expect(chartSyllablesCount).toEqual([1, 1])
        expect(errors).toEqual([])
    })
})
