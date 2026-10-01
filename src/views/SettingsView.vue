<template>
  <h1 style="margin-top: 0">Settings</h1>
  <h2>Theme</h2>
  <p style="display: flex; align-items: center">
    Select your theme: <ThemeDropdownMenu style="margin-left: 0.25em" width="auto" />
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
  <h2>Normalize</h2>
  <p>
    Capitalize the first letter of each line
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value: 'Capitalizes the first alphanumeric character of each line, skipping symbols.',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="normalizeCapitalize" />
  </p>
  <p>
    Remove trailing punctuation
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value:
          'Removes the configured characters from the end of each line.\n\nWrite the characters to remove (use no separators).\n\nIf there are exactly three trailing dots (e.g. ...), they are left intact.',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="normalizeTrailingPunctuation" />
    <input
      class="text-input"
      type="text"
      v-model="normalizeTrailingPunctuationChars"
      :disabled="!normalizeTrailingPunctuation"
    />
  </p>
  <p>
    Normalize apostrophes
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value: 'Unifies every apostrophe variant (e.g. ’, ʼ, ´) into the selected character.',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="normalizeApostrophes" />
    <DropdownMenu
      v-model="normalizeApostropheChar"
      :options="APOSTROPHE_OPTIONS"
      :disabled="!normalizeApostrophes"
      style="margin-left: 0.25em"
      width="auto"
    />
  </p>
  <p>
    Normalize unicode spaces
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value: 'Replaces exotic space characters (e.g. no-break space) with a regular space.',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="normalizeUnicodeSpaces" />
  </p>
  <p>
    Normalize ellipsis
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value:
          'Normalizes ellipses between the ellipsis character (…) and three dots (...), according to the selected direction.',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="normalizeEllipsis" />
    <DropdownMenu
      v-model="normalizeEllipsisDirection"
      :options="ELLIPSIS_DIRECTIONS"
      :disabled="!normalizeEllipsis"
      style="margin-left: 0.25em"
      width="auto"
    />
  </p>
  <p>
    Remove invisible characters
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value: 'Removes zero-width and BOM characters that break rendering.',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="normalizeInvisible" />
  </p>
  <p>
    Unicode NFC normalization
    <IconInfo
      class="info-icon"
      v-tooltip="{
        value:
          'Unifies decomposed accented characters (e.g. e + combining accent) into their precomposed form (é).',
        showDelay: 0,
      }"
    />
    <ToggleSwitch v-model="normalizeNfc" />
  </p>

  <hr />
  <button @click="resetDefaultSettings">Reset to default</button>
</template>

<script setup lang="ts">
import IconInfo from "@/components/icons/IconAbout.vue"
import ThemeDropdownMenu from "@/components/ThemeDropdownMenu.vue"
import DropdownMenu from "@/components/DropdownMenu.vue"
import {
  APOSTROPHE_OPTIONS,
  ELLIPSIS_DIRECTIONS,
  normalizeEllipsisDirection as normalizeDirection,
} from "@/utils/normalizeLyrics"
import { defaultSettings, getStored, setStored, storageKeys } from "@/utils/settings"
import { onMounted, ref, watch, type Ref } from "vue"

const lyricsFontSize = ref<number>(defaultSettings.lyricsFontSize)
const lyricsLineHeight = ref<number>(defaultSettings.lyricsLineHeight)
const isRereadOnChange = ref<boolean>(defaultSettings.isRereadOnChange)
const maxSectionSeparators = ref<number>(defaultSettings.maxSectionSeparators)
const isGayMode = ref<boolean>(defaultSettings.isGayMode)
const normalizeCapitalize = ref<boolean>(defaultSettings.normalizeCapitalize)
const normalizeTrailingPunctuation = ref<boolean>(defaultSettings.normalizeTrailingPunctuation)
const normalizeTrailingPunctuationChars = ref<string>(
  defaultSettings.normalizeTrailingPunctuationChars
)
const normalizeApostrophes = ref<boolean>(defaultSettings.normalizeApostrophes)
const normalizeApostropheChar = ref<string>(defaultSettings.normalizeApostropheChar)
const normalizeUnicodeSpaces = ref<boolean>(defaultSettings.normalizeUnicodeSpaces)
const normalizeEllipsis = ref<boolean>(defaultSettings.normalizeEllipsis)
const normalizeEllipsisDirection = ref<string>(defaultSettings.normalizeEllipsisDirection)
const normalizeInvisible = ref<boolean>(defaultSettings.normalizeInvisible)
const normalizeNfc = ref<boolean>(defaultSettings.normalizeNfc)

// Reads a stored setting into a ref, falling back to the default when unset.
function loadSetting<T extends string | number | boolean>(
  target: Ref<T>,
  key: string,
  fallback: T
) {
  target.value = getStored(key, fallback)
}

// Persists a setting whenever its ref changes. The numeric inputs emit "" when
// cleared, which must never reach localStorage (skipFalsy matches that guard).
function watchSetting<T extends string | number | boolean>(
  target: Ref<T>,
  key: string,
  skipFalsy = false
) {
  watch(target, (newVal) => {
    if (skipFalsy ? !newVal : newVal === undefined || newVal === null) return
    setStored(key, newVal)
  })
}

