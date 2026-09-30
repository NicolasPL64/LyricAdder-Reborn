<template>
  <div ref="root" class="color-picker-tool">
    <button
      class="color-tool-button"
      :class="{ 'is-open': panelOpen }"
      aria-label="Apply a color"
      v-tooltip="{
        value: 'Opens the color picker panel.',
        showDelay: 400,
      }"
      @mousedown.prevent="openPanel"
      @click="togglePanel"
    >
      <IconColorPalette />
    </button>

    <div v-if="panelOpen" class="color-panel">
      <ColorPicker v-model="color" format="hex" inline />
      <div class="alpha-row">
        <div class="alpha-track">
          <div class="alpha-fill" :style="{ background: alphaGradient }"></div>
          <input
            type="range"
            class="alpha-slider"
            min="0"
            max="255"
            step="1"
            v-model.number="alpha"
            aria-label="Alpha"
          />
        </div>
      </div>
      <div class="color-row">
        <code class="hex-value">{{ currentHex }}</code>
        <div class="color-actions">
          <button
            class="small"
            aria-label="Aplicar"
            v-tooltip.bottom="{ value: 'Apply color', showDelay: 400 }"
            @click="apply(currentHex)"
          >
            <IconCheck />
          </button>
          <button
            class="small"
            aria-label="Guardar"
            v-tooltip.bottom="{ value: 'Bookmark color', showDelay: 400 }"
            @click="saveCurrent"
          >
            <IconBookmark />
          </button>
        </div>
      </div>
      <div v-if="history.length" class="history">
        <div
          v-for="(hex, index) in history"
          :key="hex"
          class="history-swatch"
          :title="hex"
          @click="apply(hex)"
        >
          <div class="history-swatch-fill" :style="{ backgroundColor: hex }"></div>
          <button class="remove" aria-label="Remove color" @click.stop="removeColor(index)">
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconColorPalette from "./icons/IconColorPalette.vue"
import IconCheck from "./icons/IconCheck.vue"
import IconBookmark from "./icons/IconBookmark.vue"
import ColorPicker from "openvue/colorpicker"
import { loadColorHistory, maxColorHistory, saveColorHistory } from "@/utils/settings"
import { computed, onUnmounted, ref, watch } from "vue"

const emit = defineEmits<{
  (e: "opening"): void
  (e: "apply", hex: string): void
}>()

const root = ref<HTMLElement | null>(null)
const panelOpen = ref(false)
const color = ref("ff0000")
const alpha = ref(255)
const history = ref<string[]>(loadColorHistory())

const currentHex = computed(() => {
  const base = "#" + color.value
  return alpha.value === 255 ? base : base + alpha.value.toString(16).padStart(2, "0")
})

