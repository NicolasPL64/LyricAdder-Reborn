import { removeTrailingEmptyElements } from "./auxFunctions"
import type { ParsedChart } from "./parseChart"

export function updateLineNumbers(lines: string[]) {
  return lines.map((_, index) => `${index + 1}`).join("\n") + "\n"
}

// Concatenates the syllable count of the current lyrics with the syllable count of the chart
export function updateSyllableCount(chart: ParsedChart, lines: string[]) {
  if (!chart?.chartSyllablesCount) return ""

  const currentSyllables = countSyllables(lines)
  const chartSyllables = mapChartSyllables(chart, lines)

  if (chartSyllables.length >= currentSyllables.length)
    // If the original chart has more lines, shows the syllable count of the original chart
    // This way, the user can see how many syllables they're missing
    return chartSyllables
      .map((syllable, i) =>
        lines[i] === "" ? "\n" : `${currentSyllables[i] ?? 0}/${syllable ?? -1}\n`
      )
      .join("")
  // If the original chart has fewer lines, return the syllable count of the current lyrics
  // This way, the textarea won't be flooded with error lines
  else
    return currentSyllables
      .map((syllable, i) => (!chartSyllables[i] ? "\n" : `${syllable}/${chartSyllables[i]}\n`))
      .join("")
}

function mapChartSyllables(chart: ParsedChart, lines: string[]) {
  lines = removeTrailingEmptyElements(lines)
  let emptyLines = 0
  const result = lines.map((line, index) => {
    if (line.trim() === "") {
      emptyLines++
      return ""
    }
    return (chart.chartSyllablesCount[index - emptyLines] ?? "-1").toString()
  })

  // If chart.chartSyllablesCount is longer than the number of lines, append the remaining counts
  const remainingCounts = chart.chartSyllablesCount
    .slice(lines.length - emptyLines)
    .map((count) => count.toString())
  return result.concat(remainingCounts)
}

function countSyllables(lines: string[]) {
  return lines.map((line) =>
    line.trim().length === 0
      ? "0"
      : line
          .split(/[ \-=]/) // Split by spaces, hyphens, and equal signs
          .filter(Boolean) // Remove empty strings
          .length.toString()
  )
}
