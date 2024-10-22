<template>
  <router-link :to="to" class="sidebar-link" :class="[{ active: isActive }, { hovered: hover }]">
    <component :is="icon" class="icon" />
    <div class="slot" :class="{ hovered: hover }">
      <slot />
    </div>
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
  border-radius: var(--border-small);
  display: flex;
  align-items: center;
  padding: 0.5em;
  color: var(--text-800);
  text-decoration: none;
  transition: all 0.2s;
  height: 1.5em;
  position: relative;
}
.sidebar-link.active {
  background-color: var(--primary-400);
}
.sidebar-link:hover {
  background-color: var(--secondary-400);
}
.sidebar-link .icon {
  /* HACK: How tf do I make the icon centered when collapsed */
  position: relative;
  left: 0.1em;
  flex-shrink: 0;
  margin-right: 1em; /* For the Slot */
}

.hovered {
  color: var(--primary-950);
}

.slot {
  position: relative;
  left: -2em;
  opacity: 0;
  pointer-events: none;
  text-wrap: nowrap;
  transition: all 0.5s var(--elastic); /* Transición suave */
}
.slot.hovered {
  left: 0px;
  opacity: 1;
}
</style>
