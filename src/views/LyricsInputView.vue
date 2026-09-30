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
      v-tooltip="{ value: 'Bold.\n(Ctrl+B)', showDelay: 400 }"
    >
      <IconBold />
    </button>
    <button
      @click="applyFormatting('italic')"
      aria-label="Italic"
      v-tooltip="{ value: 'Italic.\n(Ctrl+I)', showDelay: 400 }"
    >
      <IconItalics />
    </button>
    <button
      @click="applyFormatting('underline')"
      aria-label="Underline"
      v-tooltip="{ value: 'Underline.\n(Ctrl+U)', showDelay: 400 }"
    >
      <IconUnderline />
    </button>
    <button
      @click="applyFormatting('strikeThrough')"
      aria-label="Strikethrough"
      v-tooltip="{ value: 'Strikethrough.\n(Ctrl+Shift+S)', showDelay: 400 }"
    >
      <IconStrikethrough />
    </button>
    <button
      @click="applyJoinSyllables"
      v-tooltip="{
        value:
          'Joins two or more syllables together by replacing spaces with underscores, and equals with a special character.\n(Ctrl+Shift+A)',
        showDelay: 400,
      }"
    >
      Join syllables
    </button>
    <ColorPickerTool ref="colorPicker" @opening="captureColorSelection" @apply="applyColor" />
    <div class="hyphen-group" v-tooltip.left="{ value: hyphenateTooltip, showDelay: 400 }">
      <span class="tooltip-wrapper">
        <button @click="hyphenateSelection" :disabled="richMode">Hyphenate!</button>
      </span>
      <DropdownMenu
        v-model="hyphenLanguage"
        :options="hyphenLanguages"
        :disabled="richMode"
        width="auto"
      />
    </div>
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
        :class="{ 'is-empty': lyricsText === '' }"
        :data-placeholder="lyricsPlaceholder"
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
        :placeholder="lyricsPlaceholder"
      ></textarea>
    </div>
  </div>
  <div class="bottom-bar">
    <span
      class="tooltip-wrapper"
      v-tooltip="{
        value: saveTooltipMessage,
        showDelay: 0,
        pt: { root: { style: 'max-width: 50rem' } },
      }"
    >
      <button @click="saveFile" :disabled="highlightedIndices.length > 0 || chartErrors.length > 0">
        <IconSave />Save chart
      </button>
    </span>
    <div class="rich-text-toggle">
      Rich text
      <ToggleSwitch
        :model-value="richMode"
        @update:model-value="setRichMode"
        aria-label="Rich text"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconLoad from "@/components/icons/IconLoad.vue"
import IconSave from "@/components/icons/IconSave.vue"
import IconBold from "@/components/icons/text/IconBold.vue"
import IconItalics from "@/components/icons/text/IconItalics.vue"
import IconUnderline from "@/components/icons/text/IconUnderline.vue"
import IconStrikethrough from "@/components/icons/text/IconStrikethrough.vue"
import ToggleSwitch from "openvue/toggleswitch"
import DropdownMenu from "@/components/DropdownMenu.vue"
import ColorPickerTool from "@/components/ColorPickerTool.vue"

import { parseChart, type ChartError, type ParsedChartWithOriginal } from "@/utils/parseChart"
import { parseLyricsToChart } from "@/utils/saveChart"
import { loadLyricsSettings } from "@/utils/settings"
import {
  backupBeforeSave,
  backupLyrics,
  clearLyricsBackups,
  getLatestBackups,
  pruneChartBackups,
  readBackup,
} from "@/utils/backup"
import { hyphenateLyrics, hyphenLanguages } from "@/utils/hyphenateLyrics"
import {
  renderEditableHtml,
  serializeEditableHtml,
  toggleTag,
  joinSyllables,
  unjoinSyllables,
  INTERNAL_EQUALS,
} from "@/utils/lyricsMarkup"
import {
  unjoinJoinedSpans,
  joinSelectionSpan,
  textOffsetAt,
  restoreSelectionAt,
} from "@/utils/richJoin"
import { updateSyllableCount, updateLineNumbers } from "@/utils/updateLyricsInfoRefs"
import { createFileWatcher, removeFileWatcher } from "@/utils/watchFile"
import { wrongPhrases } from "@/utils/wrongPhrases"
import {
  tokenizeLine,
  markupOffsetToText,
  textToMarkupOffset,
  lineTextLength,
  detectColorInRange,
  recolorLine,
} from "@/utils/recolorMarkup"
import { open, ask } from "@tauri-apps/plugin-dialog"
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
const hyphenLanguage = ref("en") // Language used by the Hyphenate button

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

