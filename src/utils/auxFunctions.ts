import type { ChartEvent } from "./herochartio"

export function isLyricEvent(event: ChartEvent): boolean {
    return (
        (event.name.startsWith("lyric") || event.name.startsWith("Default")) && event.type === "E"
    )
}

/**
 * Removes trailing empty elements from an array of strings.
 * This function is useful for cleaning up arrays that may have
 * unnecessary empty strings or <br> tags at the end.
 *
 * @param {string[]} arr - The array of strings to clean.
 * @returns {string[]} - The cleaned array with trailing empty elements removed.
 */
export function removeTrailingEmptyElements(arr: string[]): string[] {
    while (
        arr.length > 0 &&
        (arr[arr.length - 1].trim() === "" || arr[arr.length - 1] === "<br>")
    ) {
        arr.pop()
    }
    return arr
}

/**
 * Fixes HTML tags in the lyrics by ensuring that inline tags are properly closed
 * before line breaks and paragraph breaks, while keeping the original structure intact.
 *
 * @author Copilot
 * @param {string} html - The HTML string containing the lyrics.
 * @returns {string} - The fixed HTML string with properly closed tags.
 */
export function fixTags(html: string): string {
    // Helper function to extract tag name (without attributes)
    function getTagName(tagString: string): string {
        const match = tagString.match(/<\/?([a-zA-Z][a-zA-Z0-9]*)/)
        return match ? match[1].toLowerCase() : ""
    }

    // Function to close tags before <br> and <p>
    function closeTagsBeforeBreaks(html: string): string {
        const breakTags = ["br", "p"]
        const inlineTags = ["i", "b", "span", "strong", "em", "u", "small", "mark"]

        // Split HTML into tokens (tags and text)
        const tokens = html.split(/(<[^>]*>)/)
        const result: string[] = []
        const openTags: string[] = [] // Stack of open tags

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]

            if (token.startsWith("<")) {
                const tagName = getTagName(token)

                if (token.startsWith("</")) {
                    // Closing tag
                    const index = openTags.lastIndexOf(tagName)
                    if (index !== -1) {
                        openTags.splice(index, 1)
                    }
                    result.push(token)
                } else if (token.endsWith("/>")) {
                    // Self-closing tag
                    result.push(token)
                } else if (breakTags.includes(tagName)) {
                    // It's a <br> or <p> - close open inline tags
                    const tagsToClose = [...openTags].filter((tag) => inlineTags.includes(tag))

                    // Close tags in LIFO order
                    for (let j = tagsToClose.length - 1; j >= 0; j--) {
                        result.push(`</${tagsToClose[j]}>`)
                    }

                    // Clear the closed tags from the stack
                    openTags.length = 0

                    result.push(token)

                    // Do NOT reopen the tags - this was the key difference
                } else {
                    // Normal opening tag
                    if (inlineTags.includes(tagName)) {
                        openTags.push(tagName)
                    }
                    result.push(token)
                }
            } else {
                // Normal text
                result.push(token)
            }
        }

        // Close tags that remained open at the end
        for (let i = openTags.length - 1; i >= 0; i--) {
            if (inlineTags.includes(openTags[i])) {
                result.push(`</${openTags[i]}>`)
            }
        }

        return result.join("")
    }

    return closeTagsBeforeBreaks(html)
}

export function replaceMultiSyllableSpans(html: string): string {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    doc.body.querySelectorAll("span.multi-syllable").forEach((el) => {
        el.replaceWith(document.createTextNode("a"))
    })

    return doc.body.innerHTML
}
