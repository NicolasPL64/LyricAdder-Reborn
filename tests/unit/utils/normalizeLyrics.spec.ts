import { describe, expect, it } from "vitest"

import {
    capitalizeLines,
    needsNormalization,
    normalizeApostrophes,
    normalizeEllipsis,
    normalizeLyrics,
    normalizeNfc,
    normalizeUnicodeSpaces,
    removeInvisibleCharacters,
    removeTrailingPunctuation,
    type NormalizeOptions,
} from "@/utils/normalizeLyrics"
import { INTERNAL_EQUALS } from "@/utils/lyricsMarkup"

const allOff: NormalizeOptions = {
    capitalize: false,
    trailingPunctuation: false,
    trailingPunctuationChars: ",.;",
    apostrophes: false,
    apostropheTarget: "'",
    unicodeSpaces: false,
    ellipsis: false,
    ellipsisDirection: "unicodeToAscii",
    invisible: false,
    nfc: false,
}

const allOn: NormalizeOptions = {
    ...allOff,
    capitalize: true,
    trailingPunctuation: true,
    apostrophes: true,
    unicodeSpaces: true,
    ellipsis: true,
    invisible: true,
    nfc: true,
}

describe("capitalizeLines", () => {
    it("capitalizes the first letter of each line", () => {
        expect(capitalizeLines("hello world")).toBe("Hello world")
        expect(capitalizeLines("one\ntwo")).toBe("One\nTwo")
    })

    it("skips leading symbols to reach the first letter", () => {
        expect(capitalizeLines("(hola")).toBe("(Hola")
        expect(capitalizeLines('"mundo"')).toBe('"Mundo"')
        expect(capitalizeLines("_foo")).toBe("_Foo")
    })

    it("does nothing when the first alphanumeric character is a number", () => {
        expect(capitalizeLines("2025 algo")).toBe("2025 algo")
        expect(capitalizeLines("3,14")).toBe("3,14")
    })

    it("supports accented letters and other alphabets", () => {
        expect(capitalizeLines("él come")).toBe("Él come")
        expect(capitalizeLines("ñandú")).toBe("Ñandú")
    })

    it("ignores markup tags", () => {
        expect(capitalizeLines("<i>hello")).toBe("<i>Hello")
        expect(capitalizeLines("<color=#fff>hola")).toBe("<color=#fff>Hola")
    })

    it("handles empty lines and empty text", () => {
        expect(capitalizeLines("one\n\ntwo")).toBe("One\n\nTwo")
        expect(capitalizeLines("")).toBe("")
    })
})

describe("removeTrailingPunctuation", () => {
    const chars = ",.;"

    it("removes a single trailing punctuation character", () => {
        expect(removeTrailingPunctuation("hello.", chars)).toBe("hello")
        expect(removeTrailingPunctuation("hello,", chars)).toBe("hello")
        expect(removeTrailingPunctuation("hello;", chars)).toBe("hello")
    })

    it("keeps only a run of exactly three trailing dots", () => {
        expect(removeTrailingPunctuation("hello.", chars)).toBe("hello")
        expect(removeTrailingPunctuation("hello..", chars)).toBe("hello")
        expect(removeTrailingPunctuation("hello...", chars)).toBe("hello...")
        expect(removeTrailingPunctuation("hello....", chars)).toBe("hello...")
        expect(removeTrailingPunctuation("hello.....", chars)).toBe("hello...")
    })

    it("removes several trailing punctuation characters in a row", () => {
        expect(removeTrailingPunctuation("hello.,;", chars)).toBe("hello")
        expect(removeTrailingPunctuation("hello..,", chars)).toBe("hello")
    })

    it("does not remove characters outside the configured set", () => {
        expect(removeTrailingPunctuation("hello!", chars)).toBe("hello!")
        expect(removeTrailingPunctuation("hello!?", ",.;!?")).toBe("hello")
    })

    it("ignores markup tags while stripping punctuation", () => {
        expect(removeTrailingPunctuation("<b>hello,</b>", chars)).toBe("<b>hello</b>")
        expect(removeTrailingPunctuation("<i>hi</i>,", chars)).toBe("<i>hi</i>")
        expect(removeTrailingPunctuation("<i>hi</i>...", chars)).toBe("<i>hi</i>...")
    })

    it("never removes structural chart characters", () => {
        expect(removeTrailingPunctuation("hello-", ",.;-")).toBe("hello-")
        expect(removeTrailingPunctuation("b=", ",.;=")).toBe("b=")
        expect(removeTrailingPunctuation(`a${INTERNAL_EQUALS}`, chars)).toBe(`a${INTERNAL_EQUALS}`)
    })
})

