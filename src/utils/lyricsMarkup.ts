/**
 * Utilities to convert Clone Hero (TextMeshPro) lyric markup into safe HTML
 * for the rich-text editor of the lyrics view.
 *
 * Only tags that do not change the line box are rendered, so the editor stays
 * aligned with the syllables / line-number columns. Everything else is escaped
 * and shown as literal text.
 */

const TAG_REGEX = /(<[^>]*>)/g

// Internal marker used in the plain lyrics text to represent an "=" that belongs
// to a single syllable (e.g. the single event `lyric A=B`). A trailing "=" that
// joins two events is kept as a literal "=". The marker is a private-use Unicode
// char that cannot appear in real charts.
export const INTERNAL_EQUALS = "\uE000"
const INTERNAL_EQUALS_REGEX = /[\uE000]/g

// Tags rendered as plain HTML elements (opening/closing pairs).
const HTML_TAGS = ["i", "b", "s", "u"] as const

// Tags rendered as <span> with a CSS class.
const SPAN_TAGS = {
    lowercase: "lowercase",
    uppercase: "uppercase",
    smallcaps: "smallcaps",
} as const

// Tags rendered as <span> with inline styles.
function valueStyle(tag: string, value: string): string | null {
    switch (tag) {
        case "color":
            return isValidColor(value)
                ? `data-tmp="color" data-tmp-value="${value}" style="color:${value}"`
                : null
        case "cspace":
            return isValidLength(value)
                ? `data-tmp="cspace" data-tmp-value="${value.trim()}" style="letter-spacing:${formatLength(value)}"`
                : null
        case "mspace":
            return isValidLength(value)
                ? `data-tmp="mspace" data-tmp-value="${value.trim()}" style="letter-spacing:${formatLength(value)}"`
                : null
        default:
            return null
    }
}

function isValidColor(value: string): boolean {
    const color = value.trim()
    const namedColors = ["black", "blue", "green", "orange", "purple", "red", "white", "yellow"]
    return (
        /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(color) ||
        namedColors.includes(color.toLowerCase())
    )
}

function isValidLength(value: string): boolean {
    return /^-?\d+(\.\d+)?(px|em)?$/.test(value.trim())
}

