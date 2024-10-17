import { createRouter, createWebHistory } from "vue-router"
import LyricsInputView from "@/views/LyricsInputView.vue"

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
  ],
})

export default router
