<template>
  <div class="sidebar" @mouseover="hover = true" @mouseleave="hover = false">
    <SidebarLink to="/lyricsinput" :icon="IconLyricsInput" :hover="hover">Lyrics Input</SidebarLink>
    <SidebarLink to="/" :icon="IconMusic" :hover="hover" style="cursor: not-allowed"
      >Lyrics Preview (soon)</SidebarLink
    >
    <SidebarLink to="/" :icon="IconAbout" :hover="hover">About</SidebarLink>

    <div class="bottom">
      <SidebarLink to="/settings" :icon="IconSettings" :hover="hover">Settings</SidebarLink>
    </div>
  </div>
  <div class="view-dimmer" :class="{ hovered: hover }"></div>
</template>

<script setup lang="ts">
import SidebarLink from "./SidebarLink.vue"
import IconLyricsInput from "../icons/IconLyricsInput.vue"
import IconMusic from "../icons/IconMusic.vue"
import IconAbout from "../icons/IconAbout.vue"
import IconSettings from "../icons/IconSettings.vue"
import { ref } from "vue"

// TODO: Make this bool false when clicking on a SidebarLink so the sidebar closes
const hover = ref(false)
</script>

<style scoped>
.sidebar {
  display: flex;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  flex-direction: column;
  float: left;
  z-index: 1000;
  transition: all 0.5s var(--elastic);
  border-radius: 0 var(--border-small) var(--border-small) 0;
  background-color: var(--secondary-300);
  padding: 0.5em;
  width: 40px;
}
.sidebar:hover {
  filter: drop-shadow(5px 0 10px rgba(0, 0, 0, 0.5));
  width: 240px;
}

.sidebar .bottom {
  position: absolute;
  bottom: 0;
  padding-bottom: inherit;
  width: inherit;
}
.view-dimmer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  transition: all 0.5s var(--elastic);
  background-color: rgba(0, 0, 0, 0);
  pointer-events: none;
}

.view-dimmer.hovered {
  backdrop-filter: blur(1px);
  background-color: rgba(0, 0, 0, 0.3);
}
</style>
