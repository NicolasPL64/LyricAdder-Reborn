import { beforeEach, describe, expect, it } from "vitest"

import { updateLineNumbers, updateSyllableCount } from "@/utils/updateLyricsInfoRefs"

describe("lyrics editor calculations", () => {
    beforeEach(() => localStorage.clear())

    it("numbers every input line", () => {
        expect(updateLineNumbers(["first line", "second line", "third line"])).toBe("1\n2\n3\n")
    })

    it("counts syllables and ignores markup", () => {
        expect(
            updateSyllableCount({ chartLyrics: "", chartSyllablesCount: [3, 2], errors: [] }, [
                "<i>one two</i> three",
                "four-five",
                "",
            ])
        ).toBe("3/3\n2/2\n\n")
    })

    it("counts joined syllables (underscore) as a single syllable", () => {
        expect(
            updateSyllableCount({ chartLyrics: "", chartSyllablesCount: [1, 2], errors: [] }, [
                "one_two",
                "three_four five",
            ])
        ).toBe("1/1\n2/2\n")
    })
})
