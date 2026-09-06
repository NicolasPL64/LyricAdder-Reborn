import { describe, expect, it } from "vitest"

import { wrongPhrases } from "@/utils/wrongPhrases"

describe("wrong lyric phrases", () => {
    it("highlights only lines whose current count differs from the chart", () => {
        expect(wrongPhrases(["2/2", "1/3", "0/0"], ["one two", "wrong", ""])).toEqual([1])
    })
})
