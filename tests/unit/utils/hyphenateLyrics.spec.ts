import { describe, expect, it } from "vitest"

import { INTERNAL_EQUALS } from "@/utils/lyricsMarkup"
import { hyphenateLyrics, hyphenLanguages } from "@/utils/hyphenateLyrics"

describe("hyphenateLyrics", () => {
    it("hyphenates words into syllables", async () => {
        expect(await hyphenateLyrics("hello how are you doing", "en")).toBe(
            "hel-lo how are you do-ing"
        )
    })

    it("uses the requested language", async () => {
        expect(await hyphenateLyrics("corazón felizmente", "es")).toBe("co-ra-zón fe-liz-men-te")
    })

    it("converts existing hyphens into equals before hyphenating", async () => {
        expect(await hyphenateLyrics("he-llo world", "en")).toBe("he=llo world")
    })

    it("protects hyphens inside markup tags", async () => {
        expect(await hyphenateLyrics("<cspace=-1px>beautiful</cspace>", "en")).toBe(
            "<cspace=-1px>beau-ti-ful</cspace>"
        )
    })

    it("preserves the internal equals marker", async () => {
        expect(await hyphenateLyrics(`A${INTERNAL_EQUALS}B hello`, "en")).toBe(
            `A${INTERNAL_EQUALS}B hel-lo`
        )
    })

    it("returns the text unchanged for an unknown language", async () => {
        expect(await hyphenateLyrics("hello world", "xx")).toBe("hello world")
    })
})

describe("hyphenLanguages", () => {
    it("exposes a short code and a full label for every language", () => {
        expect(hyphenLanguages).toContainEqual({ value: "en", label: "English", short: "EN" })
        expect(hyphenLanguages).toContainEqual({ value: "es", label: "Spanish", short: "ES" })
    })
})
