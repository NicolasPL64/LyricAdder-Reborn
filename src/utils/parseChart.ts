import { ChartIO, type ChartEvent } from "./herochartio"

export type parsedChart = { chartSyllablesCount: number[]; chartLyrics: string }

export async function parseChart(path: string) {
  const chart = await ChartIO.load(path)
  return { parsed: extractLyrics(chart.Events), original: chart }
}

function extractLyrics(events: { [key: number]: ChartEvent[] }) {
  const lyrics: string[] = []
  const syllablesCount: number[] = []
  let currentPhrase: string[] = []
  let syllables: number = 0
  let previousLyricEndsWithHyphen = false

  for (const event in events) {
    if (!Object.prototype.hasOwnProperty.call(events, event))
      throw new Error("Invalid chart format")
    const eventList = events[event]
    eventList.forEach((event) => {
      if (event.name === "phrase_start" && currentPhrase.length > 0) {
        //TODO: What happens if there are two phrase_start events in a row?

        lyrics.push(currentPhrase.join(" ").trim())
        syllablesCount.push(syllables)

        //Reset values for next phrase
        currentPhrase = []
        syllables = 0
      } else if (
        (event.name.startsWith("lyric") || event.name.startsWith("Default")) &&
        event.type === "E"
      ) {
        syllables++
        const lyricText = event.name.split(" ")[1] ?? ""
        if (previousLyricEndsWithHyphen) {
          currentPhrase[currentPhrase.length - 1] += lyricText
          previousLyricEndsWithHyphen = false
        } else currentPhrase.push(lyricText)
        if (lyricText.endsWith("-") || lyricText.endsWith("=")) {
          previousLyricEndsWithHyphen = true
        }
      }
    })
  }

  // Adds last phrase
  if (currentPhrase.length > 0) {
    lyrics.push(currentPhrase.join(" "))
    syllablesCount.push(syllables)
  }

  return { chartLyrics: lyrics.join("\n"), chartSyllablesCount: syllablesCount }
}