const hyphenateTooltip = computed(() =>
  richMode.value ? "Only available in plain text mode" : "Splits the selected words into syllables"
)

const syllablesTextarea = ref<HTMLTextAreaElement | null>(null)
const lineNumbersTextarea = ref<HTMLTextAreaElement | null>(null)
const lyricsTextarea = ref<HTMLTextAreaElement | null>(null)
const highlightedLinesContainer = ref<HTMLTextAreaElement | null>(null)
const lyricsEditor = ref<HTMLElement | null>(null)

// Settings
let isRereadOnChange = false
const isGayMode = ref<boolean>(false)

const lyricsPlaceholder = computed(() =>
  isGayMode.value
    ? "Ca-co-rro"
    : "In-put the lyrics here\nSyl-la-ble by syl-la-ble\nEach line is a phrase in the chart"
)

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

function setRichMode(value: boolean) {
  if (value === richMode.value) return
  // Preserve the scroll position across the v-if/v-else switch, since the
  // active element is destroyed and recreated.
  const scrollTop = lyricsEditor.value?.scrollTop ?? lyricsTextarea.value?.scrollTop ?? 0
  richMode.value = value
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
    // The selection is rebuilt from stable text offsets after the DOM mutation.
    // extractContents() invalidates ranges that reference the removed nodes, and
    // the restore is deferred to a macrotask so the browser has settled its own
    // (collapsed) selection before addRange is applied.
    const start = textOffsetAt(editor, range.startContainer, range.startOffset)
    const end = textOffsetAt(editor, range.endContainer, range.endOffset)

    const unjoined = unjoinJoinedSpans(range, editor)
    if (unjoined?.modified) {
      onEditorInput()
      restoreSelectionAt(editor, start, end)
      return
    }

    const joined = joinSelectionSpan(range, editor)
    if (joined) {
      onEditorInput()
      restoreSelectionAt(editor, start, end)
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

// Color picker integration. The selection is snapshotted when the picker opens
// (on mousedown, before the panel steals focus) as per-line visible-text ranges,
// so recoloring works in both plain and rich mode. The detected color (a single
// marker covering the whole selection) pre-fills the picker.
interface ColorLineRange {
  lineIndex: number
  s: number
  e: number
}

const colorPicker = ref<InstanceType<typeof ColorPickerTool> | null>(null)
const capturedColorRanges = ref<ColorLineRange[] | null>(null)
const capturedTextOffsets = ref<{ start: number; end: number } | null>(null)

function markupSelectionToLineRanges(lyrics: string, ms: number, me: number): ColorLineRange[] {
  const lines = lyrics.split("\n")
  const ranges: ColorLineRange[] = []
  let offset = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineStart = offset
    const lineEnd = offset + line.length
    const sMarkup = Math.max(ms, lineStart)
    const eMarkup = Math.min(me, lineEnd)
    if (sMarkup < eMarkup) {
      const s = markupOffsetToText(line, sMarkup - lineStart)
      const e = markupOffsetToText(line, eMarkup - lineStart)
      if (s < e) ranges.push({ lineIndex: i, s, e })
    }
    offset = lineEnd + 1 // skip the "\n" separator
  }
  return ranges
}

function textSelectionToLineRanges(lyrics: string, ts: number, te: number): ColorLineRange[] {
  const lines = lyrics.split("\n")
  const ranges: ColorLineRange[] = []
  let offset = 0
  for (let i = 0; i < lines.length; i++) {
    const len = lineTextLength(lines[i])
    const s = Math.max(ts, offset)
    const e = Math.min(te, offset + len)
    if (s < e) ranges.push({ lineIndex: i, s: s - offset, e: e - offset })
    offset += len
  }
  return ranges
}

function detectSelectionColor(lyrics: string, ranges: ColorLineRange[]): string | null {
  const lines = lyrics.split("\n")
  let detected: string | null = null
  for (const range of ranges) {
    const color = detectColorInRange(tokenizeLine(lines[range.lineIndex]), range.s, range.e)
    if (color === null) return null
    if (detected === null) detected = color
    else if (detected !== color) return null
  }
  return detected
}

function captureColorSelection() {
  let ranges: ColorLineRange[]
  if (richMode.value) {
    const editor = lyricsEditor.value
    if (!editor) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) return
    const start = textOffsetAt(editor, range.startContainer, range.startOffset)
    const end = textOffsetAt(editor, range.endContainer, range.endOffset)
    capturedTextOffsets.value = { start, end }
    ranges = textSelectionToLineRanges(lyricsText.value, start, end)
  } else {
    const textarea = lyricsTextarea.value
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    if (start === end) return
    capturedTextOffsets.value = null
    ranges = markupSelectionToLineRanges(lyricsText.value, start, end)
  }
  capturedColorRanges.value = ranges
  const detected = detectSelectionColor(lyricsText.value, ranges)
  if (detected) colorPicker.value?.setColor(detected)
}

