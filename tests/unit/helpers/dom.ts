import { vi } from "vitest"

import { renderEditableHtml } from "@/utils/lyricsMarkup"

// Builds a rich-text editor element from a plain lyrics string.
export function makeEditor(plainText: string): HTMLElement {
    const editor = document.createElement("div")
    editor.innerHTML = renderEditableHtml(plainText)
    return editor
}

// Maps a plain-text offset to a DOM point. Lengths are preserved between the
// plain lyrics and the editor text (spaces/underscores and internal equals are
// 1:1), so plain-text offsets align with the DOM text nodes.
export function domPoint(root: HTMLElement, offset: number): { node: Node; offset: number } {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let remaining = offset
    let node = walker.nextNode()
    while (node) {
        const length = (node.textContent ?? "").length
        if (remaining <= length) return { node, offset: remaining }
        remaining -= length
        node = walker.nextNode()
    }
    throw new Error(`Offset ${offset} is out of bounds`)
}

export function rangeOver(root: HTMLElement, start: number, end: number): Range {
    const startPoint = domPoint(root, start)
    const endPoint = domPoint(root, end)
    const range = document.createRange()
    range.setStart(startPoint.node, startPoint.offset)
    range.setEnd(endPoint.node, endPoint.offset)
    return range
}

// jsdom's Selection.addRange relies on internals hidden behind vitest's global
// proxy, so stub the selection with a plain object.
export function mockSelection(range: Range) {
    vi.spyOn(window, "getSelection").mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        getRangeAt: () => range,
        removeAllRanges: vi.fn(),
        addRange: vi.fn(),
    } as unknown as Selection)
}
