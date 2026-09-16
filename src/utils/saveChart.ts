import { compareEventPriority, isLyricEvent } from "./auxFunctions"
import { parseChart } from "./parseChart"
import { saveChartEventsOnly } from "./patchChartEvents"
import { INTERNAL_EQUALS } from "./lyricsMarkup"

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

    const splitPhrase = (phrase: string) => {
        // Tags (e.g. <color=red>) contain "=" in their attributes, which must not
        // be treated as syllable separators. Replace each tag with a placeholder
        // that has no separator characters, split, then restore the tags.
        const tags = new Map<string, string>()
        let tagIndex = 0
        const protectedPhrase = phrase.replace(/(<[^>]*>)/g, (tag) => {
            const key = `\uE001${tagIndex++}\uE002`
            tags.set(key, tag)
            return key
        })

        return protectedPhrase
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
            .map((token) => token.replace(/\uE001\d+\uE002/g, (key) => tags.get(key) ?? key))
    }

    for (const eventList of Object.values(events)) {
        const eventsToProcess =
            eventList.length > 1 ? [...eventList].sort(compareEventPriority) : eventList
        for (const event of eventsToProcess) {
            if (event.name === "phrase_start") {
                currentPhrase = getNextNonEmptyPhrase()
            } else if (isLyricEvent(event)) {
                // Restore internal equals markers so a single event stays one syllable
                const syllable = currentPhrase
                    .shift()
                    ?.replace(new RegExp(INTERNAL_EQUALS, "g"), "=")
                event.name = "lyric " + syllable
            }
        }
    }

    await saveChartEventsOnly(events, path)
    console.log("Chart saved")
}
