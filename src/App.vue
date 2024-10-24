<template>
  <Sidebar />
  <div class="page-container">
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router"
import Sidebar from "./components/sidebar/Sidebar.vue"
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