// Recolors the captured selection: each affected line wraps its selected text
// in `<color=hex>`, preserving non-color markup and the colors outside the
// selection. In rich mode the editor is re-rendered and the selection restored
// by its (unchanged) visible-text offsets.
function applyColor(hex: string) {
  const ranges = capturedColorRanges.value
  if (!ranges || ranges.length === 0) return

  const lines = lyricsText.value.split("\n")
  for (const range of ranges) {
    const tokens = tokenizeLine(lines[range.lineIndex])
    lines[range.lineIndex] = recolorLine(tokens, range.s, range.e, hex)
  }
  lyricsText.value = lines.join("\n")
  capturedColorRanges.value = null

  if (richMode.value) {
    const editor = lyricsEditor.value
    const offsets = capturedTextOffsets.value
    capturedTextOffsets.value = null
    if (!editor || !offsets) return
    syncEditorFromLyrics()
    restoreSelectionAt(editor, offsets.start, offsets.end)
    return
  }

  const textarea = lyricsTextarea.value
  if (!textarea) return
  const newLines = lyricsText.value.split("\n")
  const first = ranges[0]
  const last = ranges[ranges.length - 1]
  let lineStart = 0
  let selStart = 0
  let selEnd = 0
  for (let i = 0; i <= last.lineIndex; i++) {
    if (i === first.lineIndex)
      selStart = lineStart + textToMarkupOffset(newLines[i], first.s, "start")
    if (i === last.lineIndex) selEnd = lineStart + textToMarkupOffset(newLines[i], last.e, "end")
    lineStart += newLines[i].length + 1
  }
  textarea.focus()
  nextTick(() => textarea.setSelectionRange(selStart, selEnd))
}

