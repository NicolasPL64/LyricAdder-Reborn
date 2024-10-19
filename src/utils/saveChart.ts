import { ChartIO, type Chart } from "./herochartio"

export async function parseLyricsToChart(lyrics: string[], chart: Chart, path: string) {
  let currentPhraseIndex = -1
  let currentPhrase: string[] = []
  const events = chart.Events
  for (const event in events) {
    const eventList = events[event]
    eventList.forEach((event) => {
      if (event.name === "phrase_start") {
        do {
          currentPhraseIndex++
        } while (lyrics[currentPhraseIndex].trim() === "")

        currentPhrase = lyrics[currentPhraseIndex]
          .trim()
          .replace(/\s+/g, " ") // Replace multiple spaces with a single space
          .split(/([ =-])/)
          .reduce((acc, curr, index) => {
            // If it's a separator, it's concatenated with the previous element
            if (index % 2 !== 0) {
              if (curr !== " ") acc[acc.length - 1] += curr
            } else {
              // If it's not a separator, it's added as a new element
              acc.push(curr)
            }
            return acc
          }, [] as string[])
      } else if (
        (event.name.startsWith("lyric") || event.name.startsWith("Default")) &&
        event.type === "E"
      ) {
        event.name = "lyric " + currentPhrase.shift()
      }
    })
  }
  await ChartIO.save(chart, path)
  console.log("Chart saved")
}
