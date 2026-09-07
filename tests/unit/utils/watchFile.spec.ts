import { describe, expect, it } from "vitest"

import { isRelevantEvent } from "@/utils/watchFile"

describe("isRelevantEvent", () => {
    it("considers modify, create and remove kinds as relevant", () => {
        expect(
            isRelevantEvent({
                type: { modify: { kind: "data", mode: "content" } },
                paths: [],
                attrs: {},
            })
        ).toBe(true)
        expect(isRelevantEvent({ type: { create: { kind: "file" } }, paths: [], attrs: {} })).toBe(
            true
        )
        expect(isRelevantEvent({ type: { remove: { kind: "file" } }, paths: [], attrs: {} })).toBe(
            true
        )
    })

    it("ignores access and other kinds", () => {
        expect(
            isRelevantEvent({
                type: { access: { kind: "open", mode: "read" } },
                paths: [],
                attrs: {},
            })
        ).toBe(false)
        expect(isRelevantEvent({ type: "other", paths: [], attrs: {} })).toBe(false)
    })

    it("considers the 'any' string kind as relevant", () => {
        expect(isRelevantEvent({ type: "any", paths: [], attrs: {} })).toBe(true)
    })
})