function formatLength(value: string): string {
    const trimmed = value.trim()
    return /(px|em)$/.test(trimmed) ? trimmed : `${trimmed}px`
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

// Wraps text that contains underscores (joined syllables) or the internal-equals
// marker in a highlighted span. Underscores become spaces; the internal marker
// becomes a literal "=" so the user sees the full syllable.
function markJoinedInText(text: string): string {
    return text.replace(/(\S+)/g, (match) => {
        if (!match.includes("_") && !match.includes(INTERNAL_EQUALS)) return match
        return `<span class="joined">${match
            .replace(/_/g, " ")
            .replace(INTERNAL_EQUALS_REGEX, "=")}</span>`
    })
}

function isHtmlTag(name: string): name is (typeof HTML_TAGS)[number] {
    return (HTML_TAGS as readonly string[]).includes(name)
}

function isSpanTag(name: string): name is keyof typeof SPAN_TAGS {
    return name in SPAN_TAGS
}

function closeFor(name: string): string {
    return isHtmlTag(name) ? `</${name}>` : "</span>"
}

function openFor(name: string, value: string): string | null {
    if (isHtmlTag(name)) return `<${name}>`
    const style = valueStyle(name, value)
    if (style !== null) return `<span ${style}>`
    if (isSpanTag(name)) return `<span class="${SPAN_TAGS[name]}">`
    return null
}

function renderLine(line: string): string {
    const stack: string[] = []
    let result = ""

    for (const token of line.split(TAG_REGEX)) {
        if (!token) continue

        if (token.startsWith("<") && token.endsWith(">")) {
            const inner = token.slice(1, -1)
            const isClosing = inner.startsWith("/")
            const body = isClosing ? inner.slice(1) : inner
            const nameMatch = body.match(/^([a-z]+)/i)

            if (!nameMatch) {
                result += escapeHtml(token)
                continue
            }

            const name = nameMatch[1].toLowerCase()
            const value = body
                .slice(nameMatch[1].length)
                .replace(/^[=:\s]+/, "")
                .replace(/^["']|["']$/g, "")

            if (isClosing) {
                const index = stack.lastIndexOf(name)
                if (index === -1) {
                    // Unmatched closing tag: keep it as literal text
                    result += escapeHtml(token)
                    continue
                }
                while (stack.length > index) result += closeFor(stack.pop()!)
                continue
            }

            const open = openFor(name, value)
            if (open === null) {
                // Not a renderable tag: keep it as literal text
                result += escapeHtml(token)
                continue
            }
            stack.push(name)
            result += open
        } else {
            result += markJoinedInText(escapeHtml(token))
        }
    }

    // Close any tags left open at the end of the line
    while (stack.length) result += closeFor(stack.pop()!)

    return result
}

/**
 * Converts a plain lyrics string (TMP markup + `_` joined syllables) into safe
 * HTML for the rich-text overlay. Tags are closed per line so formatting never
 * bleeds across lines.
 */
export function renderMarkup(text: string): string {
    return text.split("\n").map(renderLine).join("\n")
}

/**
 * Converts a plain lyrics string into HTML for the contenteditable rich-text
 * editor. Every `\n` becomes a block element so lines map cleanly to the
 * plain-text representation.
 */
export function renderEditableHtml(text: string): string {
    return text
        .split("\n")
        .map((line) => (line === "" ? "<div><br></div>" : `<div>${renderLine(line)}</div>`))
        .join("")
}

function inlineChildren(el: Element): string {
    let out = ""
    for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) out += child.textContent ?? ""
        else if (child.nodeType === Node.ELEMENT_NODE) out += inline(child as HTMLElement)
    }
    return out
}

function inline(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase()

    if (tag === "b" || tag === "strong") return `<b>${inlineChildren(el)}</b>`
    if (tag === "i" || tag === "em") return `<i>${inlineChildren(el)}</i>`
    if (tag === "s") return `<s>${inlineChildren(el)}</s>`
    if (tag === "u") return `<u>${inlineChildren(el)}</u>`

    if (tag === "span") {
        const cls = typeof el.className === "string" ? el.className : ""
        if (cls.split(/\s+/).includes("joined")) {
            // A joined syllable: spaces are literal space markers and any "=" in
            // the text content is an internal equals (single syllable). Tags are
            // protected so their own attributes (e.g. <color=red>) stay intact.
            return inlineChildren(el)
                .replace(/(<[^>]*>)/g, (match) => `\uE001${match}\uE002`)
                .replace(/=/g, INTERNAL_EQUALS)
                .replace(/\s+/g, "_")
                .replace(/\uE002/g, "")
                .replace(/\uE001/g, "")
        }

        const tmpTag = el.getAttribute("data-tmp")
        if (tmpTag) {
            const tmpValue = el.getAttribute("data-tmp-value")
            return `<${tmpTag}=${tmpValue}>${inlineChildren(el)}</${tmpTag}>`
        }

        const spanClass = Object.entries(SPAN_TAGS).find(([, className]) =>
            cls.split(/\s+/).includes(className)
        )
        if (spanClass) return `<${spanClass[0]}>${inlineChildren(el)}</${spanClass[0]}>`

        // Unknown span: strip the tag but keep its content
        return inlineChildren(el)
    }

    // Unknown inline element (font, mark, etc.): strip the tag but keep content
    return inlineChildren(el)
}

function serializeEditableHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html")
    const lines: string[] = []
    let current = ""

    const flushBlock = () => {
        lines.push(current)
        current = ""
    }

    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            current += node.textContent ?? ""
            return
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return

        const tag = (node as HTMLElement).tagName.toLowerCase()

        if (tag === "div" || tag === "p") {
            let hadBreak = false
            for (const child of Array.from(node.childNodes)) {
                if (
                    child.nodeType === Node.ELEMENT_NODE &&
                    (child as HTMLElement).tagName.toLowerCase() === "br"
                ) {
                    hadBreak = true
                    flushBlock()
                } else {
                    walk(child)
                }
            }
            // A block without any <br> always ends its own line (even if empty).
            // A block ending with <br> already flushed its last line via the break.
            if (!hadBreak || current !== "") flushBlock()
            return
        }

        if (tag === "br") {
            flushBlock()
            return
        }

        current += inline(node as HTMLElement)
    }

    for (const child of Array.from(doc.body.childNodes)) walk(child)
    if (current !== "") flushBlock()

    return lines.join("\n")
}

export { serializeEditableHtml }

/**
 * Toggles an opening/closing pair of tags around a selected piece of text.
 */
export function toggleTag(selected: string, tag: string): string {
    const open = `<${tag}>`
    const close = `</${tag}>`
    if (selected.startsWith(open) && selected.endsWith(close)) {
        return selected.slice(open.length, -close.length)
    }
    return `${open}${selected}${close}`
}

/**
 * Joins the words of a selection into a single syllable, using the chart's
 * `_` marker for a literal space inside a syllable.
 */
export function joinSyllables(selection: string): string {
    return selection.replace(/\s+/g, "_")
}
