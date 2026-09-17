import { describe, expect, it } from "vitest"

import { wrongPhrases } from "@/utils/wrongPhrases"

describe("wrong lyric phrases", () => {
    it("highlights only lines whose current count differs from the chart", () => {
        expect(wrongPhrases(["2/2", "1/3", "0/0"], ["one two", "wrong", ""])).toEqual([1])
    })

    it("ignores trailing empty lines", () => {
        expect(wrongPhrases(["2/2", "1/3"], ["one two", "wrong", "", "  "])).toEqual([1])
    })

    it("flags a mismatch in the middle of the lyrics", () => {
        expect(wrongPhrases(["1/1", "2/3", "1/1"], ["one", "two three", "x"])).toEqual([1])
    })

    it("ignores lines the chart does not account for", () => {
        expect(wrongPhrases(["1/1"], ["one", "extra"])).toEqual([])
    })

    it("keeps comparing a missing last line against the chart count", () => {
        expect(wrongPhrases(["1/1", "1/2"], ["one"])).toEqual([1])
    })
})
