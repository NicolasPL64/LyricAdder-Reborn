<template>
  <div class="custom-select">
    <div class="selected-option" @click="toggleDropdown">
      {{ currentThemeName }} <IconArrowDown style="margin-left: auto" />
    </div>
    <div v-if="dropdownOpen" class="options">
      <div
        v-for="theme in themes"
        :key="theme.id"
        class="option"
        :class="{ selected: theme.id === currentTheme }"
        @mouseover="previewTheme(theme.id)"
        @mouseleave="previewTheme(originalTheme)"
        @click="applyTheme(theme.id)"
      >
        {{ theme.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconArrowDown from "./icons/IconArrowDown.vue"
import { computed, ref } from "vue"
import { themesArray, setTheme, getSystemTheme, type ThemeId } from "@/utils/settings"

const themes = ref(themesArray)

const dropdownOpen = ref<boolean>(false)
const originalTheme = ref<ThemeId>((localStorage.getItem("theme") || getSystemTheme()) as ThemeId)
const currentTheme = ref<ThemeId>(originalTheme.value as ThemeId)

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const previewTheme = (themeId: ThemeId) => {
  document.documentElement.setAttribute("data-theme", themeId)
}

const applyTheme = (themeId: ThemeId) => {
  currentTheme.value = themeId
  originalTheme.value = themeId
  dropdownOpen.value = false
  setTheme(themeId)
}

const currentThemeName = computed(() => {
  const selected = themes.value.find((theme) => theme.id === currentTheme.value)
  return selected ? selected.name : "Select Theme"
})
</script>

<style scoped>
.custom-select {
  position: relative;
  cursor: pointer;
  width: 200px;
  user-select: none;
}

.selected-option {
  display: flex;
  border-radius: var(--border-small);
  background-color: var(--background-300);
  padding: 0.5em;
}

.selected-option:hover {
  background-color: var(--primary-200);
}

.options {
  position: absolute;
  z-index: 10;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: var(--border-small);
  background-color: var(--primary-400);
  width: 100%;
  max-height: 10em;
  overflow-y: auto;
}

.option {
  transition: background-color 0.3s;
  padding: 0.5em;
}

.option.selected {
  background-color: var(--accent-600);
  color: var(--text-100);
}

.option:hover {
  background-color: var(--primary-500);
}
</style>
