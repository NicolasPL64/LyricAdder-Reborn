import { isLyricEvent, sortEventsByPriority } from "./auxFunctions"
import { parseChart } from "./parseChart"
import { saveChartEventsOnly } from "./patchChartEvents"
import { INTERNAL_EQUALS_REGEX, protectMarkupTags } from "./lyricsMarkup"

export async function parseLyricsToChart(lyrics: string[], path: string) {
    const chart = await parseChart(path)
    const events = chart.original.Events

    let currentPhraseIndex = -1
    let currentPhrase: string[] = []

    const getNextNonEmptyPhrase = () => {
        do {
            currentPhraseIndex++
        } while (lyrics[currentPhraseIndex]?.trim() === "")
        return splitPhrase(lyrics[currentPhraseIndex].trim())
    }

    // Tags (e.g. <color=red>) contain "=" in their attributes, which must not
    // be treated as syllable separators. They are protected with placeholders
    // before splitting and restored afterwards.
    const splitPhrase = (phrase: string) =>
        protectMarkupTags(phrase, (protectedPhrase) =>
            protectedPhrase
                .replace(/\s+/g, " ") // Replace multiple spaces with a single space
                .split(/([ =-])/)
                .reduce((acc, curr, index) => {
                    if (index % 2 !== 0 && curr !== " ") {
                        acc[acc.length - 1] += curr // Concatenate separator with previous element
                    } else if (index % 2 === 0) {
                        acc.push(curr) // Add new word
                    }
                    return acc
                }, [] as string[])
        )

    for (const eventList of Object.values(events)) {
        const eventsToProcess = sortEventsByPriority(eventList)
        for (const event of eventsToProcess) {
            if (event.name === "phrase_start") {
                currentPhrase = getNextNonEmptyPhrase()
            } else if (isLyricEvent(event)) {
                // Restore internal equals markers so a single event stays one syllable
                const syllable = currentPhrase.shift()?.replace(INTERNAL_EQUALS_REGEX, "=")
                event.name = "lyric " + syllable
            }
        }
    }

    await saveChartEventsOnly(events, path)
}
