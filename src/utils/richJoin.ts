/**
 * Rich-text editor helpers to "un-join" syllables that are already joined.
 *
 * In the rich editor a joined syllable is a `<span class="joined">` whose
 * spaces represent the chart's `_` marker, and a single-syllable "=" is an
 * `<span class="internal-equals">`. Un-joining splits those spans at the
 * in-range spaces and internal equals (both are "join" points), turning them
 * into real separators: a literal space or a literal "=" tie. The leftover
 * pieces are only re-wrapped in a `.joined` span when they still contain a
 * join (a space or an internal equals), so the highlight never leaves a
 * partial syllable.
 */

const SPACE_REGEX = /[ \u00A0]/

interface Point {
    node: Text
    offset: number
}

// Returns the DOM point at the given character offset of an element's text.
function getTextPoint(element: HTMLElement, offset: number): Point {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let remaining = offset
    let node = walker.nextNode()
    while (node) {
        const length = (node.textContent ?? "").length
        if (remaining <= length) return { node: node as Text, offset: remaining }
        remaining -= length
        node = walker.nextNode()
    }
    throw new Error(`Offset ${offset} is out of bounds for the element text`)
}

// Returns the DOM point one character past the given point within `element`.
function advancePoint(element: HTMLElement, point: Point): Point {
    if (point.offset < (point.node.textContent ?? "").length) {
        return { node: point.node, offset: point.offset + 1 }
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    walker.currentNode = point.node
    const next = walker.nextNode()
    return next
        ? { node: next as Text, offset: Math.min(1, (next.textContent ?? "").length) }
        : { node: point.node, offset: (point.node.textContent ?? "").length }
}

function firstNonEmptyText(element: HTMLElement): Text | null {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node && (node.textContent ?? "").length === 0) node = walker.nextNode()
    return node as Text | null
}

// Removes empty inline elements left behind by range extraction (e.g. `<b></b>`
// or an emptied internal-equals span). They carry no content, so they are safe.
// Block elements (`div`, `p`, `br`) are preserved.
function cleanEmptyInline(root: ParentNode) {
    for (const element of Array.from(root.querySelectorAll("*")).reverse()) {
        const tag = element.tagName.toLowerCase()
        if (tag !== "div" && tag !== "p" && tag !== "br" && element.textContent === "") {
            element.remove()
        }
    }
}

function needsJoinedWrap(fragment: DocumentFragment): boolean {
    return (
        SPACE_REGEX.test(fragment.textContent) ||
        fragment.querySelector(".internal-equals") !== null
    )
}

function wrapJoined(fragment: DocumentFragment): HTMLSpanElement {
    const span = document.createElement("span")
    span.className = "joined"
    span.appendChild(fragment)
    return span
}

function hasInternalEqualsAncestor(node: Node, boundary: Node): boolean {
    let current: Node | null = node.parentNode
    while (current && current !== boundary) {
        if (current instanceof HTMLElement && current.classList.contains("internal-equals"))
            return true
        current = current.parentNode
    }
    return false
}

