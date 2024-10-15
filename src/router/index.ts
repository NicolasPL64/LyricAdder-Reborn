import { createRouter, createWebHistory } from "vue-router"
import LyricsInput from "@/views/LyricsInput.vue"

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
      component: LyricsInput,
    },
  ],
})

export default router
