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
        const paragraphs = cleanedContent.split(/(<br>)/)
        const updatedParagraphs = paragraphs.map((phrase: string) => {
            if (phrase === "<br>") {
                return phrase
            } else if (phrase.trim()) {
                return lineNumber++
            }
            return phrase
        })

        return `<p>${updatedParagraphs.join("")}</p>`
    })

    // Adds an empty paragraph at the end to avoid scroll syncing issues
    return result + "<p></p>"
}

/**
 * Updates the syllable count in the lyrics input HTML based on the chart's syllable counts.
 * Each line of lyrics is replaced with a format "currentSyllables/chartSyllablesCount[index]".
 *
 * @param {ParsedChart} chart - The parsed chart containing syllable counts.
 * @param {string} lyricsInputHtml - The HTML string containing lyrics input.
 * @returns {string} - The updated HTML string with syllable counts.
 */
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
        const paragraphs = removeTrailingEmptyElements(cleanedContent.split(/(<br>)/))

        // Since removeTrailingEmptyElements() removes trailing empty elements,
        // the "sections separators" config option doesn't work properly without the following check:
        if (paragraphs.length === 0) return "<p><br></p>"

        const updatedParagraphs = paragraphs.map((phrase: string) => {
            if (phrase === "<br>") {
                return phrase
            } else if (phrase.trim()) {
                const currentSyllables = countSyllables(phrase)
                const chartSyllables = chart.chartSyllablesCount[index] ?? "-1"
                index++
                return `${currentSyllables}/${chartSyllables}`
            }
        })

        return `<p>${updatedParagraphs.join("")}`
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

/**
 * Counts the syllables in a phrase.
 * Syllables are counted based on spaces, hyphens, and equal signs.
 *
 * @param {string} line - The line of lyrics to count syllables in.
 * @returns {string} - The number of syllables as a string.
 */
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
