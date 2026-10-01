import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ColorPickerTool from "@/components/ColorPickerTool.vue"
import * as patchChartEvents from "@/utils/patchChartEvents"
import { INTERNAL_EQUALS } from "@/utils/lyricsMarkup"
import { ChartIO } from "@/utils/herochartio"

import test1ChartContent from "../../files/test1.chart?raw"
import { buildChart, lyricNames } from "../helpers/chart"
import { mockSelection, rangeOver } from "../helpers/dom"
import { fsMock } from "../helpers/tauriMocks"
import {
    findButton,
    loadChart,
    mountView,
    textareaValue,
    toggleRichMode,
} from "../helpers/lyricsInputView"

vi.mock("@/utils/patchChartEvents", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/patchChartEvents")>()
    return {
        ...actual,
        saveChartEventsOnly: vi.fn(),
    }
})

describe("LyricsInputView", () => {
    beforeEach(() => {
        localStorage.clear()
        fsMock.mkdir.mockResolvedValue(undefined)
        fsMock.readDir.mockResolvedValue([])
        fsMock.readTextFile.mockResolvedValue("chart")
        fsMock.writeTextFile.mockResolvedValue(undefined)
        fsMock.rename.mockResolvedValue(undefined)
        fsMock.remove.mockResolvedValue(undefined)
    })

    it("loads a real fixture and shows the lyrics, syllable counts and invalid phrases", async () => {
        const wrapper = mountView()

        await loadChart(wrapper, ChartIO.parse(test1ChartContent))

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("ñ  a\né")
        expect(textareaValue(wrapper, "textarea.syllables")).toBe("2/3\n1/2\n")
        expect(textareaValue(wrapper, "textarea.line-numbers")).toBe("1\n2\n")
        expect(wrapper.findAll(".highlighted-lines .highlight")).toHaveLength(2)
        expect(findButton(wrapper, "Save chart").attributes("disabled")).toBeDefined()
    })

    it("disables saving while a phrase has the wrong syllable count and re-enables it after fixing", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "lyric two"
                3 = E "phrase_end"
                4 = E "phrase_start"
                5 = E "lyric three"
                6 = E "phrase_end"
            `)
        )

        const saveButton = findButton(wrapper, "Save chart")
        expect(saveButton.attributes("disabled")).toBeUndefined()

        await wrapper.find("textarea.lyrics").setValue("one two\nthree four")
        await flushPromises()

        expect(saveButton.attributes("disabled")).toBeDefined()
        expect(wrapper.findAll(".highlighted-lines .highlight")).toHaveLength(1)

        await wrapper.find("textarea.lyrics").setValue("one two\nthree")
        await flushPromises()

        expect(saveButton.attributes("disabled")).toBeUndefined()
    })

    it("saves the edited lyrics as chart lyric events", async () => {
        const wrapper = mountView()
        vi.mocked(patchChartEvents.saveChartEventsOnly).mockResolvedValue(undefined)
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "lyric two"
                3 = E "phrase_end"
                4 = E "phrase_start"
                5 = E "lyric three"
                6 = E "phrase_end"
            `)
        )

        await wrapper.find("textarea.lyrics").setValue("one two\nthree")
        await flushPromises()
        await findButton(wrapper, "Save chart").trigger("click")
        await flushPromises()

        const events = vi.mocked(patchChartEvents.saveChartEventsOnly).mock.calls[0][0]

        expect(lyricNames(events)).toEqual(["lyric one", "lyric two", "lyric three"])
        expect(patchChartEvents.saveChartEventsOnly).toHaveBeenCalledWith(
            expect.anything(),
            "song.chart"
        )
    })

    it("renders the lyrics as rich text when rich mode is enabled", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric <i>one"
                2 = E "lyric two_three"
                3 = E "phrase_end"
            `)
        )

        expect(wrapper.find(".lyrics-editor").exists()).toBe(false)

        await toggleRichMode(wrapper)

        const editor = wrapper.find(".lyrics-editor")
        expect(editor.exists()).toBe(true)
        expect(editor.element.innerHTML).toBe(
            '<div><i>one <span class="joined">two three</span></i></div>'
        )
    })

    it("serializes the rich editor back to plain lyrics on input", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "lyric two"
                3 = E "phrase_end"
            `)
        )
        await toggleRichMode(wrapper)

        const editor = wrapper.find(".lyrics-editor")
        editor.element.innerHTML = "<div>one <b>two</b></div>"
        await editor.trigger("input")
        await flushPromises()

        await toggleRichMode(wrapper)

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("one <b>two</b>")
    })

    it("preserves runs of underscores when editing in rich mode", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric ____Wit_it!"
                2 = E "phrase_end"
            `)
        )

        await toggleRichMode(wrapper)

        await wrapper.find(".lyrics-editor").trigger("input")
        await flushPromises()

        await toggleRichMode(wrapper)

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("____Wit_it!")
    })

    it("preserves literal equals signs (syllable separators) through a rich-mode edit", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric a="
                2 = E "lyric b c"
                3 = E "phrase_end"
            `)
        )

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("a=b_c")
        expect(textareaValue(wrapper, "textarea.syllables")).toBe("2/2\n")
        expect(wrapper.findAll(".highlighted-lines .highlight")).toHaveLength(0)

        await toggleRichMode(wrapper)

        await wrapper.find(".lyrics-editor").trigger("input")
        await flushPromises()

        await toggleRichMode(wrapper)

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("a=b_c")
        expect(textareaValue(wrapper, "textarea.syllables")).toBe("2/2\n")
        expect(wrapper.findAll(".highlighted-lines .highlight")).toHaveLength(0)
    })

    it("toggles bold on the editor selection", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "lyric two"
                3 = E "phrase_end"
            `)
        )
        await toggleRichMode(wrapper)

        const editor = wrapper.find(".lyrics-editor")
        editor.element.innerHTML = "<div>one two</div>"
        document.execCommand = vi.fn()

        await wrapper.find('button[aria-label="Bold"]').trigger("click")
        await flushPromises()

        expect(document.execCommand).toHaveBeenCalledWith("bold")
    })

    it("un-joins a joined selection in plain mode", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric aaa_bbb_ccc"
                2 = E "phrase_end"
            `)
        )

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(4, 10) // "bb_ccc"
        await findButton(wrapper, "Join syllables").trigger("click")

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("aaa_bbb ccc")
    })

    it("un-joins a joined selection in rich mode", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric aaa_bbb_ccc"
                2 = E "phrase_end"
            `)
        )
        await toggleRichMode(wrapper)

        const editor = wrapper.find(".lyrics-editor")
        mockSelection(rangeOver(editor.element as HTMLElement, 4, 10)) // "bb_ccc"

        await findButton(wrapper, "Join syllables").trigger("click")
        await flushPromises()

        expect(editor.element.innerHTML).toBe('<div><span class="joined">aaa bbb</span> ccc</div>')

        await toggleRichMode(wrapper)

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("aaa_bbb ccc")
    })

    it("converts a literal equals into an internal equals when joining in plain mode", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric a="
                2 = E "lyric b"
                3 = E "phrase_end"
            `)
        )

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(0, 3) // "a=b"
        await findButton(wrapper, "Join syllables").trigger("click")

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe(`a${INTERNAL_EQUALS}b`)
    })

    it("joins a selection partially overlapping a joined span into one span", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric aaa"
                2 = E "lyric bbb_ccc"
                3 = E "phrase_end"
            `)
        )
        await toggleRichMode(wrapper)

        const editor = wrapper.find(".lyrics-editor")
        mockSelection(rangeOver(editor.element as HTMLElement, 0, 5)) // "aaa bb"

        await findButton(wrapper, "Join syllables").trigger("click")
        await flushPromises()

        expect(editor.element.innerHTML).toBe('<div><span class="joined">aaa bbb ccc</span></div>')

        await toggleRichMode(wrapper)

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("aaa_bbb_ccc")
    })

    it("joins a selection adjacent to a joined span into one span", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric aa"
                2 = E "lyric bb_cc"
                3 = E "phrase_end"
            `)
        )
        await toggleRichMode(wrapper)

        const editor = wrapper.find(".lyrics-editor")
        mockSelection(rangeOver(editor.element as HTMLElement, 0, 3)) // "aa "

        await findButton(wrapper, "Join syllables").trigger("click")
        await flushPromises()

        expect(editor.element.innerHTML).toBe('<div><span class="joined">aa bb cc</span></div>')

        await toggleRichMode(wrapper)

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("aa_bb_cc")
    })

    it("hyphenates only the selected words in plain mode", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric hello"
                2 = E "lyric world"
                3 = E "phrase_end"
            `)
        )

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(0, 5) // "hello"
        await findButton(wrapper, "Hyphenate!").trigger("click")

        await vi.waitFor(() => {
            expect(textareaValue(wrapper, "textarea.lyrics")).toBe("hel-lo world")
        })
    })

    it("disables the Hyphenate button in rich mode", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric hello"
                2 = E "phrase_end"
            `)
        )
        await toggleRichMode(wrapper)

        expect(findButton(wrapper, "Hyphenate!").attributes("disabled")).toBeDefined()
    })

    it("wraps the plain-text selection in a color tag", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "lyric two"
                3 = E "phrase_end"
            `)
        )

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(0, 3) // "one"
        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")
        await wrapper.find('button[aria-label="Aplicar"]').trigger("click")

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("<color=#ff0000>one</color> two")
    })

    it("detects the color of the selection and pre-fills the picker", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "phrase_end"
            `)
        )
        await wrapper.find("textarea.lyrics").setValue("<color=#8bd6d4>asd</color>")
        await flushPromises()

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(15, 21) // the "asd" content (opening tag is 15 chars)
        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")

        expect((wrapper.find(".hex-value").element as HTMLInputElement).value).toBe("#8bd6d4")
    })

    it("applies an 8-digit hex when alpha is lowered", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "lyric two"
                3 = E "phrase_end"
            `)
        )

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(0, 3) // "one"
        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")
        await wrapper.find('input[aria-label="Alpha"]').setValue("128")

        expect((wrapper.find(".hex-value").element as HTMLInputElement).value).toBe("#ff000080")

        await wrapper.find('button[aria-label="Aplicar"]').trigger("click")

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("<color=#ff000080>one</color> two")
    })

    it("pre-fills the alpha slider from an 8-digit hex and reapplies it", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "phrase_end"
            `)
        )
        await wrapper.find("textarea.lyrics").setValue("<color=#8bd6d480>asd</color>")
        await flushPromises()

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(17, 24) // the "asd" content (opening tag is 17 chars)
        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")

        expect((wrapper.find(".hex-value").element as HTMLInputElement).value).toBe("#8bd6d480")
        expect((wrapper.find('input[aria-label="Alpha"]').element as HTMLInputElement).value).toBe(
            "128"
        )

        await wrapper.find('button[aria-label="Aplicar"]').trigger("click")

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("<color=#8bd6d480>asd</color>")
    })

    it("prepends # and applies the typed color on blur", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "lyric two"
                3 = E "phrase_end"
            `)
        )

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(0, 3) // "one"
        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")

        await wrapper.find(".hex-value").setValue("135c5a")

        expect((wrapper.find(".hex-value").element as HTMLInputElement).value).toBe("#135c5a")

        await wrapper.find(".hex-value").trigger("blur")
        await wrapper.find('button[aria-label="Aplicar"]').trigger("click")

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("<color=#135c5a>one</color> two")
    })

    it("applies the typed alpha on blur when typing an 8-digit hex value", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "lyric two"
                3 = E "phrase_end"
            `)
        )

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(0, 3) // "one"
        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")

        await wrapper.find(".hex-value").setValue("ff000080")

        expect((wrapper.find(".hex-value").element as HTMLInputElement).value).toBe("#ff000080")

        await wrapper.find(".hex-value").trigger("blur")

        expect((wrapper.find('input[aria-label="Alpha"]').element as HTMLInputElement).value).toBe(
            "128"
        )

        await wrapper.find('button[aria-label="Aplicar"]').trigger("click")

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("<color=#ff000080>one</color> two")
    })

    it("truncates input beyond 9 characters and strips invalid characters", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "phrase_end"
            `)
        )

        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")

        await wrapper.find(".hex-value").setValue("ff000080ff0000extra!!")

        expect((wrapper.find(".hex-value").element as HTMLInputElement).value).toBe("#ff000080")
    })

    it("selects all the text when the hex value input is focused", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "phrase_end"
            `)
        )

        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")

        const input = wrapper.find(".hex-value")
        await input.trigger("focus")

        const el = input.element as HTMLInputElement
        expect(el.selectionStart).toBe(0)
        expect(el.selectionEnd).toBe(el.value.length)
    })

    it("replaces the color of a fully selected marker", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "phrase_end"
            `)
        )
        await wrapper.find("textarea.lyrics").setValue("<color=#8bd6d4>asd</color>")
        await flushPromises()

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(0, 24) // whole marker (visible text "asd")
        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")
        wrapper.findComponent(ColorPickerTool).vm.setColor("#135c5a")
        await wrapper.find('button[aria-label="Aplicar"]').trigger("click")

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("<color=#135c5a>asd</color>")
    })

    it("splits a partially selected marker keeping the surrounding color", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "phrase_end"
            `)
        )
        await wrapper.find("textarea.lyrics").setValue("<color=#8bd6d4>asdfgh</color>")
        await flushPromises()

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.setSelectionRange(17, 19) // "df"
        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")
        wrapper.findComponent(ColorPickerTool).vm.setColor("#135c5a")
        await wrapper.find('button[aria-label="Aplicar"]').trigger("click")

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe(
            "<color=#8bd6d4>as</color><color=#135c5a>df</color><color=#8bd6d4>gh</color>"
        )
    })

    it("wraps the rich-text selection in a color tag", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "lyric two"
                3 = E "phrase_end"
            `)
        )
        await toggleRichMode(wrapper)

        const editor = wrapper.find(".lyrics-editor")
        mockSelection(rangeOver(editor.element as HTMLElement, 0, 3)) // "one"
        const colorButton = wrapper.find('button[aria-label="Apply a color"]')
        await colorButton.trigger("mousedown")
        await colorButton.trigger("click")
        await wrapper.find('button[aria-label="Aplicar"]').trigger("click")
        await flushPromises()

        expect(editor.element.innerHTML).toBe(
            '<div><span data-tmp="color" data-tmp-value="#ff0000" style="color:#ff0000">one</span> two</div>'
        )

        await toggleRichMode(wrapper)

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("<color=#ff0000>one</color> two")
    })

    it("preserves the scroll position when toggling between rich and plain mode", async () => {
        const wrapper = mountView()
        const manyLines = Array.from(
            { length: 40 },
            (_, i) => `    ${i * 4} = E "phrase_start"
    ${i * 4 + 1} = E "lyric word${i}"`
        ).join("\n")
        await loadChart(
            wrapper,
            buildChart(`
                ${manyLines}
            `)
        )

        const textarea = wrapper.find("textarea.lyrics").element as HTMLTextAreaElement
        textarea.scrollTop = 120
        expect(textarea.scrollTop).toBe(120)

        await toggleRichMode(wrapper)

        const editor = wrapper.find(".lyrics-editor")
        expect(editor.element.scrollTop).toBe(120)

        editor.element.scrollTop = 80

        await toggleRichMode(wrapper)

        expect(textareaValue(wrapper, "textarea.lyrics")).toContain("word0")
        expect((wrapper.find("textarea.lyrics").element as HTMLTextAreaElement).scrollTop).toBe(80)
    })

    it("normalizes the whole text when clicking Normalize", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "phrase_end"
            `)
        )

        await wrapper.find("textarea.lyrics").setValue("hello,\nworld...")
        await flushPromises()
        await findButton(wrapper, "Normalize").trigger("click")
        await flushPromises()

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("Hello\nWorld...")
    })

    it("highlights the Normalize button while the text needs normalization", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric one"
                2 = E "phrase_end"
            `)
        )

        const normalizeButton = findButton(wrapper, "Normalize")
        await wrapper.find("textarea.lyrics").setValue("hello,\nworld...")
        await flushPromises()

        expect(normalizeButton.classes()).toContain("needs-fix")

        await normalizeButton.trigger("click")
        await flushPromises()

        expect(normalizeButton.classes()).not.toContain("needs-fix")
    })

    it("disables the Normalize button when there is nothing to normalize", async () => {
        const wrapper = mountView()
        await loadChart(
            wrapper,
            buildChart(`
                0 = E "phrase_start"
                1 = E "lyric One"
                2 = E "phrase_end"
            `)
        )

        const normalizeButton = findButton(wrapper, "Normalize")
        expect(normalizeButton.attributes("disabled")).toBeDefined()

        await wrapper.find("textarea.lyrics").setValue("hello,\nworld...")
        await flushPromises()

        expect(normalizeButton.attributes("disabled")).toBeUndefined()
    })
})
