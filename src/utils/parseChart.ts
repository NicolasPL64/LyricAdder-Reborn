import { isLyricEvent, removeTrailingEmptyElements } from "./auxFunctions"
import { chartErrorMessages } from "./chartErrorMessages"
import { Chart, ChartIO, type ChartEvent, type ChartTrack } from "./herochartio"
import { defaultSettings } from "./settings"

export type ChartError = {
    message: string
    timestamps: number[]
}
export type ParsedChart = {
    chartSyllablesCount: number[]
    chartLyrics: string
    errors: ChartError[]
}
export type ParsedChartWithOriginal = { parsed: ParsedChart; original: Chart }

export async function parseChart(path: string): Promise<{ parsed: ParsedChart; original: any }> {
    const chart = await ChartIO.load(path)
    return { parsed: extractLyrics(chart.Events), original: chart }
}

export function extractLyrics(events: ChartTrack<ChartEvent>): ParsedChart {
    const lyrics: string[] = []
    const syllablesCount: number[] = []
    const errors: ChartError[] = []
    let currentPhrase: string[] = []
    let syllables = 0
    let previousLyricEndsWithHyphen = false
    let sectionsSpaceCount = 0
    let phraseOpen = false
    let phraseStartTick = 0
    const maxSectionSeparators = parseInt(
        localStorage.getItem("maxSectionSeparators") ??
            defaultSettings.maxSectionSeparators.toString()
    )

    const flushPhrase = () => {
        lyrics.push(currentPhrase.join(" ").trim())
        syllablesCount.push(syllables)
        currentPhrase = []
        syllables = 0
        sectionsSpaceCount = 0
        previousLyricEndsWithHyphen = false
    }

    for (const [time, eventList] of Object.entries(events)) {
        const tick = parseInt(time)
        for (const event of eventList) {
            //FIXME: Bug with 'Berried Alive - Crusty'
            //FIXME: If there is a = symbol in the middle of an event, it will be always considered a syllable separator
            if (
                lyrics.length > 0 &&
                sectionsSpaceCount < maxSectionSeparators &&
                event.name.startsWith("section")
            ) {
                lyrics.push("")
                sectionsSpaceCount++
            } else if (event.name === "phrase_start") {
                if (phraseOpen && currentPhrase.length > 0) {
                    // Save the phrase
                    flushPhrase()
                } else if (phraseOpen) {
                    errors.push({
                        message: chartErrorMessages.CONSECUTIVE_PHRASE_START,
                        timestamps: [phraseStartTick, tick],
                    })
                }
                phraseOpen = true
                phraseStartTick = tick
            } else if (event.name === "phrase_end") {
                if (!phraseOpen) {
                    errors.push({
                        message: chartErrorMessages.PHRASE_END_WITHOUT_OPEN_PHRASE,
                        timestamps: [tick],
                    })
                } else if (currentPhrase.length === 0) {
                    errors.push({
                        message: chartErrorMessages.PHRASE_END_WITHOUT_LYRICS,
                        timestamps: [tick],
                    })
                } else {
                    flushPhrase()
                }
                phraseOpen = false
            } else if (isLyricEvent(event)) {
                if (!phraseOpen) {
                    errors.push({
                        message: chartErrorMessages.LYRIC_WITHOUT_PHRASE_START,
                        timestamps: [tick],
                    })
                }
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
        }
    }

    // Add last phrase
    if (currentPhrase.length > 0) {
        flushPhrase()
    }
    if (phraseOpen) {
        errors.push({
            message: chartErrorMessages.MISSING_CLOSING_PHRASE_END,
            timestamps: [phraseStartTick],
        })
    }

    return {
        chartLyrics: removeTrailingEmptyElements(lyrics).join("\n"),
        chartSyllablesCount: syllablesCount,
        errors,
    }
}
