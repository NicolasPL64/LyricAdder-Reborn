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
  <div class="toolbar">
    <button
      @click="applyFormatting('bold')"
      aria-label="Bold"
      v-tooltip="{ value: 'Bold', showDelay: 400 }"
    >
      <IconBold />
      <span class="shortcut">Ctrl+B</span>
    </button>
    <button
      @click="applyFormatting('italic')"
      aria-label="Italic"
      v-tooltip="{ value: 'Italic', showDelay: 400 }"
    >
      <IconItalics />
      <span class="shortcut">Ctrl+I</span>
    </button>
    <button
      @click="applyFormatting('underline')"
      aria-label="Underline"
      v-tooltip="{ value: 'Underline', showDelay: 400 }"
    >
      <IconUnderline />
      <span class="shortcut">Ctrl+U</span>
    </button>
    <button
      @click="applyFormatting('strikeThrough')"
      aria-label="Strikethrough"
      v-tooltip="{ value: 'Strikethrough', showDelay: 400 }"
    >
      <IconStrikethrough />
      <span class="shortcut">Ctrl+Shift+S</span>
    </button>
    <button
      @click="applyJoinSyllables"
      v-tooltip="{
        value: 'Joins two or more syllables together by replacing spaces with underscores',
        showDelay: 400,
      }"
    >
      Join syllables
      <span class="shortcut">Ctrl+Shift+A</span>
    </button>
  </div>
  <div class="container">
    <textarea
      class="syllables"
      ref="syllablesTextarea"
      v-model="syllablesCount"
      spellcheck="false"
      disabled="true"
      readonly
    ></textarea>
    <textarea
      class="line-numbers"
      ref="lineNumbersTextarea"
      v-model="lineNumbers"
      disabled="true"
      readonly
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
      <div
        v-if="richMode"
        class="lyrics lyrics-editor"
        ref="lyricsEditor"
        contenteditable="true"
        spellcheck="false"
        @input="onEditorInput"
        @scroll="syncScroll"
      ></div>
      <textarea
        v-else
        class="lyrics"
        ref="lyricsTextarea"
        v-model="lyricsText"
        spellcheck="false"
        @scroll="syncScroll"
        @input="updateHighlightedLines"
        :placeholder="
          isGayMode
            ? 'Ca-co-rro'
            : 'In-put the lyrics here\nSyl-la-ble by syl-la-ble\nEach line is a phrase in the chart'
        "
      ></textarea>
    </div>
  </div>
  <button @click="toggleRichMode">{{ richMode ? "Plain text" : "Rich text" }}</button>
  <button
    @click="saveFile"
    :disabled="highlightedIndices.length > 0 || chartErrors.length > 0"
    v-tooltip="{
      value: saveTooltipMessage,
      showDelay: 0,
      pt: { root: { style: 'max-width: 50rem' } },
    }"
  >
    <IconSave />Save chart
  </button>
</template>

<script setup lang="ts">
import IconLoad from "@/components/icons/IconLoad.vue"
import IconSave from "@/components/icons/IconSave.vue"
import IconBold from "@/components/icons/text/IconBold.vue"
import IconItalics from "@/components/icons/text/IconItalics.vue"
import IconUnderline from "@/components/icons/text/IconUnderline.vue"
import IconStrikethrough from "@/components/icons/text/IconStrikethrough.vue"

import { parseChart, type ChartError, type ParsedChartWithOriginal } from "@/utils/parseChart"
import { parseLyricsToChart } from "@/utils/saveChart"
import { loadLyricsSettings } from "@/utils/settings"
import {
  renderEditableHtml,
  serializeEditableHtml,
  toggleTag,
  joinSyllables,
  unjoinSyllables,
  INTERNAL_EQUALS,
} from "@/utils/lyricsMarkup"
import { unjoinJoinedSpans, joinSelectionSpan } from "@/utils/richJoin"
import { updateSyllableCount, updateLineNumbers } from "@/utils/updateLyricsInfoRefs"
import { createFileWatcher, removeFileWatcher } from "@/utils/watchFile"
import { wrongPhrases } from "@/utils/wrongPhrases"
import { open } from "@tauri-apps/plugin-dialog"
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onActivated,
  onDeactivated,
  onUnmounted,
} from "vue"

const lyricsText = ref("")
const syllablesCount = ref("")
const lineNumbers = ref("1")
const highlightedLines = ref<string[]>([]) // Array of lines to display in the highlighted lines container
const highlightedIndices = ref<number[]>([]) // Indices of the lines that should be highlighted
const chartErrors = ref<ChartError[]>([]) // Structural errors in the loaded chart
const richMode = ref(false) // Whether the lyrics are shown as rich text or plain

const saveTooltipMessage = computed(() => {
  if (chartErrors.value.length > 0) {
    return (
      "Some errors were found within the chart:\n" +
      chartErrors.value
        .map((error) => `• ${error.message} (@${error.timestamps.join(",")})`)
        .join("\n")
    )
  }
  if (highlightedIndices.value.length > 0) {
    return "Fix the highlighted phrases before saving"
  }
  return ""
})

