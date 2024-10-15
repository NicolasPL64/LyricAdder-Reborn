<template>
  <div>
    <button @click="loadFile">Load file</button>
    <textarea v-model="lyricsText" spellcheck="false"></textarea>
  </div>
</template>

<script setup lang="ts">
import { parseChart } from "@/utils/parseChart"
import { open } from "@tauri-apps/plugin-dialog"
import { ref } from "vue"

const lyricsText = ref("")

async function loadFile() {
  const file = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Chart files (.chart/.mid)", extensions: ["chart", "mid"] }],
  })
  if (!file) return

  lyricsText.value = await parseChart(file)
}
</script>

<style scoped></style>
