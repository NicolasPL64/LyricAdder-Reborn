import { removeTrailingEmptyElements } from "./auxFunctions"
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

    // console.log("lyricsHtml", lyricsHtml)
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
        // console.log("cleanedContent", cleanedContent)

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

// Concatenates the syllable count of the current lyrics with the syllable count of the chart
export function updateSyllableCount(chart: ParsedChart, lines: string[]) {
    if (!chart?.chartSyllablesCount) return ""

    const currentSyllables = countSyllables(lines)
    const chartSyllables = mapChartSyllables(chart, lines)

    if (chartSyllables.length >= currentSyllables.length)
        // If the original chart has more lines, shows the syllable count of the original chart
        // This way, the user can see how many syllables they're missing
        return chartSyllables
            .map((syllable, i) =>
                lines[i] === "" ? "\n" : `${currentSyllables[i] ?? 0}/${syllable ?? -1}\n`
            )
            .join("")
    // If the original chart has fewer lines, return the syllable count of the current lyrics
    // This way, the textarea won't be flooded with error lines
    else
        return currentSyllables
            .map((syllable, i) =>
                !chartSyllables[i] ? "\n" : `${syllable}/${chartSyllables[i]}\n`
            )
            .join("")
}

function mapChartSyllables(chart: ParsedChart, lines: string[]) {
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

function countSyllables(lines: string[]) {
    return lines.map((line) => {
        // Eliminate content inside HTML tags
        const cleanedLine = line.replace(/<[^>]*>/g, "")
        return cleanedLine.trim().length === 0
            ? "0"
            : cleanedLine
                  .split(/[ \-=]/) // Split by spaces, hyphens, and equal signs
                  .filter(Boolean) // Remove empty strings
                  .length.toString()
    })
}
