<template>
  <div class="sidebar">
    <SidebarLink to="/lyricsinput" :icon="IconCommunity">Hola</SidebarLink>
    <SidebarLink to="/" :icon="IconSupport">HolxDDDDa</SidebarLink>
  </div>
</template>

<script setup lang="ts">
import SidebarLink from "./SidebarLink.vue"
import IconCommunity from "../icons/IconCommunity.vue"
import IconSupport from "../icons/IconSupport.vue"
</script>

<style scoped>
@import "../../assets/variables.css";

.sidebar {
  color: white;
  background-color: gray;
  width: 40px;
  transition: width 0.5s var(--elastic);
  float: left;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  bottom: 0;
  padding: 0.5em;
  display: flex;
  flex-direction: column;
}
.sidebar:hover {
  width: 300px;
}
</style>
