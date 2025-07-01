import { fixTags, isLyricEvent } from "./auxFunctions"
import { Chart, ChartIO, type ChartEvent, type ChartTrack } from "./herochartio"
import { defaultSettings } from "./settings"

export type ParsedChart = { chartSyllablesCount: number[]; chartLyrics: string }
export type ParsedChartWithOriginal = { parsed: ParsedChart; original: Chart }

export async function parseChart(path: string): Promise<{ parsed: ParsedChart; original: any }> {
    const chart = await ChartIO.load(path)
    return { parsed: extractLyrics(chart.Events), original: chart }
}

/**
 * Extracts lyrics from a chart track and returns them in a structured format.
 * The function processes lyric events, section events, and phrase events to build
 * a list of lyrics with syllable counts.
 *
 * @param {ChartTrack<ChartEvent>} events - The chart track containing the events.
 * @returns {ParsedChart} An object containing the processed lyrics and syllable counts.
 */
function extractLyrics(events: ChartTrack<ChartEvent>): ParsedChart {
    const lyrics: string[] = []
    const syllablesCount: number[] = []
    let currentPhrase: string[] = []
    let syllables = 0
    let previousSyllableEndsWithHyphen = false
    let pendingSections = 0
    const maxSectionSeparators = parseInt(
        localStorage.getItem("maxSectionSeparators") ??
            defaultSettings.maxSectionSeparators.toString()
    )

    for (const eventList of Object.values(events)) {
        eventList.forEach((event) => {
            const lyricArray = event.name.split(" ").slice(1)

            if (isLyricEvent(event)) {
                handleLyricEvent(lyricArray.join(""))
            } else if (event.name.startsWith("section")) {
                handleSectionEvent()
            } else if (
                event.name.startsWith("phrase_start") ||
                event.name.startsWith("phrase_end")
            ) {
                handlePhraseEvent()
            }
        })
    }

    // For handling the very last phrase if not closed by a phrase_end event already
    if (currentPhrase.length > 0) {
        pendingSections = 0
        handlePhraseEvent()
    }

    return {
        chartLyrics: fixTags(lyrics.join("")),
        chartSyllablesCount: syllablesCount,
    }

    // TODO: Put events that contain spaces (multiple syllables in one) in a <span> tag
    // Maybe even use a custom class like "multi-syllable" to better classify them in case other <span> tags are needed in the future?
    function handleLyricEvent(syllableText: string) {
        // If the previous syllable did not end with a hyphen, add a space before the new lyric
        // Then add the new syllable
        if (!previousSyllableEndsWithHyphen && currentPhrase.length > 0) {
            currentPhrase.push(" ")
        }
        currentPhrase.push(syllableText)

        // If the lyric ends with a hyphen or equals sign, it is considered a syllable separator
        if (syllableText.endsWith("-") || syllableText.endsWith("=")) {
            previousSyllableEndsWithHyphen = true
        } else {
            previousSyllableEndsWithHyphen = false
        }

        syllables++
    }

    function handleSectionEvent() {
        if (pendingSections < maxSectionSeparators && lyrics.length > 0) {
            pendingSections++
        }
    }

    // TODO: What happens when there are multiple sections befure the first phrase_start?
    function handlePhraseEvent() {
        if (currentPhrase.length === 0) return

        // Chooses to add either a section break (<p>) or just a line break (<br>)
        if (pendingSections > 0 && lyrics.length > 0) {
            for (let i = 0; i < pendingSections; i++) {
                lyrics.push("<p>")
            }
            pendingSections = 0
        } else if (lyrics.length > 0) {
            lyrics.push("<br>")
        }

        lyrics.push(currentPhrase.join("").trim())
        syllablesCount.push(syllables)

        // Reset
        currentPhrase = []
        syllables = 0
        previousSyllableEndsWithHyphen = false
    }
}

/* 
function extractLyricsOld(events: ChartTrack<ChartEvent>): ParsedChart {
    const lyrics: string[] = []
    const syllablesCount: number[] = []
    let currentPhrase: string[] = []
    let syllables = 0
    let previousLyricEndsWithHyphen = false
    let sectionsSpaceCount = 0
    const maxSectionSeparators = parseInt(
        localStorage.getItem("maxSectionSeparators") ??
            defaultSettings.maxSectionSeparators.toString()
    )
    // Variable marcadora para secciones pendientes
    let pendingSection = false

    for (const eventList of Object.values(events)) {
        eventList.forEach((event) => {
            //FIXME: Bug with 'Berried Alive - Crusty'
            //FIXME: If there is a = symbol in the middle of an event, it will be always considered a syllable separator
            if (
                lyrics.length > 0 &&
                sectionsSpaceCount < maxSectionSeparators &&
                event.name.startsWith("section")
            ) {
                pendingSection = true
                sectionsSpaceCount++
                // WARN: What happens if there are two phrase_start events in a row? A: error in console
            } else if (event.name === "phrase_start" && currentPhrase.length > 0) {
                // Save the phrase
                lyrics.push(currentPhrase.join(" ").trim())
                if (pendingSection) {
                    for (let i = 0; i < sectionsSpaceCount; i++) {
                        lyrics.push("<p>&nbsp;</p>")
                    }
                    pendingSection = false
                } else lyrics.push("<br>")

                syllablesCount.push(syllables)
                // Reset variables for the next phrase
                currentPhrase = []
                syllables = 0
                sectionsSpaceCount = 0
                previousLyricEndsWithHyphen = false
                // Reiniciamos también la marca de sección pendiente
                pendingSection = false
            } else if (isLyricEvent(event)) {
                // Si hay una sección pendiente, agregamos el separador ahora

                const lyricArray = event.name.split(" ")
                let lyricText = ""

                // In case there is a space in the middle of the event
                if (lyricArray.length > 2) lyricText = lyricArray.slice(1).join("§")
                else lyricText = lyricArray[1] ?? ""
                syllables++
                if (previousLyricEndsWithHyphen) {
                    currentPhrase[currentPhrase.length - 1] += lyricText
                    previousLyricEndsWithHyphen = false
                } else {
                    currentPhrase.push(lyricText)
                }
                previousLyricEndsWithHyphen = lyricText.endsWith("-") || lyricText.endsWith("=")
            }
        })
    }

    // Add last phrase
    if (currentPhrase.length > 0) {
        lyrics.push(currentPhrase.join(" ").trim())
        syllablesCount.push(syllables)
    }

    return {
        chartLyrics: removeTrailingEmptyElements(lyrics).join(""),
        chartSyllablesCount: syllablesCount,
    }
}
 */
