import { beforeEach, describe, expect, it } from "vitest"

import { updateLineNumbers, updateSyllableCount } from "@/utils/updateLyricsInfoRefs"
import { INTERNAL_EQUALS } from "@/utils/lyricsMarkup"

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

    it("counts an internal equals sign as a single syllable and a joining one as two", () => {
        expect(
            updateSyllableCount({ chartLyrics: "", chartSyllablesCount: [3], errors: [] }, [
                `A${INTERNAL_EQUALS}B C=D`,
            ])
        ).toBe("3/3\n")
    })

    it("ignores equals signs inside tag attributes when counting", () => {
        expect(
            updateSyllableCount({ chartLyrics: "", chartSyllablesCount: [1], errors: [] }, [
                `<color=red>${INTERNAL_EQUALS}B`,
            ])
        ).toBe("1/1\n")
    })
})
