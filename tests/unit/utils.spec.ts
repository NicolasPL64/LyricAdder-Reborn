import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

import { isLyricEvent, removeTrailingEmptyElements } from "@/utils/auxFunctions"
import { parseChart } from "@/utils/parseChart"
import { ChartIO } from "@/utils/herochartio"
import { updateLineNumbers, updateSyllableCount } from "@/utils/updateLyricsInfoRefs"
import { wrongPhrases } from "@/utils/wrongPhrases"

describe("auxiliary lyric helpers", () => {
    it("recognizes lyric events but ignores non-event entries", () => {
        expect(isLyricEvent({ type: "E", name: "lyric hello" })).toBe(true)
        expect(isLyricEvent({ type: "E", name: "Default hello" })).toBe(true)
        expect(isLyricEvent({ type: "E", name: "section hello" })).toBe(false)
        expect(isLyricEvent({ type: "E", name: "phrase_start" })).toBe(false)
    })

    it("removes only trailing empty lines", () => {
        expect(removeTrailingEmptyElements(["one", "", "two", "  ", ""])).toEqual([
            "one",
            "",
            "two",
        ])
    })
})

describe("lyrics editor calculations", () => {
    beforeEach(() => localStorage.clear())

    it("numbers every input line", () => {
        expect(updateLineNumbers(["first line", "second line", "third line"])).toBe("1\n2\n3\n")
    })

    it("counts syllables and ignores markup", () => {
        expect(
            updateSyllableCount({ chartLyrics: "", chartSyllablesCount: [3, 2] }, [
                "<i>one two</i> three",
                "four-five",
                "",
            ])
        ).toBe("3/3\n2/2\n\n")
    })

    it("highlights only lines whose current count differs from the chart", () => {
        expect(wrongPhrases(["2/2", "1/3", "0/0"], ["one two", "wrong", ""])).toEqual([1])
    })
})

describe("chart parsing", () => {
    it("parses and stringifies an existing chart fixture without losing events", () => {
        const fixture = readFileSync(
            resolve("tests/files/indistinct-promise_of_fire.chart"),
            "utf8"
        )
        const chart = ChartIO.parse(fixture)
        const output = ChartIO.stringify(chart)
        const reparsed = ChartIO.parse(output) // reparse to ensure that the output is valid and can be parsed back into a chart object

        expect(reparsed.Song.Name).toBe(chart.Song.Name)
        expect(reparsed.Events[1536]).toEqual(chart.Events[1536])
    })

    it("extracts phrases and syllable counts from a loaded chart", async () => {
        const fixture = readFileSync(resolve("tests/files/chart-parsing.chart"), "utf8")

        const chart = ChartIO.parse(fixture)
        localStorage.setItem("maxSectionSeparators", "3")
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)

        await expect(parseChart("fixture.chart")).resolves.toEqual({
            parsed: { chartLyrics: "hel-lo\nworld", chartSyllablesCount: [2, 1] },
            original: chart,
        })
    })

    it("respects the maxSectionSeparators setting", async () => {
        const fixture = readFileSync(resolve("tests/files/max-section-separators.chart"), "utf8")
        const chart = ChartIO.parse(fixture)
        vi.spyOn(ChartIO, "load").mockResolvedValue(chart)

        localStorage.setItem("maxSectionSeparators", "0")
        await expect(parseChart("fixture.chart")).resolves.toMatchObject({
            parsed: { chartLyrics: "first\nalpha\nbeta" },
        })

        localStorage.setItem("maxSectionSeparators", "1")
        await expect(parseChart("fixture.chart")).resolves.toMatchObject({
            parsed: { chartLyrics: "first\n\nalpha\nbeta" },
        })

        localStorage.setItem("maxSectionSeparators", "2")
        await expect(parseChart("fixture.chart")).resolves.toMatchObject({
            parsed: { chartLyrics: "first\n\n\nalpha\nbeta" },
        })
    })
})
