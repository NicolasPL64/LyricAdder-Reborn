import { flushPromises, mount, type VueWrapper } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"

import LyricsInputView from "@/views/LyricsInputView.vue"
import * as patchChartEvents from "@/utils/patchChartEvents"
import { ChartIO, type Chart } from "@/utils/herochartio"
import { open } from "@tauri-apps/plugin-dialog"

import test1ChartContent from "../../files/test1.chart?raw"
import { buildChart, lyricNames } from "../helpers/chart"

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
})
