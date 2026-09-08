import { beforeEach, describe, expect, it, vi } from "vitest"

import { extractLyrics, parseChart } from "@/utils/parseChart"
import { chartErrorMessages } from "@/utils/chartErrorMessages"
import { ChartIO } from "@/utils/herochartio"

import specialCharactersChart from "../../files/test1.chart?raw"
import { buildChart } from "../helpers/chart"

describe("parseChart", () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it("extracts phrases and syllable counts from a loaded chart", async () => {
        const chart = buildChart(`
            0 = E "phrase_start"
            1 = E "lyric hel-"
            2 = E "lyric lo"
            3 = E "phrase_end"
            4 = E "phrase_start"
            5 = E "lyric world"
            6 = E "phrase_end"
        `)
        localStorage.setItem("maxSectionSeparators", "3")
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)

        await expect(parseChart("notes.chart")).resolves.toEqual({
            parsed: { chartLyrics: "hel-lo\nworld", chartSyllablesCount: [2, 1], errors: [] },
            original: chart,
        })
    })

    it("respects the maxSectionSeparators setting", async () => {
        const chart = buildChart(`
            0 = E "phrase_start"
            1 = E "lyric first"
            2 = E "phrase_end"
            3 = E "phrase_start"
            4 = E "lyric alpha"
            5 = E "section First"
            6 = E "section Second"
            7 = E "section Third"
            8 = E "phrase_end"
            9 = E "phrase_start"
            10 = E "lyric beta"
            11 = E "phrase_end"
        `)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)

        localStorage.setItem("maxSectionSeparators", "0")
        await expect(parseChart("notes.chart")).resolves.toMatchObject({
            parsed: { chartLyrics: "first\nalpha\nbeta" },
        })

        localStorage.setItem("maxSectionSeparators", "1")
        await expect(parseChart("notes.chart")).resolves.toMatchObject({
            parsed: { chartLyrics: "first\nalpha\n\nbeta" },
        })

        localStorage.setItem("maxSectionSeparators", "2")
        await expect(parseChart("notes.chart")).resolves.toMatchObject({
            parsed: { chartLyrics: "first\nalpha\n\n\nbeta" },
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
            buildChart(`
                0 = E "phrase_start"
                1 = E "phrase_start"
                2 = E "lyric A"
                3 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("A")
        expect(errors).toEqual([
            {
                message: chartErrorMessages.CONSECUTIVE_PHRASE_START,
                timestamps: [0, 1],
            },
        ])
    })

    it("flags a last phrase that is missing its closing phrase_end", () => {
        const { chartLyrics, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric A"
                2 = E "phrase_start"
                3 = E "lyric B"
            `).Events
        )

        expect(chartLyrics).toBe("A\nB")
        expect(errors).toEqual([
            {
                message: chartErrorMessages.MISSING_CLOSING_PHRASE_END,
                timestamps: [2],
            },
        ])
    })

    it("flags a phrase_end with no open phrase", () => {
        const { chartLyrics, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric A"
                2 = E "phrase_end"
                3 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("A")
        expect(errors).toEqual([
            { message: chartErrorMessages.PHRASE_END_WITHOUT_OPEN_PHRASE, timestamps: [3] },
        ])
    })

    it("flags a phrase_end with no lyric events since the last phrase_start", () => {
        const { chartLyrics, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("")
        expect(errors).toEqual([
            {
                message: chartErrorMessages.PHRASE_END_WITHOUT_LYRICS,
                timestamps: [1],
            },
        ])
    })

    it("flags a lyric event without a preceding phrase_start", () => {
        const { chartLyrics, errors } = extractLyrics(
            buildChart(`
                0 = E "lyric A"
                1 = E "phrase_start"
                2 = E "lyric B"
                3 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("A B")
        expect(errors).toEqual([
            {
                message: chartErrorMessages.LYRIC_WITHOUT_PHRASE_START,
                timestamps: [0],
            },
        ])
    })

    it("produces no errors for a well-formed chart", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric A"
                2 = E "phrase_end"
                3 = E "phrase_start"
                4 = E "lyric B"
                5 = E "phrase_start"
                6 = E "lyric C"
                7 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("A\nB\nC")
        expect(chartSyllablesCount).toEqual([1, 1, 1])
        expect(errors).toEqual([])
    })

    it("joins lyric events with spaces in the middle using the section symbol", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric foo bar"
                2 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("foo_bar")
        expect(chartSyllablesCount).toEqual([1])
        expect(errors).toEqual([])
    })

    it("ignores a section before the first phrase", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(
            buildChart(`
                0 = E "section Intro"
                1 = E "phrase_start"
                2 = E "lyric A"
                3 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("A")
        expect(chartSyllablesCount).toEqual([1])
        expect(errors).toEqual([])
    })

    it("places a mid-phrase section's blank line after the phrase", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric A"
                2 = E "section Outro"
                3 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("A")
        expect(chartSyllablesCount).toEqual([1])
        expect(errors).toEqual([])
    })

    it("concatenates lyric events ending with an equals sign", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric he="
                2 = E "lyric llo"
                3 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("he=llo")
        expect(chartSyllablesCount).toEqual([2])
        expect(errors).toEqual([])
    })

    it("resets the section separator budget after each phrase", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric A"
                2 = E "phrase_end"
                3 = E "section X"
                4 = E "phrase_start"
                5 = E "lyric B"
                6 = E "phrase_end"
                7 = E "section Y"
                8 = E "phrase_start"
                9 = E "lyric C"
                10 = E "phrase_end"
            `).Events,
            1
        )

        expect(chartLyrics).toBe("A\n\nB\n\nC")
        expect(chartSyllablesCount).toEqual([1, 1, 1])
        expect(errors).toEqual([])
    })

    it("places a section between two lyrics after the completed phrase", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric A"
                2 = E "section X"
                3 = E "lyric B"
                4 = E "phrase_end"
                5 = E "phrase_start"
                6 = E "lyric C"
                7 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("A B\n\nC")
        expect(chartSyllablesCount).toEqual([2, 1])
        expect(errors).toEqual([])
    })

    it("joins the lyrics of a phrase split by a section into a single line", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric A"
                2 = E "section X"
                3 = E "lyric B"
                4 = E "phrase_end"
            `).Events
        )

        expect(chartLyrics).toBe("A B")
        expect(chartSyllablesCount).toEqual([2])
        expect(errors).toEqual([])
    })

    it("returns an empty result for a chart without events", () => {
        const { chartLyrics, chartSyllablesCount, errors } = extractLyrics(buildChart("").Events)

        expect(chartLyrics).toBe("")
        expect(chartSyllablesCount).toEqual([])
        expect(errors).toEqual([])
    })

    it("propagates structural errors when loading a chart", async () => {
        const chart = buildChart(`
            0 = E "phrase_start"
            1 = E "lyric A"
        `)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)

        await expect(parseChart("broken.chart")).resolves.toEqual({
            parsed: {
                chartLyrics: "A",
                chartSyllablesCount: [1],
                errors: [
                    { message: chartErrorMessages.MISSING_CLOSING_PHRASE_END, timestamps: [0] },
                ],
            },
            original: chart,
        })
    })
})
