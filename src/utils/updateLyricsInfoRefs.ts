import { removeTrailingEmptyElements, replaceMultiSyllableSpans } from "./auxFunctions"
import type { ParsedChart } from "./parseChart"

/**
 * Returns an HTML string with line numbers for each line of lyrics.
 * Each line of lyrics is separated by either <br> tags or <p> tags.
 *
 * @param {string} lyricsHtml - The HTML string containing lyrics.
 * @returns {string} - The HTML string with line numbers.
 */
export function updateLineNumbers(lyricsHtml: string): string {
    //FIXME: When doing "enter, shift+enter, <text>", this function doesnt work properly
    // Only for the first phrase (not critical)

    if (lyricsHtml === "") return "<p>1</p>"

    let lineNumber = 1

    // Replace empty paragraphs with a <br> tag
    lyricsHtml = lyricsHtml.replace(/<p><\/p>/g, "<p><br></p>")

    const paragraphRegex = /<p>(.*?)<\/p>/gs
    const anyHtmlTagRegex = /<[^>]*>/g

    const result = lyricsHtml.replace(paragraphRegex, (_, innerContent: string) => {
        /* HTML Tag Processing
         * This section handles HTML content cleaning:
         * 1. We need to preserve <br> tags as they represent line breaks
         * 2. All other HTML tags should be removed to avoid counting them
         * 3. We use a temporary marker (###BR###) to protect <br> tags during cleaning
         */
        let cleanedContent = innerContent
        cleanedContent = cleanedContent.replace(/<br>/g, "###BR###")
        cleanedContent = cleanedContent.replace(anyHtmlTagRegex, "")
        cleanedContent = cleanedContent.replace(/###BR###/g, "<br>")

        /* Content Processing
         * After cleaning the HTML, we:
         * 1. Split the content by <br> tags to identify line breaks
         * 2. For each text segment between breaks, replace with a line number
         * 3. Each non-empty text segment gets a consecutive line number
         * 4. Empty segments and <br> tags are preserved as-is
         */
        const parts = cleanedContent.split(/(<br>)/)
        const updatedParts = parts.map((part: string) => {
            if (part === "<br>") {
                return part
            } else if (part.trim()) {
                return lineNumber++
            }
            return part
        })

        return `<p>${updatedParts.join("")}</p>`
    })

    // Adds an empty paragraph at the end to avoid scroll syncing issues
    return result + "<p></p>"
}

function extractPhrasesFromHtml(html: string): string[] {
    if (html === "") return []

    const phrases: string[] = []

    // Replace empty paragraphs with a <br> tag (same logic as updateLineNumbers)
    html = html.replace(/<p><\/p>/g, "<p><br></p>")

    const paragraphRegex = /<p>(.*?)<\/p>/gs
    const anyHtmlTagRegex = /<[^>]*>/g

    html.replace(paragraphRegex, (_, innerContent: string) => {
        // Clean HTML tags but preserve <br> tags (same logic as updateLineNumbers)
        let cleanedContent = innerContent
        cleanedContent = cleanedContent.replace(/<br>/g, "###BR###")
        cleanedContent = cleanedContent.replace(anyHtmlTagRegex, "")
        cleanedContent = cleanedContent.replace(/###BR###/g, "<br>")

        // Split by <br> tags to get individual phrases
        const parts = cleanedContent.split(/(<br>)/)

        parts.forEach((part: string) => {
            if (part === "<br>") {
                phrases.push(part)
            } else {
                phrases.push(part.trim())
            }
        })

        return "" // We don't need the return value, just processing
    })
    return phrases
}

// Concatenates the syllable count of the current lyrics with the syllable count of the chart
export function updateSyllableCount(chart: ParsedChart, lyricsInputHtml: string): string {
    if (!chart?.chartSyllablesCount) return ""
    let sanitized = replaceMultiSyllableSpans(lyricsInputHtml)

    // Replace empty paragraphs with a <br> tag
    sanitized = sanitized.replace(/<p><\/p>/g, "<p><br></p>")

    const paragraphRegex = /<p>(.*?)<\/p>/gs
    const anyHtmlTagRegex = /<[^>]*>/g

    let index = 0
    let result = sanitized.replace(paragraphRegex, (_, innerContent: string) => {
        /* HTML Tag Processing
         * This section handles HTML content cleaning:
         * 1. We need to preserve <br> tags as they represent line breaks
         * 2. All other HTML tags should be removed to avoid counting them
         * 3. We use a temporary marker (###BR###) to protect <br> tags during cleaning
         */
        let cleanedContent = innerContent
        cleanedContent = cleanedContent.replace(/<br>/g, "###BR###")
        cleanedContent = cleanedContent.replace(anyHtmlTagRegex, "")
        cleanedContent = cleanedContent.replace(/###BR###/g, "<br>")

        /* Content Processing
         * After cleaning the HTML, we:
         * 1. Split the content by <br> tags to identify line breaks
         * 2. For each text segment between breaks, replace with a line number
         * 3. Each non-empty text segment gets a consecutive line number
         * 4. Empty segments and <br> tags are preserved as-is
         */
        const parts = removeTrailingEmptyElements(cleanedContent.split(/(<br>)/))

        // Since removeTrailingEmptyElements() removes trailing empty elements,
        // the "sections separators" config option doesn't work properly without the following check:
        if (parts.length === 0) return "<p><br></p>"

        const updatedParts = parts.map((part: string) => {
            if (part === "<br>") {
                return part
            } else if (part.trim()) {
                const currentSyllables = countSyllables(part)
                const chartSyllables = chart.chartSyllablesCount[index] ?? "-1"
                index++
                return `${currentSyllables}/${chartSyllables}`
            }
        })

        return `<p>${updatedParts.join("")}`
    })

    // If there are more lines in the .chart than what it's written, append the remaining syllable counts
    if (index < chart.chartSyllablesCount.length) {
        for (index; index < chart.chartSyllablesCount.length; index++) {
            // If it's the first line, don't add a <br> tag
            if (index === 0) result += `0/${chart.chartSyllablesCount[index]}`
            else result += `<br>0/${chart.chartSyllablesCount[index]}`
        }
    }

    // Adds an empty paragraph at the end to avoid scroll desyncing issues
    return result + "<p></p>"
}

function mapChartSyllables(chart: ParsedChart, lines: string[]): string[] {
    lines = removeTrailingEmptyElements(lines)
    let emptyLines = 0
    const result = lines.map((line, index) => {
        if (line.trim() === "") {
            emptyLines++
            return ""
        }
        return (chart.chartSyllablesCount[index - emptyLines] ?? "-1").toString()
    })

    // If chart.chartSyllablesCount is longer than the number of lines, append the remaining counts
    const remainingCounts = chart.chartSyllablesCount
        .slice(lines.length - emptyLines)
        .map((count) => count.toString())
    return result.concat(remainingCounts)
}

function countSyllables(line: string): string {
    // Eliminate content inside HTML tags
    const cleanedLine = line.replace(/<[^>]*>/g, "")

    if (cleanedLine.trim().length === 0) {
        return "0"
    }

    const syllableCount = cleanedLine
        .split(/[ \-=]/) // Split by spaces, hyphens, and equal signs
        .filter(Boolean).length // Remove empty strings

    return syllableCount.toString()
}
