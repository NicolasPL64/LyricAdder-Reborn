import { getCurrentWindow } from "@tauri-apps/api/window"
import type { NormalizeOptions } from "./normalizeLyrics"

export const defaultSettings = {
    isRereadOnChange: true,
    isGayMode: false,
    lyricsFontSize: 1.0,
    lyricsLineHeight: 1.5,
    maxSectionSeparators: 3,
    normalizeCapitalize: true,
    normalizeTrailingPunctuation: true,
    normalizeTrailingPunctuationChars: ",.;",
    normalizeApostrophes: true,
    normalizeApostropheChar: "'",
    normalizeUnicodeSpaces: true,
    normalizeEllipsis: true,
    normalizeEllipsisDirection: "unicodeToAscii",
    normalizeInvisible: true,
    normalizeNfc: true,
} as const

export const themesArray = [
    { id: "light", name: "Light Theme" },
    { id: "dark", name: "Dark Theme" },
] as const

export type ThemeId = (typeof themesArray)[number]["id"]

export const storageKeys = {
    theme: "theme",
    isRereadOnChange: "isRereadOnChange",
    isGayMode: "isGayMode",
    lyricsFontSize: "lyricsFontSize",
    lyricsLineHeight: "lyricsLineHeight",
    maxSectionSeparators: "maxSectionSeparators",
    lastSeenChangelogVersion: "lastSeenChangelogVersion",
    colorHistory: "colorHistory",
    normalizeCapitalize: "normalizeCapitalize",
    normalizeTrailingPunctuation: "normalizeTrailingPunctuation",
    normalizeTrailingPunctuationChars: "normalizeTrailingPunctuationChars",
    normalizeApostrophes: "normalizeApostrophes",
    normalizeApostropheChar: "normalizeApostropheChar",
    normalizeUnicodeSpaces: "normalizeUnicodeSpaces",
    normalizeEllipsis: "normalizeEllipsis",
    normalizeEllipsisDirection: "normalizeEllipsisDirection",
    normalizeInvisible: "normalizeInvisible",
    normalizeNfc: "normalizeNfc",
} as const

export const maxColorHistory = 12

export function getStored<T extends string | number | boolean>(key: string, fallback: T): T
export function getStored(key: string, fallback: string): string
export function getStored(key: string, fallback: number): number
export function getStored(key: string, fallback: boolean): boolean
export function getStored(
    key: string,
    fallback: string | number | boolean
): string | number | boolean {
    const value = localStorage.getItem(key)
    if (value === null) return fallback
    if (typeof fallback === "number") {
        const parsed = parseFloat(value)
        return Number.isNaN(parsed) ? fallback : parsed
    }
    if (typeof fallback === "boolean") return value === "true"
    return value
}

export function setStored(key: string, value: string | number | boolean) {
    localStorage.setItem(key, value.toString())
}

// Hex colors (#RRGGBB or #RRGGBBAA) the user has saved from the color picker toolbar tool.
export function loadColorHistory(): string[] {
    const raw = localStorage.getItem(storageKeys.colorHistory)
    if (!raw) return []
    try {
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : []
    } catch {
        return []
    }
}

export function saveColorHistory(colors: string[]) {
    localStorage.setItem(storageKeys.colorHistory, JSON.stringify(colors))
}

export function setTheme(theme: ThemeId) {
    document.documentElement.setAttribute("data-theme", theme) // For choosing the right CSS variables
    localStorage.setItem(storageKeys.theme, theme)
}

export async function getSystemTheme(): Promise<ThemeId> {
    return (await getCurrentWindow().theme()) ?? "dark"
}

export function loadLyricsSettings() {
    const isRereadOnChange = getStored(
        storageKeys.isRereadOnChange,
        defaultSettings.isRereadOnChange
    )
    const isGayMode = getStored(storageKeys.isGayMode, defaultSettings.isGayMode)

    const fontSize = getStored(storageKeys.lyricsFontSize, defaultSettings.lyricsFontSize) + "rem"
    const lineHeight = getStored(storageKeys.lyricsLineHeight, defaultSettings.lyricsLineHeight)

    const root = document.querySelector(":root") as HTMLElement
    root.style.setProperty("--lyrics-container-font-size", fontSize)
    root.style.setProperty("--lyrics-container-line-height", lineHeight.toString())
    return { isRereadOnChange, isGayMode }
}

export function loadNormalizeSettings(): NormalizeOptions {
    const storedDirection: string = getStored(
        storageKeys.normalizeEllipsisDirection,
        defaultSettings.normalizeEllipsisDirection
    )
    return {
        capitalize: getStored(storageKeys.normalizeCapitalize, defaultSettings.normalizeCapitalize),
        trailingPunctuation: getStored(
            storageKeys.normalizeTrailingPunctuation,
            defaultSettings.normalizeTrailingPunctuation
        ),
        trailingPunctuationChars: getStored(
            storageKeys.normalizeTrailingPunctuationChars,
            defaultSettings.normalizeTrailingPunctuationChars
        ),
        apostrophes: getStored(
            storageKeys.normalizeApostrophes,
            defaultSettings.normalizeApostrophes
        ),
        apostropheTarget: getStored(
            storageKeys.normalizeApostropheChar,
            defaultSettings.normalizeApostropheChar
        ),
        unicodeSpaces: getStored(
            storageKeys.normalizeUnicodeSpaces,
            defaultSettings.normalizeUnicodeSpaces
        ),
        ellipsis: getStored(storageKeys.normalizeEllipsis, defaultSettings.normalizeEllipsis),
        ellipsisDirection:
            storedDirection === "asciiToUnicode" ? "asciiToUnicode" : "unicodeToAscii",
        invisible: getStored(storageKeys.normalizeInvisible, defaultSettings.normalizeInvisible),
        nfc: getStored(storageKeys.normalizeNfc, defaultSettings.normalizeNfc),
    }
}
