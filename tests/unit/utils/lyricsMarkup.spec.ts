import { describe, expect, it } from "vitest"

import {
    INTERNAL_EQUALS,
    joinSyllables,
    renderEditableHtml,
    renderMarkup,
    serializeEditableHtml,
    toggleTag,
} from "@/utils/lyricsMarkup"

describe("renderMarkup", () => {
    it("renders bold and italic tags", () => {
        expect(renderMarkup("Some <b>bold</b> and <i>italic</i> text")).toBe(
            "Some <b>bold</b> and <i>italic</i> text"
        )
    })

    it("renders underline, strikethrough, letter case and monospace tags", () => {
        expect(renderMarkup("<u>under</u> <s>strike</s>")).toBe("<u>under</u> <s>strike</s>")
    })

    it("escapes non-whitelisted tags as literal text", () => {
        expect(renderMarkup("<size=20>big</size> <script>alert(1)</script>")).toBe(
            "&lt;size=20&gt;big&lt;/size&gt; &lt;script&gt;alert(1)&lt;/script&gt;"
        )
    })

    it("closes open tags at the end of each line", () => {
        expect(renderMarkup("<b>first\nsecond")).toBe("<b>first</b>\nsecond")
    })

    it("wraps joined syllables in a highlighted span with spaces", () => {
        expect(renderMarkup("In_the be-gin-ning")).toBe(
            '<span class="joined">In the</span> be-gin-ning'
        )
    })

    it("renders internal equals markers as a literal equals inside a joined span", () => {
        expect(renderMarkup(`A${INTERNAL_EQUALS}B C=D`)).toBe('<span class="joined">A=B</span> C=D')
    })

    it("renders color and cspace tags with safe values", () => {
        expect(renderMarkup("<color=red>x</color>")).toBe(
            '<span data-tmp="color" data-tmp-value="red" style="color:red">x</span>'
        )
        expect(renderMarkup("<cspace=2>x</cspace>")).toBe(
            '<span data-tmp="cspace" data-tmp-value="2" style="letter-spacing:2px">x</span>'
        )
        expect(renderMarkup('<color="a;b" onmouseover="x">y</color>')).toBe(
            "&lt;color=&quot;a;b&quot; onmouseover=&quot;x&quot;&gt;y&lt;/color&gt;"
        )
    })

    it("keeps unmatched closing tags as literal text", () => {
        expect(renderMarkup("text</b>")).toBe("text&lt;/b&gt;")
    })
})

describe("renderEditableHtml", () => {
    it("wraps every line in a block element", () => {
        expect(renderEditableHtml("one\ntwo")).toBe("<div>one</div><div>two</div>")
    })

    it("renders empty lines with a line break so they keep their height", () => {
        expect(renderEditableHtml("one\n\ntwo")).toBe("<div>one</div><div><br></div><div>two</div>")
    })

    it("renders markup and joined syllables inside the line", () => {
        expect(renderEditableHtml("<i>one two_three")).toBe(
            '<div><i>one <span class="joined">two three</span></i></div>'
        )
    })
})

describe("serializeEditableHtml", () => {
    it("joins block elements back into newline-separated text", () => {
        expect(serializeEditableHtml("<div>one</div><div>two</div>")).toBe("one\ntwo")
    })

    it("maps inline tags back to their original markup", () => {
        expect(serializeEditableHtml("<div><b>bold</b> <i>italic</i></div>")).toBe(
            "<b>bold</b> <i>italic</i>"
        )
        expect(serializeEditableHtml("<div><strong>s</strong> <em>e</em></div>")).toBe(
            "<b>s</b> <i>e</i>"
        )
    })

    it("serializes joined spans back to underscores", () => {
        expect(serializeEditableHtml('<div><span class="joined">two three</span></div>')).toBe(
            "two_three"
        )
    })

    it("serializes an internal equals in a joined span back to the marker", () => {
        expect(serializeEditableHtml('<div><span class="joined">A=B</span></div>')).toBe(
            `A${INTERNAL_EQUALS}B`
        )
    })

    it("serializes joined spans with nested tags back to their markup", () => {
        expect(serializeEditableHtml('<div><span class="joined">A=<b>B</b></span></div>')).toBe(
            `A${INTERNAL_EQUALS}<b>B</b>`
        )
    })

    it("serializes color and cspace spans back to their markup", () => {
        expect(
            serializeEditableHtml(
                '<div><span data-tmp="color" data-tmp-value="red" style="color:red">x</span></div>'
            )
        ).toBe("<color=red>x</color>")
        expect(
            serializeEditableHtml(
                '<div><span data-tmp="cspace" data-tmp-value="2" style="letter-spacing:2px">x</span></div>'
            )
        ).toBe("<cspace=2>x</cspace>")
    })

    it("strips unknown elements but keeps their content", () => {
        expect(serializeEditableHtml("<div>a<font>bc</font>d</div>")).toBe("abcd")
    })

    it("round-trips edited text with markup and joined syllables", () => {
        const original = "In_the be-gin-ning\n<i>second</i> line"
        expect(serializeEditableHtml(renderEditableHtml(original))).toBe(original)
    })

    it("round-trips section separator empty lines", () => {
        const original = "first\nsecond\n\n\nthird"
        expect(serializeEditableHtml(renderEditableHtml(original))).toBe(original)
    })

    it("round-trips internal equals markers through the editor HTML", () => {
        const original = `A${INTERNAL_EQUALS}B C=D`
        expect(serializeEditableHtml(renderEditableHtml(original))).toBe(original)
    })
})

describe("toggleTag", () => {
    it("wraps a selection with the tag", () => {
        expect(toggleTag("hello", "b")).toBe("<b>hello</b>")
    })

    it("removes the tag when already wrapped", () => {
        expect(toggleTag("<i>hello</i>", "i")).toBe("hello")
    })

    it("does not unwrap partial matches", () => {
        expect(toggleTag("<b>hello</i>", "b")).toBe("<b><b>hello</i></b>")
    })
})

describe("joinSyllables", () => {
    it("replaces spaces with underscores", () => {
        expect(joinSyllables("In the")).toBe("In_the")
    })

    it("collapses multiple spaces", () => {
        expect(joinSyllables("a   b")).toBe("a_b")
    })
})
