<template>
  <Sidebar />
  <div class="page-container">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router"
import Sidebar from "./components/sidebar/Sidebar.vue"
import { onMounted } from "vue"
import { setTheme, getSystemTheme, storageKeys, type ThemeId } from "./utils/settings"
import { checkForUpdates } from "./composables/useUpdater"

onMounted(async () => {
  if (import.meta.env.PROD) checkForUpdates()
  const savedTheme = localStorage.getItem(storageKeys.theme) as ThemeId
  if (savedTheme) {
    setTheme(savedTheme)
  } else {
    setTheme(await getSystemTheme())
  }
})
</script>

<style scoped>
.page-container {
  display: block;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: calc(40px + 0.5em * 2);
  margin: 1em;
}
</style>