const syllablesTextarea = ref<HTMLTextAreaElement | null>(null)
const lineNumbersTextarea = ref<HTMLTextAreaElement | null>(null)
const lyricsTextarea = ref<HTMLTextAreaElement | null>(null)
const highlightedLinesContainer = ref<HTMLTextAreaElement | null>(null)
const lyricsEditor = ref<HTMLElement | null>(null)

// Settings
let isRereadOnChange = false
const isGayMode = ref<boolean>(false)

// Coalesces the high-frequency scroll events of the scrollable lyrics column
// into a single DOM update per frame, so the follower columns (syllable count,
// line numbers, highlighted lines) stay in sync without jank.
let scrollRaf: number | null = null
let pendingScrollTop = 0

function syncColumnsTo(scrollTop: number) {
  if (syllablesTextarea.value) syllablesTextarea.value.scrollTop = scrollTop
  if (lineNumbersTextarea.value) lineNumbersTextarea.value.scrollTop = scrollTop
  if (lyricsTextarea.value) lyricsTextarea.value.scrollTop = scrollTop
  if (highlightedLinesContainer.value) highlightedLinesContainer.value.scrollTop = scrollTop
  if (lyricsEditor.value) lyricsEditor.value.scrollTop = scrollTop
}

function syncScroll(event: Event) {
  pendingScrollTop = (event.currentTarget as HTMLElement).scrollTop
  if (scrollRaf !== null) return
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = null
    syncColumnsTo(pendingScrollTop)
  })
}

function toggleRichMode() {
  // Preserve the scroll position across the v-if/v-else switch, since the
  // active element is destroyed and recreated.
  const scrollTop = lyricsEditor.value?.scrollTop ?? lyricsTextarea.value?.scrollTop ?? 0
  richMode.value = !richMode.value
  nextTick(() => {
    if (richMode.value) {
      const editor = lyricsEditor.value
      if (editor) editor.innerHTML = renderEditableHtml(lyricsText.value)
    }
    syncColumnsTo(scrollTop)
  })
}

// Sets the editor content from the plain lyrics text. Called only on external
// changes (mode switch, chart load, file watcher) so typing never resets the caret.
function syncEditorFromLyrics() {
  const editor = lyricsEditor.value
  if (!editor) return
  editor.innerHTML = renderEditableHtml(lyricsText.value)
}

// Serializes the rich editor back to plain lyrics text whenever the user types.
function onEditorInput() {
  const editor = lyricsEditor.value
  if (!editor) return
  lyricsText.value = serializeEditableHtml(editor.innerHTML)
}

function applyFormatting(command: "bold" | "italic" | "underline" | "strikeThrough") {
  if (richMode.value) {
    const editor = lyricsEditor.value
    if (!editor) return
    editor.focus()
    document.execCommand(command)
    onEditorInput()
    return
  }

  const textarea = lyricsTextarea.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  if (start === end) return
  const tag = { bold: "b", italic: "i", underline: "u", strikeThrough: "s" }[command]
  const selected = lyricsText.value.slice(start, end)
  const replacement = toggleTag(selected, tag)
  lyricsText.value = lyricsText.value.slice(0, start) + replacement + lyricsText.value.slice(end)
  textarea.focus()
  nextTick(() => textarea.setSelectionRange(start, start + replacement.length))
}

function applyJoinSyllables() {
  if (richMode.value) {
    const editor = lyricsEditor.value
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return
    if (!editor.contains(selection.getRangeAt(0).commonAncestorContainer)) return

    const range = selection.getRangeAt(0)
    const unjoined = unjoinJoinedSpans(range, editor)
    if (unjoined?.modified) {
      onEditorInput()
      if (unjoined.first && unjoined.last) {
        const restoredRange = document.createRange()
        restoredRange.setStartBefore(unjoined.first)
        restoredRange.setEndAfter(unjoined.last)
        selection.removeAllRanges()
        selection.addRange(restoredRange)
      }
      return
    }

    const joined = joinSelectionSpan(range, editor)
    if (joined) {
      onEditorInput()
      const restoredRange = document.createRange()
      restoredRange.setStartBefore(joined)
      restoredRange.setEndAfter(joined)
      selection.removeAllRanges()
      selection.addRange(restoredRange)
    }
  }

  const textarea = lyricsTextarea.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  if (start === end) return
  const selected = lyricsText.value.slice(start, end)
  const alreadyJoined = selected.includes("_") || selected.includes(INTERNAL_EQUALS)
  const replacement = alreadyJoined ? unjoinSyllables(selected) : joinSyllables(selected)
  lyricsText.value = lyricsText.value.slice(0, start) + replacement + lyricsText.value.slice(end)
  textarea.focus()
  nextTick(() => textarea.setSelectionRange(start, start + replacement.length))
}