// Splits a joined span at a join point (a space or an internal equals). The
// point is consumed as the separator (space or literal "="); the left and
// right sides are re-wrapped only if they still contain a join.
function splitJoinedSpanAtPoint(
    span: HTMLElement,
    point: Point,
    inserted: Node[]
): HTMLElement | null {
    const separatorEnd = advancePoint(span, point)

    const rightRange = document.createRange()
    rightRange.setStart(separatorEnd.node, separatorEnd.offset)
    rightRange.setEnd(span, span.childNodes.length)
    const rightFragment = rightRange.extractContents()

    const leftRange = document.createRange()
    leftRange.setStart(span, 0)
    leftRange.setEnd(point.node, point.offset)
    const leftFragment = leftRange.extractContents()

    let separator: DocumentFragment | null = null
    const firstText = firstNonEmptyText(span)
    if (firstText) {
        const separatorRange = document.createRange()
        separatorRange.setStart(firstText, 0)
        separatorRange.setEnd(firstText, 1)
        separator = separatorRange.extractContents()
        separator.textContent = separator.textContent.replace(/\u00A0/g, " ")
    }

    const leftover = document.createRange()
    leftover.selectNodeContents(span)
    leftover.extractContents()

    cleanEmptyInline(leftFragment)
    cleanEmptyInline(rightFragment)

    const parent = span.parentNode
    if (!parent) return null

    const track = (firstNode: Node | null, lastNode: Node | null) => {
        if (firstNode) {
            inserted.push(firstNode)
            if (lastNode && lastNode !== firstNode) inserted.push(lastNode)
        }
    }

    let leftJoined: HTMLElement | null = null
    if (needsJoinedWrap(leftFragment)) {
        leftJoined = wrapJoined(leftFragment)
        parent.insertBefore(leftJoined, span)
        track(leftJoined.firstChild, leftJoined.lastChild)
    } else if (leftFragment.childNodes.length > 0) {
        const firstChild = leftFragment.firstChild
        const lastChild = leftFragment.lastChild
        parent.insertBefore(leftFragment, span)
        track(firstChild, lastChild)
    }

    if (separator) {
        const firstChild = separator.firstChild
        const lastChild = separator.lastChild
        parent.insertBefore(separator, span)
        track(firstChild, lastChild)
    }

    if (needsJoinedWrap(rightFragment)) {
        const rightJoined = wrapJoined(rightFragment)
        parent.insertBefore(rightJoined, span)
        track(rightJoined.firstChild, rightJoined.lastChild)
    } else if (rightFragment.childNodes.length > 0) {
        const firstChild = rightFragment.firstChild
        const lastChild = rightFragment.lastChild
        parent.insertBefore(rightFragment, span)
        track(firstChild, lastChild)
    }

    span.remove()
    return leftJoined
}

// Offsets of the join points (spaces/NBSP and internal equals) of a joined
// span that fall inside the selection range, replicating the `[start, end)`
// slice semantics of plain mode.
function inRangeSplitOffsets(span: HTMLElement, range: Range): number[] {
    const offsets: number[] = []
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT)
    let base = 0
    let node = walker.nextNode()
    while (node) {
        const text = node.textContent ?? ""
        const isInternalEquals = hasInternalEqualsAncestor(node, span)
        for (let i = 0; i < text.length; i++) {
            const isJoin = isInternalEquals || SPACE_REGEX.test(text[i])
            if (
                isJoin &&
                range.comparePoint(node, i) === 0 &&
                !(range.endContainer === node && range.endOffset === i)
            ) {
                offsets.push(base + i)
            }
        }
        base += text.length
        node = walker.nextNode()
    }
    return offsets
}

// The joined spans whose content intersects the selection range.
export function collectTouchedJoinedSpans(range: Range, editor: HTMLElement): HTMLElement[] {
    const spans = new Set<HTMLElement>()
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node) {
        if (range.intersectsNode(node)) {
            let current: Node | null = node.parentNode
            while (current && current !== editor) {
                if (current instanceof HTMLElement && current.classList.contains("joined")) {
                    spans.add(current)
                    break
                }
                current = current.parentNode
            }
        }
        node = walker.nextNode()
    }
    return Array.from(spans)
}

export interface UnjoinResult {
    modified: boolean
    first: Node | null
    last: Node | null
}

// Un-joins the joined spans touched by the selection. Returns null when the
// selection does not touch any joined span (callers fall back to joining).
// `first`/`last` are the outer nodes of the modified region, usable to restore
// the selection around it.
export function unjoinJoinedSpans(range: Range, editor: HTMLElement): UnjoinResult | null {
    const spans = collectTouchedJoinedSpans(range, editor)
    if (spans.length === 0) return null

    // Compute every split offset before mutating the DOM so the range stays valid.
    const jobs = spans.map((span) => ({ span, offsets: inRangeSplitOffsets(span, range) }))

    const inserted: Node[] = []
    for (const job of jobs) {
        if (job.offsets.length === 0) continue
        let current: HTMLElement | null = job.span
        for (let k = job.offsets.length - 1; k >= 0; k--) {
            if (!current) break
            current = splitJoinedSpanAtPoint(
                current,
                getTextPoint(current, job.offsets[k]),
                inserted
            )
        }
    }

    if (inserted.length === 0) return { modified: false, first: null, last: null }

    let first = inserted[0]
    let last = inserted[0]
    for (const node of inserted) {
        if (node.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_PRECEDING) first = node
        if (node.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING) last = node
    }
    return { modified: true, first, last }
}

