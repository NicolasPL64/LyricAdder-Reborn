import { flushPromises, mount, type VueWrapper } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import LyricsInputView from "@/views/LyricsInputView.vue"
import * as patchChartEvents from "@/utils/patchChartEvents"
import { INTERNAL_EQUALS } from "@/utils/lyricsMarkup"
import { ChartIO, type Chart } from "@/utils/herochartio"
import { open } from "@tauri-apps/plugin-dialog"

import test1ChartContent from "../../files/test1.chart?raw"
import { buildChart, lyricNames } from "../helpers/chart"
import { mockSelection, rangeOver } from "../helpers/dom"

vi.mock("@tauri-apps/plugin-dialog", () => ({
    open: vi.fn(),
}))

vi.mock("@/utils/patchChartEvents", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/patchChartEvents")>()
    return {
        ...actual,
        saveChartEventsOnly: vi.fn(),
    }
})

function mountView() {
    return mount(LyricsInputView, {
        global: {
            directives: { tooltip: {} },
        },
    })
}

function findButton(wrapper: VueWrapper, text: string) {
    const button = wrapper.findAll("button").find((candidate) => candidate.text().includes(text))
    if (!button) throw new Error(`Button "${text}" not found`)
    return button
}

function textareaValue(wrapper: VueWrapper, selector: string) {
    return (wrapper.find(selector).element as HTMLTextAreaElement).value
}

async function loadChart(wrapper: VueWrapper, chart: Chart) {
    vi.mocked(open).mockResolvedValue("song.chart")
    vi.spyOn(ChartIO, "load").mockResolvedValue(chart)
    await findButton(wrapper, "Load chart").trigger("click")
    await flushPromises()
}

describe("LyricsInputView", () => {
    beforeEach(() => {
        localStorage.clear()
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

        await findButton(wrapper, "Rich text").trigger("click")
        await flushPromises()

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
        await findButton(wrapper, "Rich text").trigger("click")
        await flushPromises()

        const editor = wrapper.find(".lyrics-editor")
        editor.element.innerHTML = "<div>one <b>two</b></div>"
        await editor.trigger("input")
        await flushPromises()

        await findButton(wrapper, "Plain text").trigger("click")
        await flushPromises()

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

        await findButton(wrapper, "Rich text").trigger("click")
        await flushPromises()

        await wrapper.find(".lyrics-editor").trigger("input")
        await flushPromises()

        await findButton(wrapper, "Plain text").trigger("click")
        await flushPromises()

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

        await findButton(wrapper, "Rich text").trigger("click")
        await flushPromises()

        await wrapper.find(".lyrics-editor").trigger("input")
        await flushPromises()

        await findButton(wrapper, "Plain text").trigger("click")
        await flushPromises()

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
        await findButton(wrapper, "Rich text").trigger("click")
        await flushPromises()

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
        await findButton(wrapper, "Rich text").trigger("click")
        await flushPromises()

        const editor = wrapper.find(".lyrics-editor")
        mockSelection(rangeOver(editor.element as HTMLElement, 4, 10)) // "bb_ccc"

        await findButton(wrapper, "Join syllables").trigger("click")
        await flushPromises()

        expect(editor.element.innerHTML).toBe('<div><span class="joined">aaa bbb</span> ccc</div>')

        await findButton(wrapper, "Plain text").trigger("click")
        await flushPromises()

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
        await findButton(wrapper, "Rich text").trigger("click")
        await flushPromises()

        const editor = wrapper.find(".lyrics-editor")
        mockSelection(rangeOver(editor.element as HTMLElement, 0, 5)) // "aaa bb"

        await findButton(wrapper, "Join syllables").trigger("click")
        await flushPromises()

        expect(editor.element.innerHTML).toBe('<div><span class="joined">aaa bbb ccc</span></div>')

        await findButton(wrapper, "Plain text").trigger("click")
        await flushPromises()

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
        await findButton(wrapper, "Rich text").trigger("click")
        await flushPromises()

        const editor = wrapper.find(".lyrics-editor")
        mockSelection(rangeOver(editor.element as HTMLElement, 0, 3)) // "aa "

        await findButton(wrapper, "Join syllables").trigger("click")
        await flushPromises()

        expect(editor.element.innerHTML).toBe('<div><span class="joined">aa bb cc</span></div>')

        await findButton(wrapper, "Plain text").trigger("click")
        await flushPromises()

        expect(textareaValue(wrapper, "textarea.lyrics")).toBe("aa_bb_cc")
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

        await findButton(wrapper, "Rich text").trigger("click")
        await flushPromises()

        const editor = wrapper.find(".lyrics-editor")
        expect(editor.element.scrollTop).toBe(120)

        editor.element.scrollTop = 80

        await findButton(wrapper, "Plain text").trigger("click")
        await flushPromises()

        expect(textareaValue(wrapper, "textarea.lyrics")).toContain("word0")
        expect((wrapper.find("textarea.lyrics").element as HTMLTextAreaElement).scrollTop).toBe(80)
    })
})
