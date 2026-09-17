import { describe, expect, it } from "vitest"

import { INTERNAL_EQUALS, serializeEditableHtml } from "@/utils/lyricsMarkup"
import { joinSelectionSpan, unjoinJoinedSpans } from "@/utils/richJoin"

import { makeEditor, rangeOver } from "../helpers/dom"

describe("unjoinJoinedSpans", () => {
    it("splits a joined span at the selected underscores only", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        const result = unjoinJoinedSpans(rangeOver(editor, 4, 10), editor)

        expect(result?.modified).toBe(true)
        expect(editor.innerHTML).toBe('<div><span class="joined">aaa bbb</span> ccc</div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa_bbb ccc")
    })

    it("keeps the unselected join on the right joined when splitting at its space", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        unjoinJoinedSpans(rangeOver(editor, 0, 6), editor)

        expect(editor.innerHTML).toBe('<div>aaa <span class="joined">bbb ccc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa bbb_ccc")
    })

    it("un-joins everything when the whole joined span is selected", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        unjoinJoinedSpans(rangeOver(editor, 0, 11), editor)

        expect(editor.innerHTML).toBe("<div>aaa bbb ccc</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa bbb ccc")
    })

    it("converts an internal equals inside the selection into a literal equals", () => {
        const editor = makeEditor(`aaa${INTERNAL_EQUALS}bbb_ccc`)
        unjoinJoinedSpans(rangeOver(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe('<div>aaa=<span class="joined">bbb ccc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa=bbb_ccc")
    })

    it("keeps an internal equals outside the selection highlighted", () => {
        const editor = makeEditor(`A${INTERNAL_EQUALS}B_C`)
        unjoinJoinedSpans(rangeOver(editor, 2, 5), editor)

        expect(editor.innerHTML).toBe(
            '<div><span class="joined">A<span class="internal-equals">=</span>B</span> C</div>'
        )
        expect(serializeEditableHtml(editor.innerHTML)).toBe(`A${INTERNAL_EQUALS}B C`)
    })

    it("un-joins internal equals and underscores together within the selection", () => {
        const editor = makeEditor(`A${INTERNAL_EQUALS}B_C_D`)
        unjoinJoinedSpans(rangeOver(editor, 0, 6), editor)

        expect(editor.innerHTML).toBe("<div>A=B C D</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("A=B C D")
    })

    it("turns every internal equals in the selection into a literal equals", () => {
        const editor = makeEditor(`A${INTERNAL_EQUALS}B${INTERNAL_EQUALS}C`)
        unjoinJoinedSpans(rangeOver(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe("<div>A=B=C</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("A=B=C")
    })

    it("leaves literal equals separators untouched between two joined spans", () => {
        const editor = makeEditor("A_B=C_D")
        unjoinJoinedSpans(rangeOver(editor, 0, 7), editor)

        expect(editor.innerHTML).toBe("<div>A B=C D</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("A B=C D")
    })

    it("preserves nested formatting across splits", () => {
        const editor = makeEditor("A_<b>B</b>_C")
        unjoinJoinedSpans(rangeOver(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe("<div>A <b>B</b> C</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("A <b>B</b> C")
    })

    it("un-joins padding underscore runs", () => {
        const editor = makeEditor("____Wit_it!")
        unjoinJoinedSpans(rangeOver(editor, 4, 11), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">    Wit</span> it!</div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("____Wit it!")
    })

    it("does not modify a selection without join points inside a joined span", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        const result = unjoinJoinedSpans(rangeOver(editor, 4, 6), editor)

        expect(result?.modified).toBe(false)
        expect(editor.innerHTML).toBe('<div><span class="joined">aaa bbb ccc</span></div>')
    })

    it("returns null when the selection does not touch a joined span", () => {
        const editor = makeEditor("aaa bbb ccc")
        expect(unjoinJoinedSpans(rangeOver(editor, 0, 5), editor)).toBeNull()
    })
})

describe("joinSelectionSpan", () => {
    it("merges the selection with an intersecting joined span into one span", () => {
        const editor = makeEditor("aaa bbb_ccc")
        joinSelectionSpan(rangeOver(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aaa bbb ccc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa_bbb_ccc")
    })

    it("merges the selection with an adjacent joined span into one span", () => {
        const editor = makeEditor("aa bb_cc")
        joinSelectionSpan(rangeOver(editor, 0, 3), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aa bb cc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aa_bb_cc")
    })

    it("merges a selection adjacent on the left into one span", () => {
        const editor = makeEditor("aa_bb cc")
        joinSelectionSpan(rangeOver(editor, 5, 8), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aa bb cc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aa_bb_cc")
    })

    it("wraps a plain selection without touching a joined span", () => {
        const editor = makeEditor("aa bb cc")
        joinSelectionSpan(rangeOver(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aa bb</span> cc</div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aa_bb cc")
    })

    it("converts literal equals into internal equals when joining", () => {
        const editor = makeEditor("A=B C")
        joinSelectionSpan(rangeOver(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe(
            '<div><span class="joined">A<span class="internal-equals">=</span>B C</span></div>'
        )
        expect(serializeEditableHtml(editor.innerHTML)).toBe(`A${INTERNAL_EQUALS}B_C`)
    })

    it("does not merge a joined span separated by an unselected separator", () => {
        const editor = makeEditor("aa bb_cc dd_ee")
        joinSelectionSpan(rangeOver(editor, 0, 3), editor)

        expect(editor.innerHTML).toBe(
            '<div><span class="joined">aa bb cc</span> <span class="joined">dd ee</span></div>'
        )
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aa_bb_cc dd_ee")
    })

    it("leaves an already joined selection unchanged as a single span", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        joinSelectionSpan(rangeOver(editor, 0, 11), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aaa bbb ccc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa_bbb_ccc")
    })
})
