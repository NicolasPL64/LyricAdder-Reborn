import type { parsedChart } from "./parseChart"

export function updateLineNumbers(lines: string[]) {
  return lines.map((_, index) => `${index + 1}`).join("\n") + "\n"
}

// Concatenates the syllable count of the current lyrics with the syllable count of the chart
export function updateSyllableCount(chart: parsedChart, lines: string[]) {
  if (!chart?.chartSyllablesCount) return ""
  const curSyl = countCurrentSyllables(lines)
  const chSyl = countChartSyllables(chart, lines)
  const sylls = curSyl.map((syl, i) => (chSyl[i] === "" ? "\n" : `${syl}/${chSyl[i]}\n`)).join("")
  return sylls
}

function countChartSyllables(chart: parsedChart, lines: string[]) {
  let emptyLines = 0
  return lines.map((line, index) => {
    if (line === "") {
      emptyLines++
      return ""
    } else {
      return (chart.chartSyllablesCount[index - emptyLines] ?? "-1").toString()
    }
  })
}

function countCurrentSyllables(lines: string[]) {
  return lines.map((line) =>
    line.trim().length === 0
      ? "0"
      : line
          .split(/[ \-=]/)
          .filter(Boolean)
          .length.toString()
  )
}
