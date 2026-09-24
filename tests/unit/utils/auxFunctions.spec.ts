import { describe, expect, it } from "vitest"

import {
    EVENT_PRIORITY_ORDER,
    compareEventPriority,
    isLyricEvent,
    removeTrailingEmptyElements,
    sortEventsByPriority,
} from "@/utils/auxFunctions"

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

describe("event priority ordering", () => {
    it("orders events by the canonical chart priority", () => {
        expect(EVENT_PRIORITY_ORDER).toEqual([
            "section",
            "phrase_start",
            "lyric",
            "Default",
            "phrase_end",
        ])
    })

    it("ranks a known prefix before a lower-priority one", () => {
        const section = { type: "E" as const, name: "section First" }
        const phraseStart = { type: "E" as const, name: "phrase_start" }
        const lyric = { type: "E" as const, name: "lyric A" }
        const defaultEvent = { type: "E" as const, name: "Default" }
        const phraseEnd = { type: "E" as const, name: "phrase_end" }

        expect(compareEventPriority(section, phraseStart)).toBeLessThan(0)
        expect(compareEventPriority(phraseStart, lyric)).toBeLessThan(0)
        expect(compareEventPriority(lyric, defaultEvent)).toBeLessThan(0)
        expect(compareEventPriority(defaultEvent, phraseEnd)).toBeLessThan(0)
        expect(compareEventPriority(lyric, lyric)).toBe(0)
    })

    it("ranks unknown events after every known prefix", () => {
        const unknown = { type: "E" as const, name: "weird event" }
        const phraseEnd = { type: "E" as const, name: "phrase_end" }

        expect(compareEventPriority(unknown, phraseEnd)).toBeGreaterThan(0)
        expect(compareEventPriority(unknown, unknown)).toBe(0)
    })

    it("sorts events sharing a tick by priority", () => {
        const events = [
            { type: "E" as const, name: "lyric A" },
            { type: "E" as const, name: "phrase_start" },
            { type: "E" as const, name: "section First" },
            { type: "E" as const, name: "phrase_end" },
        ]

        expect(sortEventsByPriority(events).map((event) => event.name)).toEqual([
            "section First",
            "phrase_start",
            "lyric A",
            "phrase_end",
        ])
    })

    it("does not mutate the input list when sorting", () => {
        const events = [
            { type: "E" as const, name: "lyric A" },
            { type: "E" as const, name: "phrase_start" },
        ]
        const snapshot = [...events]

        sortEventsByPriority(events)

        expect(events).toEqual(snapshot)
    })

    it("returns the same reference for a single-element list", () => {
        const events = [{ type: "E" as const, name: "lyric A" }]

        expect(sortEventsByPriority(events)).toBe(events)
    })
})
