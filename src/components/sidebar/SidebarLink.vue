<script setup lang="ts">
import { useRoute } from "vue-router"
import { computed } from "vue"

const props = defineProps({
  to: {
    type: String,
    required: true,
  },
  icon: {
    type: Object,
    required: true,
  },
})

const route = useRoute()
const isActive = computed(() => route.path === props.to)
</script>

<template>
  <router-link :to="to" class="sidebar-link" :class="{ active: isActive }">
    <component :is="icon" class="icon" />
    <slot />
  </router-link>
</template>

<style scoped>
.sidebar-link {
  display: flex;
  align-items: center;
  padding: 0.5em;
  color: white;
  text-decoration: none;
  transition: background-color 0.2s;
}
.sidebar-link.active {
  background-color: black;
}
.sidebar-link:hover {
  background-color: blue;
}
.sidebar-link .icon {
  width: 1.5em;
  height: 1.5em;
  margin-right: 0.5em;
}
</style>
