import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { i18n } from '@/plugins/i18n'
import { router } from '@/router'
import App from '@/App.vue'

// The Industry design system. Vuetify is gone: the desktop design is built from
// this stylesheet's own primitives (.btn, .table, .blueprint, .seg, .input,
// .tag) and uses no Material component, so carrying Vuetify would have meant
// shipping a UI framework nothing rendered.
import '@/styles/industry.css'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

createApp(App).use(pinia).use(router).use(i18n).mount('#app')
