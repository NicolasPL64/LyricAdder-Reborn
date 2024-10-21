import { isLyricEvent, removeTrailingEmptyElements } from "./auxFunctions"
import { ChartIO, type ChartEvent } from "./herochartio"

export type ParsedChart = { chartSyllablesCount: number[]; chartLyrics: string }

export async function parseChart(path: string): Promise<{ parsed: ParsedChart; original: any }> {
  const chart = await ChartIO.load(path)
  return { parsed: extractLyrics(chart.Events), original: chart }
}

function extractLyrics(events: { [key: number]: ChartEvent[] }): ParsedChart {
  const lyrics: string[] = []
  const syllablesCount: number[] = []
  let currentPhrase: string[] = []
  let syllables = 0
  let previousLyricEndsWithHyphen = false

  for (const eventList of Object.values(events)) {
    eventList.forEach((event) => {
      // TODO: What happens if there are two phrase_start events in a row?
      if (event.name === "phrase_start" && currentPhrase.length > 0) {
        // Save the phrase and reset for the next one
        lyrics.push(currentPhrase.join(" ").trim())
        syllablesCount.push(syllables)
        currentPhrase = []
        syllables = 0
      } else if (isLyricEvent(event)) {
        const lyricText = event.name.split(" ")[1] ?? ""
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
    chartLyrics: removeTrailingEmptyElements(lyrics).join("\n"),
    chartSyllablesCount: syllablesCount,
  }
}
