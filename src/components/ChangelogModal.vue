<template>
  <Dialog
    v-model:visible="visible"
    modal
    :dismissable-mask="true"
    :draggable="false"
    header="What's new"
    contentClass="changelog-dialog-content"
  >
    <div class="changelog-content" v-html="html" />
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from "openvue/dialog"
import { ref } from "vue"

const visible = ref(false)
const html = ref("")

function open(changelogHtml: string) {
  html.value = changelogHtml
  visible.value = true
}

function close() {
  visible.value = false
}

defineExpose({ open, close })
</script>
