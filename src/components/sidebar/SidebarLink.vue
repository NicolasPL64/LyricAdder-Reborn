<template>
  <router-link :to="to" class="sidebar-link" :class="[{ active: isActive }, { hovered: hover }]">
    <component :is="icon" class="icon" />
    <slot />
  </router-link>
</template>

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
  hover: {
    type: Boolean,
    required: false,
  },
})

const route = useRoute()
const isActive = computed(() => route.path === props.to)
</script>

<style scoped>
.sidebar-link {
  z-index: 1000;
  border-radius: 5px;
  display: flex;
  align-items: center;
  padding: 0.5em;
  color: var(--text-800);
  text-decoration: none;
  transition: all 0.2s;
}
.sidebar-link.active {
  background-color: var(--primary-400);
}
.sidebar-link:hover {
  background-color: var(--secondary-400);
}
.sidebar-link .icon {
  width: 1.5em;
  height: 1.5em;
  margin-right: 0.5em;
}

.hovered {
  color: var(--primary-950);
}
</style>
