import { ChartIO, type ChartEvent } from "./herochartio"

export async function parseChart(path: string) {
  const chart = await ChartIO.load(path)

  //console.log(chart.Events)
  //console.log(extractLyrics(chart.Events))
  return extractLyrics(chart.Events)
}

function extractLyrics(events: { [key: number]: ChartEvent[] }): {
  lyrics: string
  syllablesCount: number[]
} {
  const lyrics: string[] = []
  const syllablesCount: number[] = []
  let currentPhrase: string[] = []
  let syllables: number = 0
  let previousLyricEndsWithHyphen = false

  for (const key in events) {
    if (Object.prototype.hasOwnProperty.call(events, key)) {
      const eventList = events[key]
      eventList.forEach((event) => {
        if (event.name === "phrase_start") {
          if (currentPhrase.length > 0) {
            lyrics.push(currentPhrase.join(" "))
            syllablesCount.push(syllables)
            //Reset values
            currentPhrase = []
            syllables = 0
          }
        } else if (event.name.startsWith("lyric") && event.type === "E") {
          syllables++
          const lyricText = event.name.replace("lyric ", "")
          if (previousLyricEndsWithHyphen) {
            currentPhrase[currentPhrase.length - 1] += lyricText
            previousLyricEndsWithHyphen = false
          } else {
            currentPhrase.push(lyricText)
          }
          if (lyricText.endsWith("-") || lyricText.endsWith("=")) {
            previousLyricEndsWithHyphen = true
          }
        }
      })
    }
  }

  // Adds last phrase
  if (currentPhrase.length > 0) {
    lyrics.push(currentPhrase.join(" "))
    syllablesCount.push(syllables)
  }

  return { lyrics: lyrics.join("\n"), syllablesCount: syllablesCount }
}
