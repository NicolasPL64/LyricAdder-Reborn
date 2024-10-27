import { getCurrentWindow } from "@tauri-apps/api/window"

export function setTheme(theme: string) {
  document.documentElement.setAttribute("data-theme", theme) // For choosing the right CSS variables
  localStorage.setItem("theme", theme)
}

export function getSystemTheme(): string | null {
  let sysTheme: string | null = null
  getCurrentWindow()
    .theme()
    .then((theme) => {
      sysTheme = theme
    })
  return sysTheme
}

export function loadLyricsSettings() {
  const isRereadOnChange = localStorage.getItem("isRereadOnChange") === "true" || false

  const fontSize = localStorage.getItem("lyricsFontSize") + "rem" || "0.9rem"
  const lineHeight = localStorage.getItem("lyricsLineHeight") || "1.5"

  const root = document.querySelector(":root") as HTMLElement
  root.style.setProperty("--lyrics-container-font-size", fontSize)
  root.style.setProperty("--lyrics-container-line-height", lineHeight)
  return isRereadOnChange
}
