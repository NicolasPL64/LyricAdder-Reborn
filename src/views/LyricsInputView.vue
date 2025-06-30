<script setup lang="ts">
import IconLoad from "@/components/icons/IconLoad.vue"
import IconSave from "@/components/icons/IconSave.vue"

import Editor from "@tinymce/tinymce-vue"
import { type EditorOptions } from "tinymce"
import { parseChart, type ParsedChartWithOriginal } from "@/utils/parseChart"
import { parseLyricsToChart } from "@/utils/saveChart"
import { loadLyricsSettings } from "@/utils/settings"
import { updateSyllableCount, updateLineNumbers } from "@/utils/updateLyricsInfoRefs"
import { createFileWatcher, removeFileWatcher } from "@/utils/watchFile"
import { wrongPhrases } from "@/utils/wrongPhrases"
import { open } from "@tauri-apps/plugin-dialog"
import { ref, watch, onMounted, onActivated, onDeactivated } from "vue"

const lyricsInput = ref("")
const syllablesCount = ref("<p>0/2<br>0/0</p><p>0/2<br>0/0</p>")
const lineNumbers = ref("<p>1</p>")
const highlightedLines = ref<string[]>([]) // Array of lines to display in the highlighted lines container
const highlightedIndices = ref<number[]>([]) // Indices of the lines that should be highlighted

const syllablesDiv = ref<HTMLDivElement | null>(null)
const lineNumbersDiv = ref<HTMLDivElement | null>(null)
const lyricsEditor = ref<any>(null)
const highlightedLinesContainer = ref<HTMLTextAreaElement | null>(null)

// Settings
let isRereadOnChange = false
let isGayMode = ref<boolean>(false)

const editorOptions: Partial<EditorOptions> = {
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
    "replaceSpaces undo redo | styles | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image",
  height: 500,
  newline_behavior: "invert",
  remove_trailing_brs: true,
  resize: false,
  //menubar: false,
  statusbar: false,
  inline: true,
  //valid_elements: "p,br,span[*],b,i,b/strong,i/em",
  //placeholder: isGayMode.value ? "Ca-co-rro" : "",
  setup(editor) {
    // Botón personalizado
    editor.ui.registry.addButton("replaceSpaces", {
      text: "§",
      tooltip: "Reemplazar espacios",
      onAction: () => {
        const txt = editor.selection.getContent({ format: "text" })
        editor.selection.setContent(txt.replace(/\s+/g, "§"))
      },
      shortcut: "meta+shift+M", // muestra el atajo en el tooltip
    })

    // Atajo personalizado
    editor.addShortcut(
      "meta+shift+M", // combinación: Cmd+Shift+S (Mac) o Ctrl+Shift+S (Win)
      "Reemplazar espacios por §", // descripción del atajo
      () => {
        const txt = editor.selection.getContent({ format: "text" })
        editor.selection.setContent(txt.replace(/\s+/g, "§"))
      }
    )
    // Scroll event to synchronize scroll between the editor and the other elements
    // (Thanks, Copilot)
    editor.on("init", () => {
      editor.getBody().addEventListener("scroll", (e) => {
        const scrollTop = (e.target as HTMLElement).scrollTop
        syllablesDiv.value?.scrollTo({ top: scrollTop })
        lineNumbersDiv.value?.scrollTo({ top: scrollTop })
        highlightedLinesContainer.value?.scrollTo({ top: scrollTop })
      })
    })
  },
}

function syncScroll(event: any) {
  const scrollTop = event.target.scrollTop
  syllablesDiv.value?.scrollTo({ top: scrollTop })
  lineNumbersDiv.value?.scrollTo({ top: scrollTop })
  highlightedLinesContainer.value?.scrollTo({ top: scrollTop })

  if (lyricsEditor.value && lyricsEditor.value.editor) {
    const editorElement = lyricsEditor.value.editor.getBody()
    if (editorElement) {
      editorElement.scrollTop = scrollTop
    }
  }
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
  lyricsInput.value = chart.parsed.chartLyrics

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
    watchLyricsTextRef()
  })
}

async function watchLyricsTextRef() {
  lineNumbers.value = updateLineNumbers(lyricsInput.value)

  /* if (!isRereadOnChange) chart = await parseChart(path) // Original LyricAdder behavior

  syllablesCount.value = updateSyllableCount(chart.parsed, lyricsInput.value.split("\n"))
  lineNumbers.value = updateLineNumbers(lyricsInput.value)
  highlightedIndices.value = wrongPhrases(
    syllablesCount.value.split("\n"),
    lyricsInput.value.split("\n")
  )
  updateHighlightedLines() */
}

// HOOKS:
watch(lyricsInput, watchLyricsTextRef)

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
        ref="lyricsEditor"
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

textarea {
  z-index: 1;
  overflow: hidden;
  resize: none;
  color: var(--text-900);
  overflow-wrap: normal;
}

.syllables {
  border-radius: var(--border-small) 0 0 var(--border-small);
  background: var(--background-100);
  width: 5ch;
  min-width: 5ch;
  text-align: right;
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