const colorRGB = computed(() => {
  const hex = color.value.replace(/^#/, "")
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "rgb(255, 0, 0)"
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
})

const alphaGradient = computed(() => `linear-gradient(to right, transparent, ${colorRGB.value})`)

function setColorFromHex(hex: string) {
  const value = hex.replace(/^#/, "")
  if (/^[0-9a-fA-F]{8}$/.test(value)) {
    color.value = value.slice(0, 6).toLowerCase()
    alpha.value = parseInt(value.slice(6, 8), 16)
  } else {
    color.value = value.toLowerCase()
    alpha.value = 255
  }
}

// Runs on mousedown before the panel opens so the parent can snapshot the
// rich-text selection while the editor still holds it.
function openPanel() {
  emit("opening")
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
}

function closePanel() {
  panelOpen.value = false
}

function apply(hex: string) {
  setColorFromHex(hex)
  emit("apply", hex)
  closePanel()
}

function saveCurrent() {
  const hex = currentHex.value.toUpperCase()
  if (history.value.includes(hex)) return
  history.value = [hex, ...history.value].slice(0, maxColorHistory)
  saveColorHistory(history.value)
}

function removeColor(index: number) {
  history.value = history.value.filter((_, i) => i !== index)
  saveColorHistory(history.value)
}

// Lets the parent pre-fill the picker with a color detected in the current
// selection before the panel opens.
function setColor(hex: string) {
  setColorFromHex(hex)
}

defineExpose({ setColor })

function onDocumentClick(event: MouseEvent) {
  if (root.value && !root.value.contains(event.target as Node)) closePanel()
}

watch(panelOpen, (open) => {
  if (open) document.addEventListener("click", onDocumentClick)
  else document.removeEventListener("click", onDocumentClick)
})

onUnmounted(() => document.removeEventListener("click", onDocumentClick))
</script>

<style scoped>
.color-picker-tool {
  display: inline-flex;
  position: relative;
}

.color-tool-button {
  flex-direction: column;
  gap: 0.25em;
  margin: 0;
  padding: 0.5em;
}

.color-tool-button.is-open {
  background-color: var(--primary-600);
}

.color-tool-button.is-open:hover {
  background-color: var(--primary-700);
}

.color-panel {
  --color-control-height: 1.75rem;
  display: flex;
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 50%;
  flex-direction: column;
  gap: 0.6rem;
  transform: translateX(-50%);
  z-index: 20;
  box-shadow: var(--shadow-drop-small);
  border: 1px solid var(--background-400);
  border-radius: var(--border-small);
  background: var(--background-200);
  padding: 0.75rem;
}

.alpha-row {
  display: flex;
  align-items: center;
}

.alpha-track {
  position: relative;
  border: 1px solid var(--background-400);
  border-radius: var(--border-small);
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0;
  background-size: 8px 8px;
  width: 193px;
  height: 14px;
}

.alpha-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.alpha-slider {
  position: absolute;
  appearance: none;
  cursor: pointer;
  margin: 0;
  inset: 0;
  background: transparent;
}

.alpha-slider::-webkit-slider-runnable-track,
.alpha-slider::-moz-range-track {
  background: transparent;
}

.alpha-slider::-webkit-slider-thumb {
  appearance: none;
  box-shadow: var(--shadow-drop-small);
  border: 2px solid var(--text-100);
  border-radius: 50%;
  background: var(--text-900);
  width: 10px;
  height: 10px;
}

.alpha-slider::-moz-range-thumb {
  box-shadow: var(--shadow-drop-small);
  border: 2px solid var(--text-100);
  border-radius: 50%;
  background: var(--text-900);
  width: 6px;
  height: 6px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.color-actions {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
}

.hex-value {
  display: flex;
  align-items: center;
  border-radius: var(--border-small);
  background: var(--background-100);
  padding: 0 0.5em;
  height: var(--color-control-height);
  color: var(--text-900);
}

button.small {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  border-radius: var(--border-small);
  padding: 0;
  width: var(--color-control-height);
  height: var(--color-control-height);
}

button.small svg {
  width: 1rem;
  height: 1rem;
}

.history {
  display: grid;
  grid-template-columns: repeat(auto-fill, 1.4rem);
  column-gap: 0.6rem;
  row-gap: 0.6rem;
  justify-content: space-between;
  max-width: 13rem;
}

.history-swatch {
  position: relative;
  cursor: pointer;
  border: 1px solid var(--background-400);
  border-radius: var(--border-small);
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%),
    linear-gradient(-45deg, #ccc 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ccc 75%),
    linear-gradient(-45deg, transparent 75%, #ccc 75%);
  background-position:
    0 0,
    0 4px,
    4px -4px,
    -4px 0;
  background-size: 8px 8px;
  width: 1.4rem;
  height: 1.4rem;
}

.history-swatch-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.history-swatch .remove {
  position: absolute;
  top: -0.4rem;
  right: -0.4rem;
  justify-content: center;
  margin: 0;
  border: 1px solid var(--background-400);
  border-radius: 50%;
  background: var(--background-300);
  padding: 0;
  width: 0.9rem;
  height: 0.9rem;
  color: var(--text-900);
  font-size: 0.7rem;
  line-height: 1;
}

.history-swatch .remove:hover {
  background: var(--error-500);
  color: var(--text-100);
}
</style>
