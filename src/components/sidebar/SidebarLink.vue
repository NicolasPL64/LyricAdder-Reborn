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
  display: flex;
  position: relative;
  align-items: center;
  z-index: 1000;
  transition: all 0.2s;
  border-radius: var(--border-small);
  padding: 0.5em;
  height: 1.5em;
  color: var(--text-800);
  text-decoration: none;
}
.sidebar-link.active {
  background-color: var(--primary-400);
}
.sidebar-link:hover {
  background-color: var(--secondary-400);
}
.sidebar-link .icon {
  /* HACK: How tf do I make the icon perfectly centered when collapsed */
  position: relative;
  flex-shrink: 0;
  margin-right: 1em; /* For the Slot */
  width: 1.5em;
  height: 1.5em;
}

.hovered {
  color: var(--primary-950);
}

.slot {
  position: relative;
  left: -2em;
  opacity: 0;
  transition: all 0.5s var(--elastic); /* Transición suave */
  pointer-events: none;
  text-wrap: nowrap;
}
.slot.hovered {
  left: 0px;
  opacity: 1;
}
</style>
