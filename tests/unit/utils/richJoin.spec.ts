import { describe, expect, it } from "vitest"

import { INTERNAL_EQUALS, renderEditableHtml, serializeEditableHtml } from "@/utils/lyricsMarkup"
import { joinSelectionSpan, unjoinJoinedSpans } from "@/utils/richJoin"

function makeEditor(plainText: string): HTMLElement {
    const editor = document.createElement("div")
    editor.innerHTML = renderEditableHtml(plainText)
    return editor
}

// Maps a plain-text offset to a DOM point. Lengths are preserved between the
// plain lyrics and the editor text (spaces/underscores and internal equals are
// 1:1), so plain-text offsets align with the DOM text nodes.
function pointAt(editor: HTMLElement, offset: number): { node: Text; offset: number } {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    let remaining = offset
    let node = walker.nextNode()
    while (node) {
        const length = (node.textContent ?? "").length
        if (remaining <= length) return { node: node as Text, offset: remaining }
        remaining -= length
        node = walker.nextNode()
    }
    throw new Error(`Offset ${offset} is out of bounds for the editor text`)
}

function selectRange(editor: HTMLElement, start: number, end: number): Range {
    const startPoint = pointAt(editor, start)
    const endPoint = pointAt(editor, end)
    const range = document.createRange()
    range.setStart(startPoint.node, startPoint.offset)
    range.setEnd(endPoint.node, endPoint.offset)
    return range
}

describe("unjoinJoinedSpans", () => {
    it("splits a joined span at the selected underscores only", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        const result = unjoinJoinedSpans(selectRange(editor, 4, 10), editor)

        expect(result?.modified).toBe(true)
        expect(editor.innerHTML).toBe('<div><span class="joined">aaa bbb</span> ccc</div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa_bbb ccc")
    })

    it("keeps the unselected join on the right joined when splitting at its space", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        unjoinJoinedSpans(selectRange(editor, 0, 6), editor)

        expect(editor.innerHTML).toBe('<div>aaa <span class="joined">bbb ccc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa bbb_ccc")
    })

    it("un-joins everything when the whole joined span is selected", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        unjoinJoinedSpans(selectRange(editor, 0, 11), editor)

        expect(editor.innerHTML).toBe("<div>aaa bbb ccc</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa bbb ccc")
    })

    it("converts an internal equals inside the selection into a literal equals", () => {
        const editor = makeEditor(`aaa${INTERNAL_EQUALS}bbb_ccc`)
        unjoinJoinedSpans(selectRange(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe('<div>aaa=<span class="joined">bbb ccc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa=bbb_ccc")
    })

    it("keeps an internal equals outside the selection highlighted", () => {
        const editor = makeEditor(`A${INTERNAL_EQUALS}B_C`)
        unjoinJoinedSpans(selectRange(editor, 2, 5), editor)

        expect(editor.innerHTML).toBe(
            '<div><span class="joined">A<span class="internal-equals">=</span>B</span> C</div>'
        )
        expect(serializeEditableHtml(editor.innerHTML)).toBe(`A${INTERNAL_EQUALS}B C`)
    })

    it("un-joins internal equals and underscores together within the selection", () => {
        const editor = makeEditor(`A${INTERNAL_EQUALS}B_C_D`)
        unjoinJoinedSpans(selectRange(editor, 0, 6), editor)

        expect(editor.innerHTML).toBe("<div>A=B C D</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("A=B C D")
    })

    it("turns every internal equals in the selection into a literal equals", () => {
        const editor = makeEditor(`A${INTERNAL_EQUALS}B${INTERNAL_EQUALS}C`)
        unjoinJoinedSpans(selectRange(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe("<div>A=B=C</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("A=B=C")
    })

    it("leaves literal equals separators untouched between two joined spans", () => {
        const editor = makeEditor("A_B=C_D")
        unjoinJoinedSpans(selectRange(editor, 0, 7), editor)

        expect(editor.innerHTML).toBe("<div>A B=C D</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("A B=C D")
    })

    it("preserves nested formatting across splits", () => {
        const editor = makeEditor("A_<b>B</b>_C")
        unjoinJoinedSpans(selectRange(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe("<div>A <b>B</b> C</div>")
        expect(serializeEditableHtml(editor.innerHTML)).toBe("A <b>B</b> C")
    })

    it("un-joins padding underscore runs", () => {
        const editor = makeEditor("____Wit_it!")
        unjoinJoinedSpans(selectRange(editor, 4, 11), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">    Wit</span> it!</div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("____Wit it!")
    })

    it("does not modify a selection without join points inside a joined span", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        const result = unjoinJoinedSpans(selectRange(editor, 4, 6), editor)

        expect(result?.modified).toBe(false)
        expect(editor.innerHTML).toBe('<div><span class="joined">aaa bbb ccc</span></div>')
    })

    it("returns null when the selection does not touch a joined span", () => {
        const editor = makeEditor("aaa bbb ccc")
        expect(unjoinJoinedSpans(selectRange(editor, 0, 5), editor)).toBeNull()
    })
})

describe("joinSelectionSpan", () => {
    it("merges the selection with an intersecting joined span into one span", () => {
        const editor = makeEditor("aaa bbb_ccc")
        joinSelectionSpan(selectRange(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aaa bbb ccc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa_bbb_ccc")
    })

    it("merges the selection with an adjacent joined span into one span", () => {
        const editor = makeEditor("aa bb_cc")
        joinSelectionSpan(selectRange(editor, 0, 3), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aa bb cc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aa_bb_cc")
    })

    it("merges a selection adjacent on the left into one span", () => {
        const editor = makeEditor("aa_bb cc")
        joinSelectionSpan(selectRange(editor, 5, 8), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aa bb cc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aa_bb_cc")
    })

    it("wraps a plain selection without touching a joined span", () => {
        const editor = makeEditor("aa bb cc")
        joinSelectionSpan(selectRange(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aa bb</span> cc</div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aa_bb cc")
    })

    it("converts literal equals into internal equals when joining", () => {
        const editor = makeEditor("A=B C")
        joinSelectionSpan(selectRange(editor, 0, 5), editor)

        expect(editor.innerHTML).toBe(
            '<div><span class="joined">A<span class="internal-equals">=</span>B C</span></div>'
        )
        expect(serializeEditableHtml(editor.innerHTML)).toBe(`A${INTERNAL_EQUALS}B_C`)
    })

    it("does not merge a joined span separated by an unselected separator", () => {
        const editor = makeEditor("aa bb_cc dd_ee")
        joinSelectionSpan(selectRange(editor, 0, 3), editor)

        expect(editor.innerHTML).toBe(
            '<div><span class="joined">aa bb cc</span> <span class="joined">dd ee</span></div>'
        )
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aa_bb_cc dd_ee")
    })

    it("leaves an already joined selection unchanged as a single span", () => {
        const editor = makeEditor("aaa_bbb_ccc")
        joinSelectionSpan(selectRange(editor, 0, 11), editor)

        expect(editor.innerHTML).toBe('<div><span class="joined">aaa bbb ccc</span></div>')
        expect(serializeEditableHtml(editor.innerHTML)).toBe("aaa_bbb_ccc")
    })
})
