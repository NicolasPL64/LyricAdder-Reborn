<template>
  <h1 style="margin-top: 0">Settings</h1>
  <h2>Theme</h2>
  <p>Dark mode <ToggleSwitch v-model="isDarkMode" /></p>

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
          'If enabled, each time the loaded chart is updated, the file will be automatically re-read.\nIf disabled, the file will only be read once when the chart is loaded.',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="isRereadOnChange" />
  </p>
  <p>
    Max amount of section-separators:
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value:
          'Indicates the maximum amount of concurrent line breaks that will be added to indicate a new section when loading a chart.\nSet this to 0 to disable it.',
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
</template>

<script setup lang="ts">
import IconInfo from "@/components/icons/IconAbout.vue"
import { setTheme } from "@/utils/theme"
import { onMounted, ref, watch } from "vue"

const isDarkMode = ref<boolean>(true)
const lyricsFontSize = ref<number>()
const lyricsLineHeight = ref<number>()
const isRereadOnChange = ref<boolean>(true)
const maxSectionSeparators = ref<number>()
const isGayMode = ref<boolean>(false)

onMounted(() => {
  isDarkMode.value = localStorage.getItem("theme") === "dark"
  lyricsFontSize.value = parseFloat(localStorage.getItem("lyricsFontSize") || "1")
  lyricsLineHeight.value = parseFloat(localStorage.getItem("lyricsLineHeight") || "1.5")
  isRereadOnChange.value = localStorage.getItem("isRereadOnChange") === "true"
  maxSectionSeparators.value = parseInt(localStorage.getItem("maxSectionSeparators") || "3")
  isGayMode.value = localStorage.getItem("isGayMode") === "true"
})

watch(isDarkMode, (newVal) => {
  setTheme(newVal ? "dark" : "light")
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
  width: 1rem;
  height: 1rem;
}

hr {
  margin: 1em 0;
  border: 0;
  background: var(--accent-400);
  height: 1px;
}
</style>
