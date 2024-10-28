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

export function setTheme(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme) // For choosing the right CSS variables
  localStorage.setItem("theme", theme)
}

export function getSystemTheme() {
  let sysTheme: string = ""
  getCurrentWindow()
    .theme()
    .then((theme) => {
      sysTheme = theme ?? ""
    })
  return sysTheme
}

export function loadLyricsSettings() {
  const isRereadOnChange =
    localStorage.getItem("isRereadOnChange") === "true" || defaultSettings.isRereadOnChange
  const isGayMode = localStorage.getItem("isGayMode") === "true" || defaultSettings.isGayMode

  const fontSize =
    (localStorage.getItem("lyricsFontSize") || defaultSettings.lyricsFontSize) + "rem"
  const lineHeight = localStorage.getItem("lyricsLineHeight") || defaultSettings.lyricsLineHeight

  const root = document.querySelector(":root") as HTMLElement
  root.style.setProperty("--lyrics-container-font-size", fontSize)
  root.style.setProperty("--lyrics-container-line-height", lineHeight.toString())
  return { isRereadOnChange, isGayMode }
}
