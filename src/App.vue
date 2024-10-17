<template>
  <div>
    <!-- <Sidebar class="sidebar" /> -->
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router"
import Sidebar from "./components/sidebar/Sidebar.vue"
</script>

<style scoped>
.sidebar {
  flex-shrink: 0; /* Mantiene el tamaño fijo del sidebar */
}
</style>
