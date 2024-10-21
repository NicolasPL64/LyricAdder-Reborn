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
  padding-left: 4rem;
}
</style>
