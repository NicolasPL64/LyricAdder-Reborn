import { describe, expect, it } from "vitest"

import {
    detectColorInRange,
    lineTextLength,
    markupOffsetToText,
    recolorLine,
    textToMarkupOffset,
    tokenizeLine,
} from "@/utils/recolorMarkup"

// Wraps tokenize + recolor for readability.
function recolor(line: string, s: number, e: number, hex: string): string {
    return recolorLine(tokenizeLine(line), s, e, hex)
}

function detect(line: string, s: number, e: number): string | null {
    return detectColorInRange(tokenizeLine(line), s, e)
}

describe("tokenizeLine", () => {
    it("separates text from tags and tracks text offsets", () => {
        const tokens = tokenizeLine("<color=#ff0000>ab</color>")
        expect(tokens.map((t) => [t.kind, t.raw, t.textStart])).toEqual([
            ["tag", "<color=#ff0000>", 0],
            ["text", "ab", 0],
            ["tag", "</color>", 2],
        ])
    })

    it("tracks text offsets across multiple tags", () => {
        const tokens = tokenizeLine("ab<b>cd</b>ef")
        expect(tokens.map((t) => [t.kind, t.raw, t.textStart])).toEqual([
            ["text", "ab", 0],
            ["tag", "<b>", 2],
            ["text", "cd", 2],
            ["tag", "</b>", 4],
            ["text", "ef", 4],
        ])
    })
})

describe("lineTextLength", () => {
    it("counts only visible characters", () => {
        expect(lineTextLength("<color=#ff0000>ab</color>")).toBe(2)
        expect(lineTextLength("hello")).toBe(5)
        expect(lineTextLength("<b></b>")).toBe(0)
    })
})

describe("markupOffsetToText / textToMarkupOffset", () => {
    it("maps text markup offsets directly", () => {
        const line = "ab<color=#ff0000>cd</color>ef"
        expect(markupOffsetToText(line, 1)).toBe(1) // "b"
        expect(markupOffsetToText(line, 6)).toBe(2) // "c"
        expect(markupOffsetToText(line, line.length)).toBe(6)
    })

    it("snaps offsets inside a tag to the tag's text position (QoL)", () => {
        const line = "<color=#8bd6d4>asd</color>"
        // Selecting inside the opening tag
        expect(markupOffsetToText(line, 4)).toBe(0)
        // Selecting inside the closing tag
        expect(markupOffsetToText(line, 18)).toBe(3)
    })

    it("round-trips with textToMarkupOffset", () => {
        const line = "<color=#ff0000>ab</color><color=#0000ff>cd</color>"
        // "b" is text offset 1, markup offset 16
        expect(markupOffsetToText(line, 16)).toBe(1)
        expect(textToMarkupOffset(line, 1, "start")).toBe(16)
        // End boundary: "ab" ends at text offset 2; the end edge maps to the
        // markup offset right after the last visible char (before the close tag)
        const end = textToMarkupOffset(line, 2, "end")
        expect(line.slice(0, end)).toBe("<color=#ff0000>ab")
    })
})

