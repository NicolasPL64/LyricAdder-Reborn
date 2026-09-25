<template>
  <div class="custom-select" :style="width ? { width } : undefined">
    <div class="selected-option" @click="toggleDropdown">
      {{ selectedShort }} <IconArrowDown style="margin-left: auto" />
    </div>
    <div v-if="dropdownOpen" class="options">
      <div
        v-for="option in options"
        :key="option.value"
        class="option"
        :class="{ selected: option.value === modelValue }"
        @mouseover="emit('option-hover', option.value)"
        @mouseleave="emit('option-hover', null)"
        @click="select(option.value)"
      >
        {{ option.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconArrowDown from "./icons/IconArrowDown.vue"
import { computed, ref } from "vue"

export interface DropdownOption {
  value: string
  label: string
  /** Compact label shown in the collapsed selector (e.g. "EN"). */
  short?: string
}

const props = defineProps<{
  options: DropdownOption[]
  modelValue: string
  /** CSS width of the collapsed control (e.g. "auto" to only fit the short label). */
  width?: string
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
  (e: "option-hover", value: string | null): void
}>()

const dropdownOpen = ref(false)

const selectedShort = computed(() => {
  const selected = props.options.find((option) => option.value === props.modelValue)
  return selected ? (selected.short ?? selected.label) : ""
})

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
}

function select(value: string) {
  dropdownOpen.value = false
  emit("update:modelValue", value)
}
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
  top: 100%;
  right: 0;
  z-index: 10;
  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
  border-radius: var(--border-small);
  background-color: var(--primary-400);
  width: max-content;
  min-width: 100%;
  max-height: 10em;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
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
