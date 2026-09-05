import { beforeEach, describe, expect, it, vi } from "vitest"

import { parseChart } from "@/utils/parseChart"
import { ChartIO } from "@/utils/herochartio"

import parsingChart from "../../files/chart-parsing.chart?raw"
import maxSectionSepChart from "../../files/max-section-separators.chart?raw"
import specialCharactersChart from "../../files/test1.chart?raw"

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
            parsed: { chartLyrics: "hel-lo\nworld", chartSyllablesCount: [2, 1] },
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
})