import { nextTick, ref, type Ref } from "vue"

import ColorPickerTool from "@/components/ColorPickerTool.vue"
import { restoreSelectionAt, textOffsetAt } from "@/utils/richJoin"
import {
    detectColorInRange,
    lineTextLength,
    markupOffsetToText,
    recolorLine,
    textToMarkupOffset,
    tokenizeLine,
} from "@/utils/recolorMarkup"

// The selection is snapshotted when the picker opens (on mousedown, before the
// panel steals focus) as per-line visible-text ranges, so recoloring works in
// both plain and rich mode. The detected color (a single marker covering the
// whole selection) pre-fills the picker.
interface ColorLineRange {
    lineIndex: number
    s: number
    e: number
}

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

export function useColorSelection(
    lyricsText: Ref<string>,
    richMode: Ref<boolean>,
    lyricsEditor: Ref<HTMLElement | null>,
    lyricsTextarea: Ref<HTMLTextAreaElement | null>,
    syncEditorFromLyrics: () => void
) {
    const colorPicker = ref<InstanceType<typeof ColorPickerTool> | null>(null)
    const capturedColorRanges = ref<ColorLineRange[] | null>(null)
    const capturedTextOffsets = ref<{ start: number; end: number } | null>(null)

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
            if (i === last.lineIndex)
                selEnd = lineStart + textToMarkupOffset(newLines[i], last.e, "end")
            lineStart += newLines[i].length + 1
        }
        textarea.focus()
        nextTick(() => textarea.setSelectionRange(selStart, selEnd))
    }

    return { colorPicker, captureColorSelection, applyColor }
}
