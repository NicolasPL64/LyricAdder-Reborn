import { createRouter, createWebHistory } from "vue-router"
import LyricsInputView from "@/views/LyricsInputView.vue"
import SettingsView from "@/views/SettingsView.vue"

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "Home",
      redirect: "/lyricsinput",
    },
    {
      path: "/lyricsinput",
      name: "LyricsInput",
      component: LyricsInputView,
    },
    {
      path: "/settings",
      name: "Settings",
      component: SettingsView,
    },
  ],
})

export default router
