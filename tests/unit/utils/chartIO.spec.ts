import { describe, expect, it } from "vitest"

import { ChartIO } from "@/utils/herochartio"

import promiseOfFireChart from "../../files/indistinct-promise-of-fire.chart?raw"
import specialCharactersChart from "../../files/test1.chart?raw"

describe("ChartIO", () => {
    it("parses and stringifies an existing chart without losing events", () => {
        const chart = ChartIO.parse(promiseOfFireChart)
        const output = ChartIO.stringify(chart)
        const reparsed = ChartIO.parse(output)

        expect(reparsed.Song.Name).toBe(chart.Song.Name)
        expect(reparsed.Events[1536]).toEqual(chart.Events[1536])
    })

    it("preserves special characters and mixed lyric event types", () => {
        const chart = ChartIO.parse(specialCharactersChart)

        expect(chart.Events[240]).toEqual([{ type: "E", name: "lyric ñ" }])
        expect(chart.Events[288]).toEqual([{ type: "E", name: "Default" }])
        expect(chart.Events[480]).toEqual([{ type: "E", name: "lyric é" }])
    })

    it("keeps special characters and default events after a chart round-trip", () => {
        const chart = ChartIO.parse(specialCharactersChart)
        const reparsed = ChartIO.parse(ChartIO.stringify(chart))

        expect(reparsed.Events[240][0].name).toBe("lyric ñ")
        expect(reparsed.Events[288][0].name).toBe("Default")
        expect(reparsed.Events[480][0].name).toBe("lyric é")
    })
})
