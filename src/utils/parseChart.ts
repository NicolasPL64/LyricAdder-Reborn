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
  let sectionsSpaceCount = 0
  const maxSectionSeparators = parseInt(localStorage.getItem("maxSectionSeparators") ?? "3")

  for (const eventList of Object.values(events)) {
    eventList.forEach((event) => {
      //FIXME: Bug with 'Berried Alive - Crusty'
      if (
        lyrics.length > 0 &&
        sectionsSpaceCount < maxSectionSeparators &&
        event.name.startsWith("section")
      ) {
        lyrics.push("")
        sectionsSpaceCount++
      }
      // WARN: What happens if there are two phrase_start events in a row? A: error in console
      if (event.name === "phrase_start" && currentPhrase.length > 0) {
        // Save the phrase and reset for the next one
        lyrics.push(currentPhrase.join(" ").trim())
        syllablesCount.push(syllables)
        currentPhrase = []
        syllables = 0
        sectionsSpaceCount = 0
      } else if (isLyricEvent(event)) {
        const lyricArray = event.name.split(" ")
        let lyricText = ""

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
    chartLyrics: removeTrailingEmptyElements(lyrics).join("\n"),
    chartSyllablesCount: syllablesCount,
  }
}
