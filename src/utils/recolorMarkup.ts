/**
 * Utilities to recolor selections of the lyrics markup (`<color=#hex>`) while
 * preserving every other tag (`<b>`, `<i>`, lowercase, cspace, ...).
 *
 * The algorithm works on a single line (color tags never span lines). A
 * selection is expressed as a text range `[s, e)` over the line's *visible*
 * text: tags have zero width, so a boundary that lands inside a tag (when the
 * user selected part of the `<>` markup) snaps to that tag's text position.
 *
 * Recoloring follows a "close context / wrap in new color / reopen context"
 * strategy: everything before `s` and after `e` keeps its exact markup, and
 * the selected text is wrapped in `<color=hex>` with its non-color formatting
 * preserved. Color tags strictly inside the selection are dropped so inner
 * markers collapse into the single new color.
 */

export interface MarkupToken {
    kind: "text" | "tag"
    /** The exact source slice this token represents. */
    raw: string
    /** Start text offset for text tokens; the (zero-width) text position for tags. */
    textStart: number
    /** Visible character count, only meaningful for text tokens. */
    textLen: number
    /** Lowercased tag name (e.g. "color"), only for tags. */
    name?: string
    /** Tag value (e.g. "#ff0000"), only for opening tags with a value. */
    value?: string
    /** Whether the tag is a closing tag, only for tags. */
    isClose?: boolean
}

const TAG_REGEX = /(<[^>]*>)/g

