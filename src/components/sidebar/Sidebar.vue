<template>
  <div class="sidebar" @mouseover="hover = true" @mouseleave="hover = false">
    <SidebarLink to="/lyricsinput" :icon="IconCommunity" :hover="hover">Lyrics Input</SidebarLink>
    <SidebarLink to="/" :icon="IconSupport" :hover="hover">B</SidebarLink>
    <SidebarLink to="/" :icon="IconSupport" :hover="hover">C</SidebarLink>
    <button @click="toggleTheme">L/D</button>
    <div class="bottom">
      <SidebarLink to="/" :icon="IconSupport" :hover="hover">Settings</SidebarLink>
    </div>
  </div>
  <div class="view-dimmer" :class="{ hovered: hover }"></div>
</template>

<script setup lang="ts">
import SidebarLink from "./SidebarLink.vue"
import IconCommunity from "../icons/IconCommunity.vue"
import IconSupport from "../icons/IconSupport.vue"
import { ref, onMounted } from "vue"

const hover = ref(false)

const userPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

const setTheme = (theme: string) => {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.setItem("theme", theme)
}

/* const savedTheme = localStorage.getItem("theme")

if (savedTheme) {
  setTheme(savedTheme)
} else if (userPrefersDark) {
  setTheme("dark")
} else {
  setTheme("light")
} */

const toggleTheme = () => {
  const currentTheme = localStorage.getItem("theme") || (userPrefersDark ? "dark" : "light")
  const newTheme = currentTheme === "dark" ? "light" : "dark"
  setTheme(newTheme)
}

onMounted(() => {
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme) {
    setTheme(savedTheme)
  } else if (userPrefersDark) {
    setTheme("dark")
  } else {
    setTheme("light")
  }
})
</script>

<style scoped>
.sidebar {
  border-radius: 0 var(--border-small) var(--border-small) 0;
  background-color: var(--secondary-300);
  width: 40px;
  transition: all 0.5s var(--elastic);
  float: left;
  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;
  bottom: 0;
  padding: 0.5em;
  display: flex;
  flex-direction: column;
}
.sidebar:hover {
  width: 300px;
  filter: drop-shadow(5px 0 10px rgba(0, 0, 0, 0.5));
}

.sidebar .bottom {
  position: absolute;
  bottom: 0;
  padding-bottom: inherit;
  width: inherit;
}
.view-dimmer {
  pointer-events: none;
  background-color: rgba(0, 0, 0, 0);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  transition: all 0.5s var(--elastic);
}

.view-dimmer.hovered {
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
