<script setup lang="ts">
import IconLoad from "@/components/icons/IconLoad.vue"
import IconSave from "@/components/icons/IconSave.vue"

import Editor from "@tinymce/tinymce-vue"
import type { EditorOptions, Editor as TinyMCEEditor } from "tinymce"
import { parseChart, type ParsedChartWithOriginal } from "@/utils/parseChart"
import { parseLyricsToChart } from "@/utils/saveChart"
import { loadLyricsSettings } from "@/utils/settings"
import { updateSyllableCount, updateLineNumbers } from "@/utils/updateLyricsInfoRefs"
import { createFileWatcher, removeFileWatcher } from "@/utils/watchFile"
import { wrongPhrases } from "@/utils/wrongPhrases"
import { open } from "@tauri-apps/plugin-dialog"
import { ref, onMounted, onActivated, onDeactivated } from "vue"

const lyricsInput = ref("")
const syllablesCount = ref("")
const lineNumbers = ref("<p>1</p>")
const highlightedLines = ref<string[]>([]) // Array of lines to display in the highlighted lines container
const highlightedIndices = ref<number[]>([]) // Indices of the lines that should be highlighted

const syllablesDiv = ref<HTMLDivElement | null>(null)
const lineNumbersDiv = ref<HTMLDivElement | null>(null)
const highlightedLinesContainer = ref<HTMLTextAreaElement | null>(null)
let lyricsEditor: TinyMCEEditor | null = null

// Settings
let isRereadOnChange = false
let isGayMode = ref<boolean>(false)

const editorOptions: Partial<EditorOptions> = {
  id: "lyrics-editor",
  plugins: [
    "code",
    "fullscreen",
    "help",
    "insertdatetime",
    "preview",
    "searchreplace",
    "visualblocks",
  ],
  toolbar:
    "joinSyllables undo redo | styles | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
  height: 500,
  newline_behavior: "invert",
  remove_trailing_brs: true,
  resize: false,
  //menubar: false,
  statusbar: false,
  inline: true,
  valid_elements: "p,br,span[*],b,i,b/strong,i/em",
  setup(editor) {
    editor.ui.registry.addButton("joinSyllables", {
      icon: "non-breaking",
      tooltip: "Join syllables",
      onAction: () => {
        const txt = editor.selection.getContent({ format: "text" })
        if (txt) {
          editor.selection.setContent(
            `<span class="multi-syllable" style="background-color: #b96ad9;">${txt}</span>`
          )
        }
        watchLyricsTextRef()
      },
      shortcut: "meta+shift+A",
    })

    editor.addShortcut("meta+shift+A", "Join syllables", () => {
      const txt = editor.selection.getContent({ format: "text" })
      if (txt) {
        editor.selection.setContent(
          `<span class="multi-syllable" style="background-color: #b96ad9;">${txt}</span>`
        )
      }
      watchLyricsTextRef()
    })

    // Scroll event to synchronize scroll between the editor and the other elements
    // (Thanks, Copilot)
    editor.on("init", () => {
      lyricsEditor = editor
      editor.getBody().addEventListener("scroll", (e) => {
        const scrollTop = (e.target as HTMLElement).scrollTop
        syllablesDiv.value?.scrollTo({ top: scrollTop })
        lineNumbersDiv.value?.scrollTo({ top: scrollTop })
        highlightedLinesContainer.value?.scrollTo({ top: scrollTop })
      })
    })

    // Triggers on editor change
    editor.on("input", () => {
      watchLyricsTextRef()
    })
  },
}

function syncScroll(event: any) {
  const scrollTop = event.target.scrollTop
  syllablesDiv.value?.scrollTo({ top: scrollTop })
  lineNumbersDiv.value?.scrollTo({ top: scrollTop })
  highlightedLinesContainer.value?.scrollTo({ top: scrollTop })
}

function updateHighlightedLines() {
  highlightedLines.value = lyricsInput.value.split("\n").map((line) => (line === "" ? " " : line))
  highlightedLines.value.push(" ")
}

function isHighlighted(index: number) {
  return highlightedIndices.value.includes(index)
}

let chart: ParsedChartWithOriginal
let path = ""

