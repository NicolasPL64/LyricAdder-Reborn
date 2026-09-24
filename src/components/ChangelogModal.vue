<template>
  <Dialog
    v-model:visible="visible"
    modal
    :dismissable-mask="true"
    :draggable="false"
    header="What's new"
    contentClass="changelog-dialog-content"
  >
    <div class="changelog-content" v-html="html" @click="onContentClick" />
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from "openvue/dialog"
import { openUrl } from "@tauri-apps/plugin-opener"
import { ref } from "vue"

const visible = ref(false)
const html = ref("")

function onContentClick(event: MouseEvent) {
  const target = (event.target as HTMLElement).closest("a[href]")
  if (!target) return
  event.preventDefault()
  const href = target.getAttribute("href")
  if (href) openUrl(href)
}

function open(changelogHtml: string) {
  html.value = changelogHtml
  visible.value = true
}

function close() {
  visible.value = false
}

defineExpose({ open, close })
</script>
