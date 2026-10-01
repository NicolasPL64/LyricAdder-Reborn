import { beforeEach, describe, expect, it } from "vitest"
import { flushPromises } from "@vue/test-utils"

import { buildChart } from "../helpers/chart"
import { fsMock } from "../helpers/tauriMocks"
import { findButton, loadChart, mountView, textareaValue } from "../helpers/lyricsInputView"

describe("LyricsInputView Normalize button", () => {
    beforeEach(() => {
        localStorage.clear()
        fsMock.mkdir.mockResolvedValue(undefined)
        fsMock.readDir.mockResolvedValue([])
        fsMock.readTextFile.mockResolvedValue("chart")
        fsMock.writeTextFile.mockResolvedValue(undefined)
        fsMock.rename.mockResolvedValue(undefined)
        fsMock.remove.mockResolvedValue(undefined)
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
