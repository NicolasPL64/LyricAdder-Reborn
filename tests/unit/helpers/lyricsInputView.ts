import { flushPromises, mount, type VueWrapper } from "@vue/test-utils"
import { vi } from "vitest"

import LyricsInputView from "@/views/LyricsInputView.vue"
import { ChartIO, type Chart } from "@/utils/herochartio"
import { open } from "@tauri-apps/plugin-dialog"

export function mountView() {
    return mount(LyricsInputView, {
        global: {
            directives: { tooltip: {} },
        },
    })
}

export function findButton(wrapper: VueWrapper, text: string) {
    const button = wrapper.findAll("button").find((candidate) => candidate.text().includes(text))
    if (!button) throw new Error(`Button "${text}" not found`)
    return button
}

export function findToggle(wrapper: VueWrapper) {
    const toggle = wrapper.find(".p-toggleswitch-input")
    if (!toggle.exists()) throw new Error("Rich text toggle not found")
    return toggle
}

export async function toggleRichMode(wrapper: VueWrapper) {
    await findToggle(wrapper).trigger("change")
    await flushPromises()
}

export function textareaValue(wrapper: VueWrapper, selector: string) {
    return (wrapper.find(selector).element as HTMLTextAreaElement).value
}

export async function loadChart(wrapper: VueWrapper, chart: Chart) {
    vi.mocked(open).mockResolvedValue("song.chart")
    vi.spyOn(ChartIO, "load").mockResolvedValue(chart)
    await findButton(wrapper, "Load chart").trigger("click")
    await flushPromises()
}
