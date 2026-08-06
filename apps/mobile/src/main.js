import { createSSRApp } from 'vue'
import * as Pinia from 'pinia'
import App from './App.vue'
import { i18n } from '@/plugins/i18n'
import { setTokenProvider, setUnauthorizedHandler } from '@/plugins/request'
import { useUserStore } from '@/stores/user'

/**
 * Replaces vegetable.mobile.vue/main.js.
 *
 * Gone from the original:
 *  - `Vue.prototype.$store = store` — Pinia stores are imported where used.
 *  - `App.mpType = 'app'` — handled by the Vue 3 uni-app compiler.
 *
 * uni-app wants Pinia returned alongside the app instance so it can hand the
 * same instance to the SSR/H5 entry.
 */
export function createApp() {
  const app = createSSRApp(App)
  const pinia = Pinia.createPinia()

  app.use(pinia)
  app.use(i18n)

  // Wired here rather than imported inside plugins/request.js, which would make
  // request.js ↔ stores/user.js circular.
  setTokenProvider(() => useUserStore().accessToken)
  setUnauthorizedHandler(() => useUserStore().clearSession())

  return { app, Pinia }
}
