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
    filters: [{ name: "Chart files (.chart/.mid)", extensions: ["chart", "mid"] }],
  })
  if (!file) return

  chart = await parseChart(file)
  updateSyllableCount()
  updateLineNumbers()
  lyricsText.value = chart.lyrics
}

function updateLineNumbers() {
  const lines = lyricsText.value.split("\n")
  lineNumbers.value = ""
  for (const line in lines) {
    lineNumbers.value += `${parseInt(line) + 1}\n`
  }
  console.log(lineNumbers.value)
}

async function updateSyllableCount() {
  const lines = lyricsText.value.split("\n")
  syllablesCount.value = ""
  let emptyLines = 0
  lines.forEach((line, index) => {
    if (line === "") {
      syllablesCount.value += "\n"
      emptyLines++
    } else {
      syllablesCount.value += (chart.syllablesCount[index - emptyLines] ?? -1) + "\n"
    }
  })
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
