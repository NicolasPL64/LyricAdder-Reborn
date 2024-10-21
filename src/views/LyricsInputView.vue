<template>
  <h1>Lyrics Input</h1>

  <button @click="loadFile">Load chart</button>
  <p>Input the lyrics in the box below using the appropriate syntax:</p>
  <div class="container">
    <textarea
      class="syllables"
      ref="syllablesTextarea"
      v-model="syllablesCount"
      spellcheck="false"
      disabled="true"
      readonly
      @scroll="syncScroll"
    ></textarea>
    <textarea
      class="line-numbers"
      ref="lineNumbersTextarea"
      v-model="lineNumbers"
      disabled="true"
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
      <div style="display: flex; position: relative">
        <div class="lyricsBG"></div>
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
  </div>
  <button @click="saveFile" :disabled="highlightedIndices.length > 0">Save chart</button>
</template>

<script setup lang="ts">
import type { Chart } from "@/utils/herochartio"
import { parseChart, type ParsedChart } from "@/utils/parseChart"
import { parseLyricsToChart } from "@/utils/saveChart"
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
  syllablesTextarea.value?.scrollTo({ top: scrollTop })
  lineNumbersTextarea.value?.scrollTo({ top: scrollTop })
  lyricsTextarea.value?.scrollTo({ top: scrollTop })
  highlightedLinesContainer.value?.scrollTo({ top: scrollTop })
}

const updateHighlightedLines = () => {
  highlightedLines.value = lyricsText.value.split("\n").map((line) => (line === "" ? " " : line))
  highlightedLines.value.push(" ")
}

const isHighlighted = (index: number) => {
  return highlightedIndices.value.includes(index)
}

let chart: { parsed: ParsedChart; original: Chart }
let path: string | null = ""

// Function to load a chart file
async function loadFile() {
  path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Chart files (.chart)", extensions: ["chart"] }],
  })
  if (!path) return

  chart = await parseChart(path)
  lyricsText.value = chart.parsed.chartLyrics
}

async function saveFile() {
  // TODO: If highlightedIndices.length > 0, disable the save button and show a message to the user when trying to click the button
  if (!path) return
  await parseLyricsToChart(lyricsText.value.split("\n"), chart.original, path)
}

watch(lyricsText, () => {
  // TODO: Add user option to re-read the chart automatically each time there's an update in the lyricsText

  syllablesCount.value = updateSyllableCount(chart.parsed, lyricsText.value.split("\n"))
  lineNumbers.value = updateLineNumbers(lyricsText.value.split("\n"))
  highlightedIndices.value = wrongPhrases(syllablesCount.value.split("\n"))
  updateHighlightedLines()
})
</script>

<style scoped>
.container {
  display: flex;
  position: absolute;
  height: 70vh;
}

.container * {
  line-height: 1.5;
  font-size: 0.9rem;
}

.highlighted-lines {
  width: 80vw;
  height: 69.5vh;
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
  background-image: linear-gradient(to right, var(--error-500), transparent);
  box-shadow: 0 1px 0 linear-gradient(to right, var(--error-500), transparent);
}

textarea {
  color: var(--text-900);
  resize: none;
  z-index: 1;
  overflow-wrap: normal;
  overflow: hidden;
  text-align: right;
  white-space: pre;
}

.syllables {
  width: 5ch;
  background: var(--background-100);
}

.line-numbers {
  width: 4ch;
  background-color: var(--background-200);
  border-right: 1px solid var(--background-500);
}

.lyrics {
  background: transparent;
  width: 80vw;
  overflow: auto;
  text-align: left;
}

.lyricsBG {
  z-index: -1;
  position: absolute;
  height: 100%;
  width: 100%;
  background: var(--background-100);
}
</style>
