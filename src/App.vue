<template>
  <Sidebar />
  <div class="page-container">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
  <ChangelogModal ref="changelogModal" />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router"
import Sidebar from "./components/sidebar/Sidebar.vue"
import ChangelogModal from "./components/ChangelogModal.vue"
import { onMounted, ref } from "vue"
import { setTheme, resolveTheme } from "./utils/settings"
import { checkForUpdates } from "./composables/useUpdater"
import { getChangelogHtml } from "./composables/useChangelog"

const changelogModal = ref<InstanceType<typeof ChangelogModal> | null>(null)

onMounted(async () => {
  if (import.meta.env.PROD) {
    checkForUpdates()
    const changelogHtml = await getChangelogHtml()
    if (changelogHtml) changelogModal.value?.open(changelogHtml)
  }
  const theme = await resolveTheme()
  setTheme(theme)
})
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
