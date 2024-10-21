import { removeTrailingEmptyElements } from "./auxFunctions"

export function wrongPhrases(sylArray: string[], lyricsText: string[]) {
  lyricsText = removeTrailingEmptyElements(lyricsText)
  lyricsText.push("") // Makes it so the first syllables are always compared
  const highlightedArray: number[] = []

  lyricsText.forEach((_, i) => {
    if (!sylArray[i]) return
    const [currSyl, chartSyl] = sylArray[i].split("/")
    if (currSyl !== chartSyl) {
      highlightedArray.push(i)
    }
  })
  return highlightedArray
}
