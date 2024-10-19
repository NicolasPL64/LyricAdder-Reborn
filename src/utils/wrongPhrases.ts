export function wrongPhrases(sylArray: string[]) {
  const highlightedArray: number[] = []
  sylArray.forEach((line, index) => {
    if (!line) return
    const [cuSyl, chSyl] = line.split("/")
    if (cuSyl !== chSyl) {
      highlightedArray.push(index)
    }
  })
  return highlightedArray
}
