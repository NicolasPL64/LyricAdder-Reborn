<template>
  <h1 style="margin-top: 0">Settings</h1>
  <h2>Theme</h2>
  <p style="display: flex; align-items: center">
    Select your theme: <ThemeDropdownMenu style="margin-left: 0.25em" />
  </p>

  <hr />
  <h2>Lyrics View</h2>
  <p>
    Font size:
    <input type="number" v-model="lyricsFontSize" min="0.5" max="5" step="0.1" />
  </p>
  <p>
    Line height:
    <input type="number" v-model="lyricsLineHeight" min="0.8" max="5" step="0.1" />
  </p>

  <hr />
  <h2>Behavior</h2>
  <p>
    Re-read chart on change
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value:
          'If enabled, each time the loaded chart is updated, the file will be automatically re-read.\n\nIf disabled, the file will be only re-read when there is a change to the lyrics box. (This is the original LyricAdder behavior)',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="isRereadOnChange" />
  </p>
  <p>
    Max amount of section separators:
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value:
          'Indicates the maximum amount of concurrent line breaks that will be added to indicate a new section when loading a chart.\n\nSet this to 0 to disable it.',
        showDelay: 0,
      }"
    />
    <input type="number" v-model="maxSectionSeparators" min="0" />
  </p>
  <p>
    Gay mode
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value: 'g\n\n\n\n\na\n\n\n\n\ny',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="isGayMode" />
  </p>

  <hr />
  <button @click="resetDefaultSettings">Reset to default</button>
</template>

<script setup lang="ts">
import IconInfo from "@/components/icons/IconAbout.vue"
import ThemeDropdownMenu from "@/components/ThemeDropdownMenu.vue"
import { defaultSettings } from "@/utils/settings"
import { onMounted, ref, watch } from "vue"

const lyricsFontSize = ref<number>(defaultSettings.lyricsFontSize)
const lyricsLineHeight = ref<number>(defaultSettings.lyricsLineHeight)
const isRereadOnChange = ref<boolean>(defaultSettings.isRereadOnChange)
const maxSectionSeparators = ref<number>(defaultSettings.maxSectionSeparators)
const isGayMode = ref<boolean>(defaultSettings.isGayMode)

function resetDefaultSettings() {
  lyricsFontSize.value = defaultSettings.lyricsFontSize
  lyricsLineHeight.value = defaultSettings.lyricsLineHeight
  isRereadOnChange.value = defaultSettings.isRereadOnChange
  maxSectionSeparators.value = defaultSettings.maxSectionSeparators
  isGayMode.value = defaultSettings.isGayMode
}

onMounted(() => {
  lyricsFontSize.value = parseFloat(
    localStorage.getItem("lyricsFontSize") || defaultSettings.lyricsFontSize.toString()
  )

  lyricsLineHeight.value = parseFloat(
    localStorage.getItem("lyricsLineHeight") || defaultSettings.lyricsLineHeight.toString()
  )
  isRereadOnChange.value =
    localStorage.getItem("isRereadOnChange") === (!defaultSettings.isRereadOnChange).toString()
  maxSectionSeparators.value = parseInt(
    localStorage.getItem("maxSectionSeparators") || defaultSettings.maxSectionSeparators.toString()
  )
  isGayMode.value = localStorage.getItem("isGayMode") === (!defaultSettings.isGayMode).toString()
})

watch(lyricsFontSize, (newVal) => {
  if (newVal) localStorage.setItem("lyricsFontSize", newVal.toString())
})

watch(lyricsLineHeight, (newVal) => {
  if (newVal) localStorage.setItem("lyricsLineHeight", newVal.toString())
})

watch(isRereadOnChange, (newVal) => {
  localStorage.setItem("isRereadOnChange", newVal.toString())
})

watch(maxSectionSeparators, (newVal) => {
  if (newVal) localStorage.setItem("maxSectionSeparators", newVal.toString())
})

watch(isGayMode, (newVal) => {
  localStorage.setItem("isGayMode", newVal.toString())
})
</script>

<style scoped>
.info-icon {
  vertical-align: middle;
  margin-right: 0.25em;
  width: 1rem;
  height: 1rem;
}

hr {
  margin: 1em 0;
  border: 0;
  background: var(--secondary-300);
  height: 1px;
}

input {
  border: 1px solid var(--background-400);
  border-radius: 0.25em;
  background-color: var(--background-100);
  padding: 0.25em;
  width: 3rem;
  color: var(--text-800);
}
</style>
