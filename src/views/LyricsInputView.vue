<template>
  <button @click="loadFile">Load file</button>
  <div class="container">
    <textarea
      class="syllables"
      ref="syllablesTextarea"
      v-model="syllablesCount"
      spellcheck="false"
      readonly
      @scroll="syncScroll"
    ></textarea>
    <textarea
      class="line-numbers"
      ref="lineNumbersTextarea"
      v-model="lineNumbers"
      readonly
      @scroll="syncScroll"
    ></textarea>
    <div style="display: flex">
      <div class="highlighted-lines" ref="highlightedLinesContainer" readonly>
        <div
          v-for="(line, index) in highlightedLines"
          :key="index"
          :class="{ highlight: isHighlighted(index) }"
        >
          {{ line }}
        </div>
      </div>
      <textarea
        class="lyrics"
        ref="lyricsTextarea"
        v-model="lyricsText"
        spellcheck="false"
        @scroll="syncScroll"
        @input="updateHighlightedLines"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { parseChart, type parsedChart } from "@/utils/parseChart"
import { updateSyllableCount, updateLineNumbers } from "@/utils/updateLyricsInfoRefs"
import { wrongPhrases } from "@/utils/wrongPhrases"
import { open } from "@tauri-apps/plugin-dialog"
import { ref, watch } from "vue"

const lyricsText = ref("")
const syllablesCount = ref("")
const lineNumbers = ref("1")
const highlightedLines = ref<string[]>([]) // Array of lines to display in the highlighted lines container
const highlightedIndices = ref<number[]>([]) // Indices of the lines that should be highlighted

const syllablesTextarea = ref<HTMLTextAreaElement | null>(null)
const lineNumbersTextarea = ref<HTMLTextAreaElement | null>(null)
const lyricsTextarea = ref<HTMLTextAreaElement | null>(null)
const highlightedLinesContainer = ref<HTMLTextAreaElement | null>(null)

const syncScroll = (event: any) => {
  const scrollTop = event.target.scrollTop
  if (syllablesTextarea.value) syllablesTextarea.value.scrollTop = scrollTop
  if (lineNumbersTextarea.value) lineNumbersTextarea.value.scrollTop = scrollTop
  if (lyricsTextarea.value) lyricsTextarea.value.scrollTop = scrollTop
  if (highlightedLinesContainer.value) highlightedLinesContainer.value.scrollTop = scrollTop
}

const updateHighlightedLines = () => {
  highlightedLines.value = lyricsText.value.split("\n")
  highlightedLines.value.map((line, index) => {
    if (line === "") {
      highlightedLines.value[index] = " "
    }
  })
  highlightedLines.value.push("\n\n")
}

const isHighlighted = (index: number) => {
  return highlightedIndices.value.includes(index)
}

let chart: parsedChart

async function loadFile() {
  const file = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Chart files (.chart)", extensions: ["chart"] }],
  })
  if (!file) return

  chart = await parseChart(file)
  lyricsText.value = chart.chartLyrics
}

watch(lyricsText, () => {
  //TODO: Add user option to re-read the chart automatically each time there's an update in the lyricsText

  const lines = lyricsText.value.split("\n")

  syllablesCount.value = updateSyllableCount(chart, lines)
  lineNumbers.value = updateLineNumbers(lines)
  highlightedIndices.value = wrongPhrases(syllablesCount.value.split("\n"))
  updateHighlightedLines()
})
</script>

<style scoped>
.container {
  display: flex;
  position: relative;
  height: 70dvh;
}

.container * {
  line-height: 1.5;
  font-size: 0.9rem;
  /* scrollbar-color: red transparent; */
  /* https://developer.chrome.com/docs/css-ui/scrollbar-styling?hl=es-419 */
}

.highlighted-lines {
  width: 70ch;
  height: 69.5dvh;
  top: 2px;
  position: absolute;
  pointer-events: none;
  overflow-wrap: normal;
  white-space: pre;
  overflow: hidden;
  color: transparent;
  font-family: monospace;
}

.highlighted-lines .highlight {
  background-color: rgb(208, 255, 0);
  box-shadow: 0 1px 0 rgb(208, 255, 0);
}

textarea {
  resize: none;
  background: transparent;
  z-index: 1;
  overflow-wrap: normal;
  overflow: hidden;
  text-align: right;
  white-space: pre;
}

.syllables {
  width: 5ch;
}

.line-numbers {
  width: 4ch;
  background-color: #f0f0f0;
  border-right: 1px solid #ddd;
}

.lyrics {
  width: 70ch;
  overflow: scroll;
  text-align: left;
}
</style>