function resetDefaultSettings() {
  lyricsFontSize.value = defaultSettings.lyricsFontSize
  lyricsLineHeight.value = defaultSettings.lyricsLineHeight
  isRereadOnChange.value = defaultSettings.isRereadOnChange
  maxSectionSeparators.value = defaultSettings.maxSectionSeparators
  isGayMode.value = defaultSettings.isGayMode
  normalizeCapitalize.value = defaultSettings.normalizeCapitalize
  normalizeTrailingPunctuation.value = defaultSettings.normalizeTrailingPunctuation
  normalizeTrailingPunctuationChars.value = defaultSettings.normalizeTrailingPunctuationChars
  normalizeApostrophes.value = defaultSettings.normalizeApostrophes
  normalizeApostropheChar.value = defaultSettings.normalizeApostropheChar
  normalizeUnicodeSpaces.value = defaultSettings.normalizeUnicodeSpaces
  normalizeEllipsis.value = defaultSettings.normalizeEllipsis
  normalizeEllipsisDirection.value = defaultSettings.normalizeEllipsisDirection
  normalizeInvisible.value = defaultSettings.normalizeInvisible
  normalizeNfc.value = defaultSettings.normalizeNfc
}

onMounted(() => {
  loadSetting(lyricsFontSize, storageKeys.lyricsFontSize, defaultSettings.lyricsFontSize)
  loadSetting(lyricsLineHeight, storageKeys.lyricsLineHeight, defaultSettings.lyricsLineHeight)
  loadSetting(isRereadOnChange, storageKeys.isRereadOnChange, defaultSettings.isRereadOnChange)
  loadSetting(
    maxSectionSeparators,
    storageKeys.maxSectionSeparators,
    defaultSettings.maxSectionSeparators
  )
  loadSetting(isGayMode, storageKeys.isGayMode, defaultSettings.isGayMode)
  loadSetting(
    normalizeCapitalize,
    storageKeys.normalizeCapitalize,
    defaultSettings.normalizeCapitalize
  )
  loadSetting(
    normalizeTrailingPunctuation,
    storageKeys.normalizeTrailingPunctuation,
    defaultSettings.normalizeTrailingPunctuation
  )
  loadSetting(
    normalizeTrailingPunctuationChars,
    storageKeys.normalizeTrailingPunctuationChars,
    defaultSettings.normalizeTrailingPunctuationChars
  )
  loadSetting(
    normalizeApostrophes,
    storageKeys.normalizeApostrophes,
    defaultSettings.normalizeApostrophes
  )
  loadSetting(
    normalizeApostropheChar,
    storageKeys.normalizeApostropheChar,
    defaultSettings.normalizeApostropheChar
  )
  loadSetting(
    normalizeUnicodeSpaces,
    storageKeys.normalizeUnicodeSpaces,
    defaultSettings.normalizeUnicodeSpaces
  )
  loadSetting(normalizeEllipsis, storageKeys.normalizeEllipsis, defaultSettings.normalizeEllipsis)
  normalizeEllipsisDirection.value = normalizeDirection(
    getStored(storageKeys.normalizeEllipsisDirection, defaultSettings.normalizeEllipsisDirection)
  )
  loadSetting(
    normalizeInvisible,
    storageKeys.normalizeInvisible,
    defaultSettings.normalizeInvisible
  )
  loadSetting(normalizeNfc, storageKeys.normalizeNfc, defaultSettings.normalizeNfc)
})

watchSetting(lyricsFontSize, storageKeys.lyricsFontSize, true)
watchSetting(lyricsLineHeight, storageKeys.lyricsLineHeight, true)
watchSetting(isRereadOnChange, storageKeys.isRereadOnChange)
watchSetting(maxSectionSeparators, storageKeys.maxSectionSeparators, true)
watchSetting(isGayMode, storageKeys.isGayMode)
watchSetting(normalizeCapitalize, storageKeys.normalizeCapitalize)
watchSetting(normalizeTrailingPunctuation, storageKeys.normalizeTrailingPunctuation)
watchSetting(normalizeTrailingPunctuationChars, storageKeys.normalizeTrailingPunctuationChars)
watchSetting(normalizeApostrophes, storageKeys.normalizeApostrophes)
watchSetting(normalizeApostropheChar, storageKeys.normalizeApostropheChar)
watchSetting(normalizeUnicodeSpaces, storageKeys.normalizeUnicodeSpaces)
watchSetting(normalizeEllipsis, storageKeys.normalizeEllipsis)
watchSetting(normalizeEllipsisDirection, storageKeys.normalizeEllipsisDirection)
watchSetting(normalizeInvisible, storageKeys.normalizeInvisible)
watchSetting(normalizeNfc, storageKeys.normalizeNfc)
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

input.text-input {
  width: 6rem;
}

input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

p :deep(.custom-select) {
  display: inline-flex;
  vertical-align: middle;
}

p :deep(.custom-select .selected-option) {
  column-gap: 0.5em;
}
</style>
