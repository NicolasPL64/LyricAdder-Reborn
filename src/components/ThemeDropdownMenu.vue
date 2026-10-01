<template>
  <DropdownMenu
    :options="themeOptions"
    :model-value="currentTheme"
    @update:model-value="applyTheme"
    @option-hover="previewTheme"
  />
</template>

<script setup lang="ts">
import DropdownMenu, { type DropdownOption } from "./DropdownMenu.vue"
import { onMounted, ref } from "vue"
import {
  themesArray,
  setTheme,
  applyThemeAttribute,
  resolveTheme,
  storageKeys,
  type ThemeId,
} from "@/utils/settings"

const themeOptions: DropdownOption[] = themesArray.map((theme) => ({
  value: theme.id,
  label: theme.name,
}))

const currentTheme = ref<ThemeId>((localStorage.getItem(storageKeys.theme) as ThemeId) || "dark")
const originalTheme = ref<ThemeId>(currentTheme.value)

onMounted(async () => {
  // If no theme was saved, use the system theme
  if (!localStorage.getItem(storageKeys.theme)) {
    const systemTheme = await resolveTheme()
    if (!localStorage.getItem(storageKeys.theme)) {
      currentTheme.value = systemTheme
      originalTheme.value = systemTheme
    }
  }
})

const previewTheme = (themeId: string | null) => {
  applyThemeAttribute((themeId as ThemeId) ?? originalTheme.value)
}

const applyTheme = (themeId: string) => {
  currentTheme.value = themeId as ThemeId
  originalTheme.value = themeId as ThemeId
  setTheme(themeId as ThemeId)
}
</script>
