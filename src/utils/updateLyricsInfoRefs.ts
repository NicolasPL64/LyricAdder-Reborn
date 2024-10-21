import type { ParsedChart } from "./parseChart"

export function updateLineNumbers(lines: string[]) {
  return lines.map((_, index) => `${index + 1}`).join("\n") + "\n"
}

// Concatenates the syllable count of the current lyrics with the syllable count of the chart
export function updateSyllableCount(chart: ParsedChart, lines: string[]) {
  if (!chart?.chartSyllablesCount) return ""

  const currentSyllables = countSyllables(lines)
  const chartSyllables = mapChartSyllables(chart, lines)

  return currentSyllables
    .map((syllable, i) => (chartSyllables[i] === "" ? "\n" : `${syllable}/${chartSyllables[i]}\n`))
    .join("")
}

function mapChartSyllables(chart: ParsedChart, lines: string[]) {
  // TODO: If chart.chartSyllablesCount is longer than the number of lines, keep adding them

  let emptyLines = 0
  return lines.map((line, index) => {
    if (line.trim() === "") {
      emptyLines++
      return ""
    }
    return (chart.chartSyllablesCount[index - emptyLines] ?? "-1").toString()
  })
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
