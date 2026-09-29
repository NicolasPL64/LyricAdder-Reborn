import { beforeEach, describe, expect, it } from "vitest"

import { getStored, loadColorHistory, saveColorHistory, setStored } from "@/utils/settings"

describe("getStored", () => {
    beforeEach(() => localStorage.clear())

    it("returns the fallback when nothing is stored", () => {
        expect(getStored("missing", 5)).toBe(5)
        expect(getStored("missing", true)).toBe(true)
        expect(getStored("missing", "fallback")).toBe("fallback")
    })

    it("parses stored values as numbers and falls back on NaN", () => {
        localStorage.setItem("num", "5")
        localStorage.setItem("bad", "abc")

        expect(getStored("num", 0)).toBe(5)
        expect(getStored("bad", 0)).toBe(0)
    })

    it("parses stored values as booleans", () => {
        localStorage.setItem("on", "true")
        localStorage.setItem("off", "false")

        expect(getStored("on", false)).toBe(true)
        expect(getStored("off", true)).toBe(false)
    })

    it("returns stored strings as-is", () => {
        localStorage.setItem("text", "hello world")

        expect(getStored("text", "fallback")).toBe("hello world")
    })
})

describe("setStored", () => {
    beforeEach(() => localStorage.clear())

    it("stores numbers, booleans and strings as their string form", () => {
        setStored("num", 3)
        setStored("flag", true)
        setStored("text", "abc")

        expect(localStorage.getItem("num")).toBe("3")
        expect(localStorage.getItem("flag")).toBe("true")
        expect(localStorage.getItem("text")).toBe("abc")
    })
})

describe("color history", () => {
    beforeEach(() => localStorage.clear())

    it("returns an empty list when nothing is stored", () => {
        expect(loadColorHistory()).toEqual([])
    })

    it("round-trips saved colors", () => {
        saveColorHistory(["#ff0000", "#00ff00"])

        expect(loadColorHistory()).toEqual(["#ff0000", "#00ff00"])
    })

    it("ignores corrupt or non-array stored data", () => {
        localStorage.setItem("colorHistory", "not-json")
        expect(loadColorHistory()).toEqual([])

        localStorage.setItem("colorHistory", JSON.stringify({ nope: true }))
        expect(loadColorHistory()).toEqual([])

        localStorage.setItem("colorHistory", JSON.stringify(["#fff", 3]))
        expect(loadColorHistory()).toEqual(["#fff"])
    })
})
