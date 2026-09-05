import { describe, expect, it } from "vitest"

import { isLyricEvent, removeTrailingEmptyElements } from "@/utils/auxFunctions"

describe("auxiliary lyric helpers", () => {
    it("recognizes lyric events but ignores non-lyric entries", () => {
        expect(isLyricEvent({ type: "E", name: "lyric hello" })).toBe(true)
        expect(isLyricEvent({ type: "E", name: "Default hello" })).toBe(true)
        expect(isLyricEvent({ type: "E", name: "section hello" })).toBe(false)
        expect(isLyricEvent({ type: "E", name: "phrase_start" })).toBe(false)
    })

    it("removes only trailing empty lines", () => {
        expect(removeTrailingEmptyElements(["one", "", "two", "  ", ""])).toEqual([
            "one",
            "",
            "two",
        ])
    })
})