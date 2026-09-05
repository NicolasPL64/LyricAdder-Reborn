import { beforeEach, describe, expect, it } from "vitest"

import { updateLineNumbers, updateSyllableCount } from "@/utils/updateLyricsInfoRefs"

describe("lyrics editor calculations", () => {
    beforeEach(() => localStorage.clear())

    it("numbers every input line", () => {
        expect(updateLineNumbers(["first line", "second line", "third line"])).toBe(
            "1\n2\n3\n"
        )
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
})