function handleKeydown(event: KeyboardEvent) {
  if (!event.ctrlKey || event.altKey || event.metaKey) return
  const key = event.key.toLowerCase()

  if (key === "b" && !event.shiftKey) {
    event.preventDefault()
    applyFormatting("bold")
  } else if (key === "i" && !event.shiftKey) {
    event.preventDefault()
    applyFormatting("italic")
  } else if (key === "u" && !event.shiftKey) {
    event.preventDefault()
    applyFormatting("underline")
  } else if (key === "s" && event.shiftKey) {
    event.preventDefault()
    applyFormatting("strikeThrough")
  } else if (key === "a" && event.shiftKey) {
    event.preventDefault()
    applyJoinSyllables()
  }
}

function updateHighlightedLines() {
  highlightedLines.value = lyricsText.value.split("\n").map((line) => (line === "" ? " " : line))
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
  chartErrors.value = chart.parsed.errors
  lyricsText.value = chart.parsed.chartLyrics
  syncEditorFromLyrics()

  await setupFileWatcher()
}

async function saveFile() {
  // WARN: Supposedly, mouseenter events don't trigger on disabled elements on some browsers
  if (!path) return
  if (chartErrors.value.length > 0) return
  await parseLyricsToChart(lyricsText.value.split("\n"), path)

  // Refresh the view so it reflects the saved file
  chart = await parseChart(path)
  chartErrors.value = chart.parsed.errors
  watchLyricsTextRef()
}

async function setupFileWatcher() {
  try {
    await createFileWatcher(path, isRereadOnChange, (updatedChart) => {
      chart = updatedChart
      chartErrors.value = updatedChart.parsed.errors
      watchLyricsTextRef()
    })
  } catch (error) {
    console.error("Failed to set up the chart file watcher", error)
  }
}

async function watchLyricsTextRef() {
  if (!isRereadOnChange) {
    chart = await parseChart(path) // Original LyricAdder behavior
    chartErrors.value = chart.parsed.errors
  }

  syllablesCount.value = updateSyllableCount(chart.parsed, lyricsText.value.split("\n"))
  lineNumbers.value = updateLineNumbers(lyricsText.value.split("\n"))
  highlightedIndices.value = wrongPhrases(
    syllablesCount.value.split("\n"),
    lyricsText.value.split("\n")
  )
  updateHighlightedLines()
}

// HOOKS:
watch(lyricsText, watchLyricsTextRef)

onMounted(() => {
  ;({ isRereadOnChange: isRereadOnChange, isGayMode: isGayMode.value } = loadLyricsSettings())
  window.addEventListener("keydown", handleKeydown)
})

onActivated(async () => {
  ;({ isRereadOnChange: isRereadOnChange, isGayMode: isGayMode.value } = loadLyricsSettings())
  window.addEventListener("keydown", handleKeydown)
  if (path) {
    if (isRereadOnChange) {
      chart = await parseChart(path)
      chartErrors.value = chart.parsed.errors
      watchLyricsTextRef()
    }
    await setupFileWatcher()
  }
})

onDeactivated(() => {
  window.removeEventListener("keydown", handleKeydown)
  removeFileWatcher()
})

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown)
})
</script>

<style scoped>
:root {
  --lyrics-container-font-size: 0.9rem;
  --lyrics-container-line-height: 1.5;
  --lyrics-font-family: monospace; /* TODO: Yet to implement user option */
}

.container {
  display: flex;
  position: relative;
  height: 60vh;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.toolbar button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25em;
  margin: 0;
  padding: 0.5em;
}

.toolbar .shortcut {
  opacity: 0.6;
  font-size: 0.7em;
}

.container * {
  font-size: var(--lyrics-container-font-size);
  line-height: var(--lyrics-container-line-height);
  font-family: monospace;
}

.lyrics-editor {
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  outline: none;
  border-radius: 0 var(--border-small) var(--border-small) 0;
  background: transparent;
  padding-left: 5px;
  width: 100%;
  height: 100%;
  overflow: auto;
  text-align: left;
  white-space: pre;
  overflow-wrap: normal;
}

.lyrics-editor :deep(.joined) {
  position: relative;
  background: transparent;
}

.lyrics-editor :deep(.joined)::before {
  position: absolute;
  top: 2px;
  right: 0;
  bottom: 0;
  left: 0;
  opacity: 0.5;
  z-index: -1;
  border-radius: var(--border-small);
  background: var(--background-500);
  content: "";
}

.lyrics-editor :deep(.lowercase) {
  text-transform: lowercase;
}

.lyrics-editor :deep(.uppercase) {
  text-transform: uppercase;
}

.lyrics-editor :deep(.smallcaps) {
  font-variant: small-caps;
}

.highlighted-lines {
  position: absolute;
  top: 2px;
  padding-left: 4px;
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
  padding-left: 5px;
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
