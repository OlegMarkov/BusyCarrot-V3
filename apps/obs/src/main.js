import '@/styles/organic.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from '@/plugins/i18n'
import { router } from '@/router'
import App from '@/App.vue'


createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
