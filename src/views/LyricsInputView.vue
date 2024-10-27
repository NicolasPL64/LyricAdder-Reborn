<template>
  <h1 style="margin-top: 0">Lyrics Input</h1>

  <button
    @click="loadFile"
    v-tooltip="{
      value: 'Loads and reads a chart',
      showDelay: 800,
    }"
  >
    <IconLoad />Load chart
  </button>
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

    <div class="highlighted-lines" ref="highlightedLinesContainer" readonly>
      <div
        v-for="(line, index) in highlightedLines"
        :key="index"
        :class="{ highlight: isHighlighted(index) }"
      >
        {{ line }}
      </div>
    </div>
    <div style="position: inherit; width: 100%">
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
  <button @click="saveFile" :disabled="highlightedIndices.length > 0">
    <IconSave />Save chart
  </button>
</template>

<script setup lang="ts">
import IconLoad from "@/components/icons/IconLoad.vue"
import IconSave from "@/components/icons/IconSave.vue"

import type { Chart } from "@/utils/herochartio"
import { parseChart, type ParsedChart } from "@/utils/parseChart"
import { parseLyricsToChart } from "@/utils/saveChart"
import { loadLyricsSettings } from "@/utils/theme"
import { updateSyllableCount, updateLineNumbers } from "@/utils/updateLyricsInfoRefs"
import { wrongPhrases } from "@/utils/wrongPhrases"
import { open } from "@tauri-apps/plugin-dialog"
import {
  watch as watchFile,
  type WatchEvent,
  type WatchEventKindModify,
} from "@tauri-apps/plugin-fs"
import { ref, watch, onMounted, onActivated, onDeactivated } from "vue"

const lyricsText = ref("")
const syllablesCount = ref("")
const lineNumbers = ref("1")
const highlightedLines = ref<string[]>([]) // Array of lines to display in the highlighted lines container
const highlightedIndices = ref<number[]>([]) // Indices of the lines that should be highlighted

const syllablesTextarea = ref<HTMLTextAreaElement | null>(null)
const lineNumbersTextarea = ref<HTMLTextAreaElement | null>(null)
const lyricsTextarea = ref<HTMLTextAreaElement | null>(null)
const highlightedLinesContainer = ref<HTMLTextAreaElement | null>(null)

let isRereadOnChange = ref<boolean>(false)

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
let path = ""
let fileWatcher: (() => void) | undefined

// Function to load a chart file
async function loadFile() {
  const selectedPath = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Chart files (.chart)", extensions: ["chart"] }],
  })
  if (!selectedPath) return
  path = selectedPath

  chart = await parseChart(path)
  lyricsText.value = chart.parsed.chartLyrics

  createFileWatcher()
}

async function createFileWatcher() {
  if (isRereadOnChange.value) {
    if (fileWatcher) fileWatcher() // To remove any previous fileWatcher
    fileWatcher = await watchFile(path, handleFileChange, {
      delayMs: 300,
    })
  }
}

async function handleFileChange(event: WatchEvent) {
  if (typeof event.type === "object" && "modify" in event.type) {
    console.log("File modified")
    chart = await parseChart(path)

    watchLyricsTextRef()
  }
}

async function saveFile() {
  // TODO: If highlightedIndices.length > 0, disable the save button and show a message to the user when trying to click the button
  if (!path) return
  await parseLyricsToChart(lyricsText.value.split("\n"), chart.original, path)
}

async function watchLyricsTextRef() {
  syllablesCount.value = updateSyllableCount(chart.parsed, lyricsText.value.split("\n"))
  lineNumbers.value = updateLineNumbers(lyricsText.value.split("\n"))
  highlightedIndices.value = wrongPhrases(
    syllablesCount.value.split("\n"),
    lyricsText.value.split("\n")
  )
  updateHighlightedLines()
}

watch(lyricsText, watchLyricsTextRef)

onMounted(() => {
  isRereadOnChange.value = loadLyricsSettings()
})

onActivated(async () => {
  isRereadOnChange.value = loadLyricsSettings()
  if (isRereadOnChange.value) {
    chart = await parseChart(path)
    watchLyricsTextRef()
  }
  createFileWatcher()
})

onDeactivated(() => {
  if (fileWatcher) fileWatcher() // Disables the fileWatcher
})
</script>

<style scoped>
:root {
  --lyrics-container-font-size: 0.9rem;
  --lyrics-container-line-height: 1.5;
}

.container {
  display: flex;
  position: relative;
  height: 60vh;
}

/* TODO: These three can be user options */
.container * {
  font-size: var(--lyrics-container-font-size);
  line-height: var(--lyrics-container-line-height);
  font-family: monospace;
}

.highlighted-lines {
  position: absolute;
  top: 2px;
  width: 100%;
  height: calc(100% - 2px);
  overflow: hidden;
  pointer-events: none;
  color: transparent;
  white-space: pre;
  overflow-wrap: normal;
}

.highlighted-lines .highlight {
  box-shadow: 0 1px 0 linear-gradient(to right, var(--error-500), transparent);
  background-image: linear-gradient(to right, var(--error-500), transparent);
}

textarea {
  z-index: 1;
  overflow: hidden;
  resize: none;
  color: var(--text-900);
  text-align: right;
  white-space: pre;
  overflow-wrap: normal;
}

.syllables {
  border-radius: var(--border-small) 0 0 var(--border-small);
  background: var(--background-100);
  width: 5ch;
  min-width: 5ch;
}

.line-numbers {
  border-right: 1px solid var(--background-500);
  background-color: var(--background-200);
  width: 4ch;
  min-width: 4ch;
}

.lyrics {
  position: absolute;
  box-sizing: border-box;
  border-radius: 0 var(--border-small) var(--border-small) 0;
  background: transparent;
  width: 100%;
  height: 100%;
  overflow: auto;
  text-align: left;
}

.lyricsBG {
  position: absolute;
  z-index: -1;
  background: var(--background-100);
  width: 100%;
  height: 100%;
}
</style>
