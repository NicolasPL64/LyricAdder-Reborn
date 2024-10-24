import "./assets/normalize.css"
import "./assets/variables.css"
import "./assets/v-tooltip.css"
import "./assets/toggle-switch.css"

import { createApp } from "vue"
import App from "./App.vue"

import PrimeVue from "primevue/config"
import router from "./router"

const app = createApp(App)

app.use(router)
app.use(PrimeVue, { theme: "none" })

app.mount("#app")