describe("normalizeApostrophes", () => {
    it("unifies every variant into the straight apostrophe by default", () => {
        expect(normalizeApostrophes("don’t stop", "'")).toBe("don't stop")
        expect(normalizeApostrophes("cantʼ", "'")).toBe("cant'")
        expect(normalizeApostrophes("’'ʼ´′׳", "'")).toBe("''''''")
    })

    it("supports a typographic target", () => {
        expect(normalizeApostrophes("don't", "’")).toBe("don’t")
    })

    it("protects apostrophes inside markup tags", () => {
        expect(normalizeApostrophes("<color='#fff'>don’t</color>", "'")).toBe(
            "<color='#fff'>don't</color>"
        )
    })
})

describe("normalizeUnicodeSpaces", () => {
    it("replaces exotic spaces with a regular space", () => {
        expect(normalizeUnicodeSpaces("a\u00A0b")).toBe("a b")
        expect(normalizeUnicodeSpaces("a\u2009b\u3000c")).toBe("a b c")
    })

    it("never touches line breaks", () => {
        expect(normalizeUnicodeSpaces("a\nb")).toBe("a\nb")
    })
})

describe("normalizeEllipsis", () => {
    it("converts the ellipsis character into three dots", () => {
        expect(normalizeEllipsis("wait…", "unicodeToAscii")).toBe("wait...")
        expect(normalizeEllipsis("…a…", "unicodeToAscii")).toBe("...a...")
    })

    it("converts three dots into the ellipsis character", () => {
        expect(normalizeEllipsis("wait...", "asciiToUnicode")).toBe("wait…")
    })

    it("protects dots inside markup tags", () => {
        expect(normalizeEllipsis("<color=#fff>a...b</color>", "asciiToUnicode")).toBe(
            "<color=#fff>a…b</color>"
        )
    })

    it("is idempotent", () => {
        const once = normalizeEllipsis("wait...", "asciiToUnicode")
        expect(normalizeEllipsis(once, "asciiToUnicode")).toBe(once)
    })
})

describe("removeInvisibleCharacters", () => {
    it("removes zero-width and BOM characters", () => {
        expect(removeInvisibleCharacters("a\u200Bb")).toBe("ab")
        expect(removeInvisibleCharacters("\uFEFFhello")).toBe("hello")
        expect(removeInvisibleCharacters("a\u200D\u200Cb")).toBe("ab")
    })
})

describe("normalizeNfc", () => {
    it("composes decomposed accented characters", () => {
        expect(normalizeNfc("e\u0301")).toBe("é")
        expect(normalizeNfc("\u00E9")).toBe("é")
    })

    it("leaves markup and structural characters untouched", () => {
        expect(normalizeNfc("<b>e\u0301</b>")).toBe("<b>é</b>")
    })
})

describe("normalizeLyrics", () => {
    it("returns the input unchanged when no rule is enabled", () => {
        expect(normalizeLyrics("heLLo,", allOff)).toBe("heLLo,")
    })

    it("applies enabled rules in a stable order", () => {
        const options: NormalizeOptions = {
            ...allOff,
            capitalize: true,
            trailingPunctuation: true,
        }
        expect(normalizeLyrics("hello,\nworld...", options)).toBe("Hello\nWorld...")
    })

    it("composes every rule", () => {
        const result = normalizeLyrics("<i>don’t…</i>,\u00A0\u200Be\u0301", allOn)
        expect(result).toBe("<i>Don't...</i>, é")
    })
})

describe("needsNormalization", () => {
    it("detects text that would change", () => {
        expect(needsNormalization("hello", allOn)).toBe(true)
    })

    it("returns false for already-normalized text", () => {
        expect(needsNormalization("Hello", allOn)).toBe(false)
        expect(needsNormalization("", allOn)).toBe(false)
    })
})
