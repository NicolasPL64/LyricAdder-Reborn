import { getCurrentWindow } from "@tauri-apps/api/window"

export const defaultSettings = {
    isRereadOnChange: false,
    isGayMode: false,
    lyricsFontSize: 0.9,
    lyricsLineHeight: 1.5,
    maxSectionSeparators: 3,
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
} as const

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
