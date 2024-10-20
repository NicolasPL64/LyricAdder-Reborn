import { isLyricEvent } from "./auxFunctions"
import { ChartIO, type Chart } from "./herochartio"

export async function parseLyricsToChart(lyrics: string[], chart: Chart, path: string) {
  let currentPhraseIndex = -1
  let currentPhrase: string[] = []
  const events = chart.Events

  const getNextNonEmptyPhrase = () => {
    do {
      currentPhraseIndex++
    } while (lyrics[currentPhraseIndex]?.trim() === "")
    return splitPhrase(lyrics[currentPhraseIndex].trim())
  }

  const splitPhrase = (phrase: string) => {
    return phrase
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
  }

  for (const eventList of Object.values(events)) {
    for (const event of eventList) {
      if (event.name === "phrase_start") {
        currentPhrase = getNextNonEmptyPhrase()
      } else if (isLyricEvent(event)) {
        event.name = "lyric " + currentPhrase.shift()
      }
    }
  }

  await ChartIO.save(chart, path)
  console.log("Chart saved")
}
