import { INTERNAL_EQUALS, isTagToken, protectMarkupTags, TAG_REGEX } from "./lyricsMarkup"

// Characters that are structurally meaningful in the chart syntax and must
// never be removed as "trailing punctuation": "_" marks a literal space inside
// a syllable, "=" and "-" tie/separate syllables, and INTERNAL_EQUALS is the
// internal marker for an equals that belongs to one syllable.
const STRUCTURAL_CHARS = new Set(["_", "=", "-", INTERNAL_EQUALS])

// Apostrophe characters that get unified into the configured target.
const APOSTROPHE_VARIANTS = ["'", "’", "ʼ", "´", "′", "׳"]

// Unicode space characters (excluding line breaks and FEFF) normalized to a
// regular space.
const UNICODE_SPACES_REGEX = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/gu

// Invisible / zero-width characters that break rendering and alignment.
const INVISIBLE_CHARS_REGEX = /[\u200B-\u200F\u2060\uFEFF]/gu

// This character "…"
const ELLIPSIS_CHAR = "\u2026"

export const ELLIPSIS_DIRECTION_VALUES = ["unicodeToAscii", "asciiToUnicode"] as const
export type EllipsisDirection = (typeof ELLIPSIS_DIRECTION_VALUES)[number]

export const ELLIPSIS_DIRECTIONS: { value: EllipsisDirection; label: string }[] = [
    { value: "unicodeToAscii", label: "… → ..." },
    { value: "asciiToUnicode", label: "... → …" },
]

export const APOSTROPHE_OPTIONS: { value: string; label: string }[] = [
    { value: "'", label: "' (apostrophe)" },
    { value: "’", label: "’ (right single quotation mark)" },
    { value: "ʼ", label: "ʼ (modifier letter apostrophe)" },
]

export interface NormalizeOptions {
    capitalize: boolean
    trailingPunctuation: boolean
    trailingPunctuationChars: string
    apostrophes: boolean
    apostropheTarget: string
    unicodeSpaces: boolean
    ellipsis: boolean
    ellipsisDirection: EllipsisDirection
    invisible: boolean
    nfc: boolean
}

/**
 * Capitalizes the first alphanumeric character of every line, skipping markup
 * tags and non-alphanumeric symbols. If the first alphanumeric character is a
 * number, the line is left untouched.
 */
export function capitalizeLines(text: string): string {
    return text.split("\n").map(capitalizeFirstAlphanumeric).join("\n")
}

function capitalizeFirstAlphanumeric(line: string): string {
    let index = 0
    for (const token of line.split(TAG_REGEX)) {
        if (!token) continue
        if (isTagToken(token)) {
            index += token.length
            continue
        }
        for (const char of token) {
            if (/^\p{L}$/u.test(char)) {
                return line.slice(0, index) + char.toUpperCase() + line.slice(index + char.length)
            }
            if (/^\p{N}$/u.test(char)) {
                return line
            }
            index += char.length
        }
    }
    return line
}

/**
 * Removes the configured characters from the end of every line, ignoring markup
 * tags. A trailing run of dots is kept only when it is exactly three dots
 * (e.g. "..."): longer runs are trimmed to three and shorter runs are removed.
 * Structural chart characters ("_", "=", "-", the internal equals marker) are
 * never removed.
 */
export function removeTrailingPunctuation(text: string, chars: string): string {
    const set = new Set(chars)
    return text
        .split("\n")
        .map((line) => stripLineTrailingPunctuation(line, set))
        .join("\n")
}

function stripLineTrailingPunctuation(line: string, set: Set<string>): string {
    const tokens = line.split(TAG_REGEX).filter((token) => token !== "")
    let index = tokens.length - 1
    while (index >= 0) {
        const token = tokens[index]
        if (isTagToken(token)) {
            index--
            continue
        }
        const stripped = stripSuffixChars(token, set)
        if (stripped.length === token.length) break
        tokens[index] = stripped
        index--
    }
    return tokens.join("")
}

function stripSuffixChars(token: string, set: Set<string>): string {
    let end = token.length
    while (end > 0) {
        const char = token[end - 1]
        if (STRUCTURAL_CHARS.has(char) || !set.has(char)) break
        if (char !== ".") {
            end--
            continue
        }
        let dotStart = end
        while (dotStart > 0 && token[dotStart - 1] === ".") dotStart--
        const dotCount = end - dotStart
        if (dotCount < 3) {
            // Fewer than three trailing dots: remove them all and keep stripping.
            end = dotStart
            continue
        }
        // A run of three or more trailing dots stays as exactly three dots.
        return token.slice(0, dotStart) + "..."
    }
    return token.slice(0, end)
}

/**
 * Unifies every apostrophe variant into the configured target character.
 * Markup tags are protected so apostrophes inside tag attributes survive.
 */
export function normalizeApostrophes(text: string, target: string): string {
    const regex = new RegExp(`[${APOSTROPHE_VARIANTS.join("")}]`, "gu")
    return protectMarkupTags(text, (protectedText) => protectedText.replace(regex, target))
}

/**
 * Replaces exotic Unicode space characters with a regular space. Line breaks
 * are never touched.
 */
export function normalizeUnicodeSpaces(text: string): string {
    return text.replace(UNICODE_SPACES_REGEX, " ")
}

/**
 * Normalizes ellipses: "…" to "..." or "..." to "…" depending on the direction.
 * Markup tags are protected so dots inside tag attributes survive.
 */
export function normalizeEllipsis(text: string, direction: EllipsisDirection): string {
    return protectMarkupTags(text, (protectedText) => {
        if (direction === "asciiToUnicode") return protectedText.replace(/\.\.\./g, ELLIPSIS_CHAR)
        return protectedText.replace(new RegExp(ELLIPSIS_CHAR, "gu"), "...")
    })
}

/**
 * Removes invisible / zero-width characters (e.g. U+200B, U+FEFF) that break
 * rendering and alignment.
 */
export function removeInvisibleCharacters(text: string): string {
    return text.replace(INVISIBLE_CHARS_REGEX, "")
}

/**
 * Unifies decomposed accented characters into their precomposed form (e.g.
 * "e" + combining accent → "é"). Safe on markup and structural characters,
 * which are all ASCII or private-use and unaffected by NFC.
 */
export function normalizeNfc(text: string): string {
    return text.normalize("NFC")
}

/**
 * Applies every enabled normalization to the whole text, in a stable order.
 * Each step is idempotent, so running it on an already-normalized text changes
 * nothing.
 */
export function normalizeLyrics(text: string, options: NormalizeOptions): string {
    let result = text
    if (options.invisible) result = removeInvisibleCharacters(result)
    if (options.nfc) result = normalizeNfc(result)
    if (options.unicodeSpaces) result = normalizeUnicodeSpaces(result)
    if (options.apostrophes) result = normalizeApostrophes(result, options.apostropheTarget)
    if (options.ellipsis) result = normalizeEllipsis(result, options.ellipsisDirection)
    if (options.trailingPunctuation)
        result = removeTrailingPunctuation(result, options.trailingPunctuationChars)
    if (options.capitalize) result = capitalizeLines(result)
    return result
}

export function needsNormalization(text: string, options: NormalizeOptions): boolean {
    return normalizeLyrics(text, options) !== text
}