async function loadFile() {
  const selectedPath = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Chart files (.chart)", extensions: ["chart"] }],
  })
  if (!selectedPath) return
  path = selectedPath

  chart = await parseChart(path)
  if (lyricsEditor) {
    lyricsEditor.setContent(chart.parsed.chartLyrics)
    lyricsInput.value = lyricsEditor.getContent()
  }

  setupFileWatcher()
}

async function saveFile() {
  // TODO: If highlightedIndices.length > 0, disable the save button and show a message to the user when trying to click the button
  if (!path) return
  await parseLyricsToChart(lyricsInput.value.split("\n"), chart.original, path)
}

function setupFileWatcher() {
  createFileWatcher(path, isRereadOnChange, (updatedChart) => {
    chart = updatedChart
  })
  watchLyricsTextRef()
}

async function watchLyricsTextRef() {
  if (!lyricsEditor) return
  lineNumbers.value = updateLineNumbers(lyricsEditor.getContent())
  syllablesCount.value = updateSyllableCount(chart.parsed, lyricsEditor.getContent())

  /* 

  highlightedIndices.value = wrongPhrases(
    syllablesCount.value.split("\n"),
    lyricsInput.value.split("\n")
  )
  updateHighlightedLines() */
}

///////// HOOKS:

onMounted(() => {
  ;({ isRereadOnChange: isRereadOnChange, isGayMode: isGayMode.value } = loadLyricsSettings())
})

onActivated(async () => {
  ;({ isRereadOnChange: isRereadOnChange, isGayMode: isGayMode.value } = loadLyricsSettings())
  if (path) {
    if (isRereadOnChange) {
      chart = await parseChart(path)
      watchLyricsTextRef()
    }
    setupFileWatcher()
  }
})

onDeactivated(() => {
  removeFileWatcher()
})
</script>

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
    <div
      class="syllables mce-content-body"
      ref="syllablesDiv"
      v-html="syllablesCount"
      @scroll="syncScroll"
    />
    <div
      class="line-numbers mce-content-body"
      ref="lineNumbersDiv"
      v-html="lineNumbers"
      @scroll="syncScroll"
    />

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
      <editor
        :placeholder="isGayMode ? 'Ca-co-rro' : ''"
        class="lyrics"
        api-key="qagffr3pkuv17a8on1afax661irst1hbr4e6tbv888sz91jc"
        v-model="lyricsInput"
        :init="editorOptions"
      />
    </div>
  </div>
  <button @click="saveFile" :disabled="highlightedIndices.length > 0">
    <IconSave />Save chart
  </button>
</template>

<style scoped>
:root {
  --lyrics-container-font-size: 0.9rem;
  --lyrics-container-line-height: 1.5;
  --lyrics-font-family: monospace;
  /* TODO: Yet to implement user option */
}

.container {
  display: flex;
  position: relative;
  height: 60vh;
}

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

.syllables {
  z-index: 1;
  border-radius: var(--border-small) 0 0 var(--border-small);
  background: var(--background-100);
  width: 5ch;
  min-width: 5ch;
  overflow: hidden;
  resize: none;
  color: var(--text-900);
  text-align: right;
  overflow-wrap: normal;
}

.line-numbers {
  z-index: 1;
  border-right: 1px solid var(--background-500);
  background-color: var(--background-200);
  padding-bottom: 0;
  width: 4ch;
  min-width: 4ch;
  overflow: hidden;
  resize: none;
  color: var(--text-900);
  user-select: none;
  text-align: right;
}

.lyrics {
  position: absolute;
  box-sizing: border-box;
  border-radius: 0 var(--border-small) var(--border-small) 0;
  background: transparent;
  width: 100%;
  height: 100%;
  overflow: scroll;
  text-align: left;
  white-space: nowrap;
}

.mce-content-body {
  padding: 0 0.5em;
}

.lyricsBG {
  position: absolute;
  z-index: -1;
  background: var(--background-100);
  width: 100%;
  height: 100%;
}
</style>

<style>
.mce-content-body p {
  margin: calc((var(--lyrics-container-line-height) / 1.5) * 1em) 0;
}

.mce-content-body p:first-child {
  margin-top: 0;
}

.mce-content-body p:last-child {
  margin-bottom: 0;
}
</style>