describe("recolorLine", () => {
    it("case 1: total selection replaces the color", () => {
        expect(recolor("<color=#8bd6d4>asd</color>", 0, 3, "#135c5a")).toBe(
            "<color=#135c5a>asd</color>"
        )
    })

    it("case 2: partial selection splits the marker", () => {
        expect(recolor("<color=#8bd6d4>asdfgh</color>", 2, 4, "#135c5a")).toBe(
            "<color=#8bd6d4>as</color><color=#135c5a>df</color><color=#8bd6d4>gh</color>"
        )
    })

    it("case 3: partial selection touching the start edge", () => {
        expect(recolor("<color=#8bd6d4>asdfgh</color>", 0, 3, "#135c5a")).toBe(
            "<color=#135c5a>asd</color><color=#8bd6d4>fgh</color>"
        )
    })

    it("case 4: combined, uncolored + colored", () => {
        expect(recolor("ab<color=#ff0000>cd</color>ef", 1, 4, "#135c5a")).toBe(
            "a<color=#135c5a>bcd</color>ef"
        )
    })

    it("case 5: combined, colored + uncolored + colored", () => {
        expect(
            recolor("<color=#ff0000>ab</color>cd<color=#0000ff>ef</color>", 1, 5, "#135c5a")
        ).toBe("<color=#ff0000>a</color><color=#135c5a>bcde</color><color=#0000ff>f</color>")
    })

    it("case 6: spans several complete markers collapsing into one", () => {
        expect(recolor("<color=#ff0000>ab</color><color=#0000ff>cd</color>", 0, 4, "#135c5a")).toBe(
            "<color=#135c5a>abcd</color>"
        )
    })

    it("case 7: no color in the selection", () => {
        expect(recolor("abcdef", 2, 4, "#135c5a")).toBe("ab<color=#135c5a>cd</color>ef")
    })

    it("case 8: selection that begins/ends mid-marker", () => {
        expect(
            recolor("<color=#ff0000>ab</color>cd<color=#0000ff>ef</color>", 0, 3, "#135c5a")
        ).toBe("<color=#135c5a>abc</color>d<color=#0000ff>ef</color>")
    })

    it("QoL: selection including parts of the <> tags behaves like the total case", () => {
        const line = "<color=#8bd6d4>asd</color>"
        const s = markupOffsetToText(line, 3) // inside the opening tag
        const e = markupOffsetToText(line, 18) // inside the closing tag
        expect(s).toBe(0)
        expect(e).toBe(3)
        expect(recolorLine(tokenizeLine(line), s, e, "#135c5a")).toBe("<color=#135c5a>asd</color>")
    })

    it("preserves other inline tags (bold) across a partial selection", () => {
        expect(recolor("<b><color=#ff0000>asdfgh</color></b>", 2, 4, "#135c5a")).toBe(
            "<b><color=#ff0000>as</color></b><color=#135c5a><b>df</b></color><b><color=#ff0000>gh</color></b>"
        )
    })

    it("preserves bold that spans the whole selection", () => {
        expect(recolor("<b>abcd</b>", 1, 3, "#135c5a")).toBe(
            "<b>a</b><color=#135c5a><b>bc</b></color><b>d</b>"
        )
    })

    it("keeps bold and color nested cleanly (no crossing tags)", () => {
        expect(recolor("<color=#ff0000><b>asd</b></color>", 1, 3, "#135c5a")).toBe(
            "<color=#ff0000><b>a</b></color><color=#135c5a><b>sd</b></color>"
        )
    })

    it("drops inner color markers within the selection", () => {
        expect(
            recolor("x<color=#ff0000>ab</color><color=#0000ff>cd</color>y", 1, 5, "#135c5a")
        ).toBe("x<color=#135c5a>abcd</color>y")
    })

    it("uses the innermost color for nested markers", () => {
        const line = "<color=#ff0000><color=#0000ff>ab</color></color>"
        expect(recolor(line, 0, 2, "#135c5a")).toBe("<color=#135c5a>ab</color>")
    })

    it("handles empty selection as no-op", () => {
        expect(recolor("abcdef", 2, 2, "#135c5a")).toBe("abcdef")
    })
})

describe("detectColorInRange", () => {
    it("detects a single color covering the range", () => {
        expect(detect("<color=#8bd6d4>asd</color>", 0, 3)).toBe("#8bd6d4")
    })

    it("detects a color for a partial selection inside a marker", () => {
        expect(detect("<color=#8bd6d4>asdfgh</color>", 2, 4)).toBe("#8bd6d4")
    })

    it("uses the innermost color when nested", () => {
        expect(detect("<color=#ff0000><color=#0000ff>ab</color></color>", 0, 2)).toBe("#0000ff")
    })

    it("returns null when the range is uncolored", () => {
        expect(detect("abcdef", 2, 4)).toBeNull()
    })

    it("returns null when the range spans different colors", () => {
        expect(detect("<color=#ff0000>ab</color><color=#0000ff>cd</color>", 1, 3)).toBeNull()
    })

    it("returns null for an empty range", () => {
        expect(detect("<color=#ff0000>ab</color>", 2, 2)).toBeNull()
    })
})
