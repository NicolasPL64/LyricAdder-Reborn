export function wrongPhrases(sylArray: string[]) {
  const highlightedArray: number[] = []
  sylArray.forEach((line, index) => {
    if (!line) return
    const [currSyl, chartSyl] = line.split("/")
    if (currSyl !== chartSyl) {
      highlightedArray.push(index)
    }
  })
  return highlightedArray
}
