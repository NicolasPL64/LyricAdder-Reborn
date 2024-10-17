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
import { parseChart, type parsedChart } from "@/utils/parseChart"
import { updateSyllableCount, updateLineNumbers } from "@/utils/updateLyricsInfoRefs"
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
  if (syllablesTextarea.value) syllablesTextarea.value.scrollTop = scrollTop
  if (lineNumbersTextarea.value) lineNumbersTextarea.value.scrollTop = scrollTop
  if (lyricsTextarea.value) lyricsTextarea.value.scrollTop = scrollTop
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
