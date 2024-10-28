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
import { setTheme, getSystemTheme, type ThemeId } from "./utils/settings"

onMounted(async () => {
  const savedTheme = localStorage.getItem("theme") as ThemeId
  if (savedTheme) {
    setTheme(savedTheme)
  } else {
    if (getSystemTheme() == "light") {
      setTheme("light")
    } else {
      setTheme("dark")
    }
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