async function hyphenateSelection() {
  if (richMode.value) return
  const textarea = lyricsTextarea.value
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  if (start === end) return
  const selected = lyricsText.value.slice(start, end)
  const hyphenated = await hyphenateLyrics(selected, hyphenLanguage.value)
  lyricsText.value = lyricsText.value.slice(0, start) + hyphenated + lyricsText.value.slice(end)
  textarea.focus()
  nextTick(() => textarea.setSelectionRange(start, start + hyphenated.length))
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

// Automatic backups (crash / power-loss safety): the plain lyrics text is saved
// on a fixed interval while editing, and the on-disk chart is snapshotted right
// before each save. Backups live under the app-local data dir, keyed by a hash
// of the chart path. Nothing is written when the text has not changed.
const BACKUP_INTERVAL_MS = 15000
let lastBackedUpText = "" // The text the newest lyrics backup already reflects
let backupInterval: number | null = null
let isFlushing = false

// Forces a lyrics backup now. Does nothing if the text is already backed up
// (the last created copy is enough; closing/leaving never forces a new one).
async function flushLyricsBackup() {
  if (isFlushing) return
  if (!path || lyricsText.value === lastBackedUpText) return
  isFlushing = true
  try {
    await backupLyrics(path, lyricsText.value)
    lastBackedUpText = lyricsText.value
  } catch (error) {
    console.error("Failed to back up the lyrics text", error)
  } finally {
    isFlushing = false
  }
}

async function promptForBackupRecovery() {
  if (!path) return
  const latest = await getLatestBackups(path)
  if (!latest.lyrics) return

  const restore = await ask(
    "This song has unsaved lyrics from a previous session.\nRestore them?",
    { title: "Unsaved lyrics found", kind: "warning", okLabel: "Restore", cancelLabel: "Discard" }
  )
  if (!restore) {
    await clearLyricsBackups(path)
    return
  }
  try {
    lyricsText.value = await readBackup(latest.lyrics)
    syncEditorFromLyrics()
    lastBackedUpText = lyricsText.value
  } catch (error) {
    console.error("Failed to restore the lyrics backup", error)
  }
}

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
  lastBackedUpText = lyricsText.value // Nothing to back up right after loading

  await setupFileWatcher()
  await promptForBackupRecovery()
}

async function saveFile() {
  if (!path) return
  if (chartErrors.value.length > 0) return

  // Snapshot the on-disk chart before overwriting it, so a failed write never
  // destroys the previous state.
  await backupBeforeSave(path)
  await parseLyricsToChart(lyricsText.value.split("\n"), path)

  // Refresh the view so it reflects the saved file
  chart = await parseChart(path)
  chartErrors.value = chart.parsed.errors
  watchLyricsTextRef()

  // The lyrics are now on disk, so their session backups are no longer needed.
  lastBackedUpText = lyricsText.value
  await clearLyricsBackups(path)
  await pruneChartBackups(path)
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
  backupInterval = window.setInterval(() => void flushLyricsBackup(), BACKUP_INTERVAL_MS)
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
  void flushLyricsBackup()
})

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown)
  if (backupInterval !== null) {
    clearInterval(backupInterval)
    backupInterval = null
  }
  void flushLyricsBackup()
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

.hyphen-group {
  display: flex;
  align-items: stretch;
  gap: 0;
  margin-left: auto;
}

.hyphen-group button {
  border-radius: var(--border-small) 0 0 var(--border-small);
}

.hyphen-group :deep(.custom-select) {
  display: flex;
}

.hyphen-group :deep(.custom-select .selected-option) {
  flex: 1;
  align-items: center;
  border-radius: 0 var(--border-small) var(--border-small) 0;
}

.tooltip-wrapper {
  display: inline-flex;
}

.tooltip-wrapper > button:disabled {
  pointer-events: none;
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
  border: 1px solid var(--background-400);
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
  border: 1px solid var(--background-400);
  border-radius: 0 var(--border-small) var(--border-small) 0;
  background: transparent;
  padding-left: 5px;
  width: 100%;
  height: 100%;
  overflow: auto;
  text-align: left;
}

.lyrics:focus-visible,
.lyrics-editor:focus-visible {
  outline: 2px solid var(--primary-400);
  outline-offset: -1px;
}

.lyricsBG {
  position: absolute;
  z-index: -1;
  background: var(--background-100);
  width: 100%;
  height: 100%;
}

.lyrics-editor.is-empty::before {
  position: absolute;
  top: 0;
  left: 5px;
  pointer-events: none;
  content: attr(data-placeholder);
  color: var(--text-400);
}

textarea::placeholder {
  color: var(--text-400);
}

.bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rich-text-toggle {
  display: flex;
  align-items: center;
  gap: 0.5em;
}
</style>
