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

export async function parseChart(path: string): Promise<ParsedChartWithOriginal> {
    const chart = await ChartIO.load(path)
    const maxSectionSeparators = parseInt(
        localStorage.getItem("maxSectionSeparators") ??
            defaultSettings.maxSectionSeparators.toString()
    )
    return { parsed: extractLyrics(chart.Events, maxSectionSeparators), original: chart }
}

export function extractLyrics(
    events: ChartTrack<ChartEvent>,
    maxSectionSeparators: number = defaultSettings.maxSectionSeparators
): ParsedChart {
    const lyrics: string[] = []
    const syllablesCount: number[] = []
    const errors: ChartError[] = []
    let currentPhrase: string[] = []
    let syllables = 0
    let previousLyricEndsWithHyphen = false
    let sectionsSpaceCount = 0
    let pendingSections = 0
    let phraseOpen = false
    let phraseStartTick = 0

    const pushError = (message: string, timestamps: number[]) => {
        errors.push({ message, timestamps })
    }

    const flushPhrase = () => {
        lyrics.push(currentPhrase.join(" ").trim())
        syllablesCount.push(syllables)
        for (let i = 0; i < pendingSections; i++) lyrics.push("")
        currentPhrase = []
        syllables = 0
        sectionsSpaceCount = 0
        pendingSections = 0
        previousLyricEndsWithHyphen = false
    }

    const parseLyricText = (event: ChartEvent): string => {
        //FIXME: Bug with 'Berried Alive - Crusty'
        //FIXME: If there is a = symbol in the middle of an event, it will be always considered a syllable separator
        const lyricArray = event.name.split(" ")
        // In case there is a space in the middle of the event
        if (lyricArray.length > 2) return lyricArray.slice(1).join("_")
        return lyricArray[1] ?? ""
    }

    for (const [time, eventList] of Object.entries(events)) {
        const tick = parseInt(time)
        for (const event of eventList) {
            if (
                sectionsSpaceCount + pendingSections < maxSectionSeparators &&
                event.name.startsWith("section")
            ) {
                if (currentPhrase.length > 0) {
                    pendingSections++
                } else if (lyrics.length > 0) {
                    lyrics.push("")
                    sectionsSpaceCount++
                }
            } else if (event.name === "phrase_start") {
                if (phraseOpen && currentPhrase.length > 0) {
                    // Save the phrase
                    flushPhrase()
                } else if (phraseOpen) {
                    pushError(chartErrorMessages.CONSECUTIVE_PHRASE_START, [phraseStartTick, tick])
                }
                phraseOpen = true
                phraseStartTick = tick
            } else if (event.name === "phrase_end") {
                if (!phraseOpen) {
                    pushError(chartErrorMessages.PHRASE_END_WITHOUT_OPEN_PHRASE, [tick])
                } else if (currentPhrase.length === 0) {
                    pushError(chartErrorMessages.PHRASE_END_WITHOUT_LYRICS, [tick])
                } else {
                    flushPhrase()
                }
                phraseOpen = false
            } else if (isLyricEvent(event)) {
                if (!phraseOpen) {
                    pushError(chartErrorMessages.LYRIC_WITHOUT_PHRASE_START, [tick])
                }
                const lyricText = parseLyricText(event)
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
        pushError(chartErrorMessages.MISSING_CLOSING_PHRASE_END, [phraseStartTick])
    }

    return {
        chartLyrics: removeTrailingEmptyElements(lyrics).join("\n"),
        chartSyllablesCount: syllablesCount,
        errors,
    }
}