function parseTag(raw: string): { name: string; value?: string; isClose: boolean } {
    const inner = raw.slice(1, -1)
    const isClose = inner.startsWith("/")
    const body = isClose ? inner.slice(1) : inner
    const nameMatch = body.match(/^([a-z]+)/i)
    const name = nameMatch ? nameMatch[1].toLowerCase() : ""
    const value = nameMatch
        ? body
              .slice(nameMatch[1].length)
              .replace(/^[=:\s]+/, "")
              .replace(/^["']|["']$/g, "")
        : ""
    return { name, value, isClose }
}

export function tokenizeLine(line: string): MarkupToken[] {
    const tokens: MarkupToken[] = []
    let textStart = 0
    let lastIndex = 0
    for (const match of line.matchAll(TAG_REGEX)) {
        const index = match.index
        if (index > lastIndex) {
            const raw = line.slice(lastIndex, index)
            tokens.push({ kind: "text", raw, textStart, textLen: raw.length })
            textStart += raw.length
        }
        const raw = match[0]
        tokens.push({ kind: "tag", raw, textStart, textLen: 0, ...parseTag(raw) })
        lastIndex = index + raw.length
    }
    if (lastIndex < line.length) {
        const raw = line.slice(lastIndex)
        tokens.push({ kind: "text", raw, textStart, textLen: raw.length })
    }
    return tokens
}

/** Total number of visible characters in a line (tags contribute none). */
export function lineTextLength(line: string): number {
    return tokenizeLine(line).reduce((total, token) => total + token.textLen, 0)
}

/**
 * Maps a markup offset to a visible-text offset. A boundary inside a tag snaps
 * to the tag's zero-width text position, so selecting part of a `<...>` tag
 * behaves like selecting the whole tag (QoL).
 */
export function markupOffsetToText(line: string, markupOffset: number): number {
    const tokens = tokenizeLine(line)
    let pos = 0
    for (const token of tokens) {
        const end = pos + token.raw.length
        if (markupOffset < end) {
            return token.kind === "text"
                ? token.textStart + Math.max(0, markupOffset - pos)
                : token.textStart
        }
        pos = end
    }
    return lineTextLength(line)
}

/**
 * Inverse of {@link markupOffsetToText}. `edge` picks where a boundary that
 * lands on a tag should go: "start" snaps after the tag (the text following it),
 * "end" snaps before it. Used to restore the textarea selection after recolor.
 */
export function textToMarkupOffset(
    line: string,
    textOffset: number,
    edge: "start" | "end"
): number {
    const tokens = tokenizeLine(line)
    let markupPos = 0
    for (const token of tokens) {
        if (token.kind === "text") {
            const ts = token.textStart
            const te = ts + token.textLen
            if (textOffset >= ts && textOffset <= te) {
                return markupPos + (textOffset - ts)
            }
            markupPos += token.raw.length
        } else {
            if (textOffset === token.textStart) {
                return edge === "start" ? markupPos + token.raw.length : markupPos
            }
            markupPos += token.raw.length
        }
    }
    return markupPos
}

function openFor(name: string, value?: string): string {
    return value ? `<${name}=${value}>` : `<${name}>`
}

function closeFor(name: string): string {
    return `</${name}>`
}

// The tags open strictly before `pos`: opening tags at `textPos < pos` and
// closing tags at `textPos <= pos`.
function stackBefore(tokens: MarkupToken[], pos: number): MarkupToken[] {
    const stack: MarkupToken[] = []
    for (const token of tokens) {
        if (token.kind !== "tag") continue
        const p = token.textStart
        if (!token.isClose) {
            if (p < pos) stack.push(token)
        } else if (p <= pos) {
            stack.pop()
        }
    }
    return stack
}

function closeStack(stack: MarkupToken[]): string {
    let out = ""
    for (let i = stack.length - 1; i >= 0; i--) out += closeFor(stack[i].name!)
    return out
}

function openStack(stack: MarkupToken[]): string {
    let out = ""
    for (const token of stack) out += openFor(token.name!, token.value)
    return out
}

/**
 * Returns the color (`#hex`, with the leading `#`) that covers the whole text
 * range `[s, e)`, or `null` when the range is empty, uncolored or spans
 * several colors. Nested colors report the innermost one.
 */
export function detectColorInRange(tokens: MarkupToken[], s: number, e: number): string | null {
    if (s >= e) return null
    const colorStack: string[] = []
    let detected: string | null = null
    let first = true
    for (const token of tokens) {
        if (token.kind === "tag") {
            if (token.name === "color") {
                if (!token.isClose && token.value) colorStack.push(token.value)
                else if (token.isClose) colorStack.pop()
            }
            continue
        }
        const ts = token.textStart
        const te = ts + token.textLen
        if (te <= s || ts >= e) continue
        const active = colorStack.length ? colorStack[colorStack.length - 1] : null
        if (first) {
            detected = active
            first = false
        } else if (detected !== active) {
            return null
        }
    }
    return detected
}

/**
 * Recolors the visible text `[s, e)` of a tokenized line with `hex`
 * (e.g. "#135c5a"). Text before/after the range keeps its exact markup; the
 * selected text is wrapped in `<color=hex>` preserving non-color formatting.
 */
export function recolorLine(tokens: MarkupToken[], s: number, e: number, hex: string): string {
    if (s >= e) return tokens.map((token) => token.raw).join("")

    const contextS = stackBefore(tokens, s)
    const contextE = stackBefore(tokens, e)
    const nonColorS = contextS.filter((token) => token.name !== "color")
    const bStack: MarkupToken[] = [...nonColorS]

    let before = ""
    let selected = ""
    let after = ""

    for (const token of tokens) {
        if (token.kind === "text") {
            const ts = token.textStart
            const te = ts + token.textLen
            const preEnd = Math.min(te, s)
            if (ts < preEnd) before += token.raw.slice(0, preEnd - ts)
            const selStart = Math.max(ts, s)
            const selEnd = Math.min(te, e)
            if (selStart < selEnd) selected += token.raw.slice(selStart - ts, selEnd - ts)
            const postStart = Math.max(ts, e)
            if (postStart < te) after += token.raw.slice(postStart - ts, te - ts)
        } else {
            const p = token.textStart
            const region = !token.isClose
                ? p < s
                    ? "a"
                    : p < e
                      ? "b"
                      : "c"
                : p <= s
                  ? "a"
                  : p <= e
                    ? "b"
                    : "c"
            if (region === "a") {
                before += token.raw
            } else if (region === "c") {
                after += token.raw
            } else if (token.name !== "color") {
                if (!token.isClose) {
                    selected += token.raw
                    bStack.push(token)
                } else {
                    const index = bStack.map((t) => t.name).lastIndexOf(token.name)
                    if (index !== -1) {
                        bStack.splice(index)
                        selected += token.raw
                    }
                }
            }
        }
    }

    return (
        before +
        closeStack(contextS) +
        `<color=${hex}>` +
        openStack(nonColorS) +
        selected +
        closeStack(bStack) +
        `</color>` +
        openStack(contextE) +
        after
    )
}
