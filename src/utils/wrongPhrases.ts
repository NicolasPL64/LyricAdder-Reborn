import { removeTrailingEmptyElements } from "./auxFunctions"

/**
 * Identifies lines with incorrect syllable counts compared to the chart.
 * @param sylArray The array of expected syllable counts.
 * @param lyricsText The array of current lyric lines.
 * @returns An array with the indices of the lines that have a different syllable count than the chart
 */
export function wrongPhrases(sylArray: string[], lyricsText: string[]) {
    lyricsText = removeTrailingEmptyElements(lyricsText)
    lyricsText.push("") // Makes it so the first syllables are always compared
    const highlightedArray: number[] = []

    lyricsText.forEach((_, i) => {
        if (!sylArray[i]) return
        const [currSyl, chartSyl] = sylArray[i].split("/")
        if (currSyl !== chartSyl) {
            highlightedArray.push(i)
        }
    })
    return highlightedArray
}
