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
    <textarea
      class="lyrics"
      ref="lyricsTextarea"
      v-model="lyricsText"
      spellcheck="false"
      @scroll="syncScroll"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { parseChart } from "@/utils/parseChart"
import { open } from "@tauri-apps/plugin-dialog"
import { ref, watch } from "vue"

const lyricsText = ref("")
const syllablesCount = ref("")
const lineNumbers = ref("1")

const syllablesTextarea = ref<HTMLTextAreaElement | null>(null)
const lineNumbersTextarea = ref<HTMLTextAreaElement | null>(null)
const lyricsTextarea = ref<HTMLTextAreaElement | null>(null)

const syncScroll = (event: any) => {
  const scrollTop = event.target.scrollTop
  if (syllablesTextarea.value) {
    syllablesTextarea.value.scrollTop = scrollTop
  }
  if (lineNumbersTextarea.value) {
    lineNumbersTextarea.value.scrollTop = scrollTop
  }
  if (lyricsTextarea.value) {
    lyricsTextarea.value.scrollTop = scrollTop
  }
}

let chart: { syllablesCount: number[]; lyrics: string }

async function loadFile() {
  const file = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Chart files (.chart)", extensions: ["chart"] }],
  })
  if (!file) return

  chart = await parseChart(file)
  lyricsText.value = chart.lyrics
  updateSyllableCount()
  updateLineNumbers()
}

function updateLineNumbers() {
  const lines = lyricsText.value.split("\n")
  lineNumbers.value = lines.map((_, index) => `${index + 1}`).join("\n") + "\n"
}

function updateSyllableCount() {
  if (!chart?.syllablesCount) return
  const curSyl = countCurrentSyllables()
  const chSyl = countChartSyllables()
  const sylls = curSyl.map((syl, i) => (chSyl[i] === "" ? "\n" : `${syl}/${chSyl[i]}\n`)).join("")
  syllablesCount.value = sylls
}

function countChartSyllables() {
  const lines = lyricsText.value.split("\n")
  let emptyLines = 0
  return lines.map((line, index) => {
    if (line === "") {
      emptyLines++
      return ""
    } else {
      return (chart.syllablesCount[index - emptyLines] ?? "-1").toString()
    }
  })
}

function countCurrentSyllables() {
  const lines = lyricsText.value.split("\n")
  return lines.map((line) =>
    line.trim().length === 0
      ? "0"
      : line
          .split(/[ \-=]/)
          .filter(Boolean)
          .length.toString()
  )
}

watch(lyricsText, () => {
  updateSyllableCount()
  updateLineNumbers()
})
</script>

<style scoped>
.container {
  display: flex;
  position: relative;
  height: 70dvh;
}

textarea {
  resize: none;
  overflow-wrap: normal;
  overflow-x: hidden;
  overflow-y: hidden;
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
  overflow-x: scroll;
  overflow-y: scroll;
  text-align: left;
}
</style>