// Returns the point of the next/previous text character within `root`, or null
// at the boundaries. Used to detect joined spans adjacent to a selection.
function nextTextPoint(root: HTMLElement, node: Node, offset: number): Point | null {
    if (node.nodeType === Node.TEXT_NODE && offset < (node.textContent ?? "").length) {
        return { node: node as Text, offset: offset + 1 }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    walker.currentNode = node
    const next = walker.nextNode()
    return next ? { node: next as Text, offset: 0 } : null
}

function prevTextPoint(root: HTMLElement, node: Node, offset: number): Point | null {
    if (node.nodeType === Node.TEXT_NODE && offset > 0) {
        return { node: node as Text, offset: offset - 1 }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    walker.currentNode = node
    const prev = walker.previousNode()
    return prev ? { node: prev as Text, offset: (prev.textContent ?? "").length } : null
}

// Joined spans to merge when joining: those intersecting the selection plus
// those directly adjacent to its boundaries (the next/previous character is
// inside the span), so selecting "aa " next to "bb_cc" merges everything.
function collectJoinSpans(range: Range, editor: HTMLElement): HTMLElement[] {
    const spans = new Set(collectTouchedJoinedSpans(range, editor))
    const after = nextTextPoint(editor, range.endContainer, range.endOffset)
    const before = prevTextPoint(editor, range.startContainer, range.startOffset)
    for (const span of Array.from(editor.querySelectorAll<HTMLElement>(".joined"))) {
        if ((after && span.contains(after.node)) || (before && span.contains(before.node))) {
            spans.add(span)
        }
    }
    return Array.from(spans)
}

// Converts literal "=" characters of a fragment into internal-equals spans,
// skipping "=" inside tag-like text (`<...>`) and existing internal-equals.
function convertEqualsToInternal(fragment: DocumentFragment) {
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT)
    const targets: Text[] = []
    let node = walker.nextNode()
    while (node) {
        if (!hasInternalEqualsAncestor(node, fragment) && (node.textContent ?? "").includes("=")) {
            targets.push(node as Text)
        }
        node = walker.nextNode()
    }
    for (const textNode of targets) {
        const parent = textNode.parentNode
        if (!parent) continue
        const parts = (textNode.textContent ?? "").split(/(<[^>]*>)/g)
        const nodes: Node[] = []
        for (const part of parts) {
            if (part === "") continue
            if (part.startsWith("<") && part.endsWith(">")) {
                nodes.push(document.createTextNode(part))
                continue
            }
            const segments = part.split("=")
            segments.forEach((segment, index) => {
                if (segment !== "") nodes.push(document.createTextNode(segment))
                if (index < segments.length - 1) {
                    const span = document.createElement("span")
                    span.className = "internal-equals"
                    span.textContent = "="
                    nodes.push(span)
                }
            })
        }
        textNode.replaceWith(...nodes)
    }
}

// Joins the selection into a single `<span class="joined">`, merging it with
// any touched or adjacent joined spans so the whole run becomes one span.
// Returns the joined span, or null when nothing could be joined.
export function joinSelectionSpan(range: Range, editor: HTMLElement): HTMLSpanElement | null {
    const spans = collectJoinSpans(range, editor)

    const region = range.cloneRange()
    for (const span of spans) {
        const spanRange = document.createRange()
        spanRange.selectNode(span)
        if (spanRange.compareBoundaryPoints(Range.START_TO_START, region) < 0) {
            region.setStart(spanRange.startContainer, spanRange.startOffset)
        }
        if (spanRange.compareBoundaryPoints(Range.END_TO_END, region) > 0) {
            region.setEnd(spanRange.endContainer, spanRange.endOffset)
        }
    }

    // A selection crossing lines cannot collapse into a single joined span, so
    // fall back to wrapping only the selection.
    if (region.commonAncestorContainer === editor) {
        const fallbackRange = range.cloneRange()
        const span = document.createElement("span")
        span.className = "joined"
        span.appendChild(fallbackRange.extractContents())
        fallbackRange.insertNode(span)
        return span
    }

    const fragment = region.extractContents()

    // Flatten nested joined spans so the run becomes a single span.
    for (const joined of Array.from(fragment.querySelectorAll(".joined"))) {
        joined.replaceWith(...Array.from(joined.childNodes))
    }
    convertEqualsToInternal(fragment)
    cleanEmptyInline(fragment)

    const joined = document.createElement("span")
    joined.className = "joined"
    joined.appendChild(fragment)
    region.insertNode(joined)

    cleanEmptyInline(editor)
    return joined
}
