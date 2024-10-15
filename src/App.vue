<script setup lang="ts">
import { RouterView } from "vue-router"
import Sidebar from "./components/sidebar/Sidebar.vue"
</script>

<template>
  <div>
    <Sidebar />
    <RouterView class="routerview" />
  </div>
</template>

<style scoped>
.div {
  color: black;
}

.routerview {
  position: absolute;
  inset: 0px 0px 0px 50px;
}
</style>
