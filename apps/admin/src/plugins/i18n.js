import { createI18n } from 'vue-i18n'
import en from '@/locales/en.json'
import ru from '@/locales/ru.json'

// Ported from vegetable/Vegetable.Admin/plugins/i18n.js (vue-i18n v8 -> v9 API).
export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ru }
})
