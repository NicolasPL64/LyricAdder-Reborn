import { describe, expect, it } from "vitest"

import { ChartIO } from "@/utils/herochartio"

import specialCharactersChart from "../../files/test1.chart?raw"

describe("ChartIO", () => {
    it("preserves special characters and mixed lyric event types", () => {
        const chart = ChartIO.parse(specialCharactersChart)

        expect(chart.Events[240]).toEqual([{ type: "E", name: "lyric ñ" }])
        expect(chart.Events[288]).toEqual([{ type: "E", name: "Default" }])
        expect(chart.Events[480]).toEqual([{ type: "E", name: "lyric é" }])
    })
})
