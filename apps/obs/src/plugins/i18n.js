import { createI18n } from 'vue-i18n'
import moment from 'moment'
import 'moment/dist/locale/ru'
import en from '@/locales/en.json'
import ru from '@/locales/ru.json'

/**
 * Ported from vegetable.web/src/Frontend/ui/src/main.js.
 *
 * `globalInjection` keeps `$t` working in templates while the app stays on the
 * Composition-API i18n (`legacy: false`), which is how vegetable.web had it.
 *
 * The default is 'ru', matching that app and the booking store's initial
 * locale; the two used to be declared independently and could disagree.
 *
 * moment's ru locale is imported eagerly. vegetable.web relied on it being
 * bundled by webpack's default moment behaviour, which pulls in every locale —
 * Vite does not, so switching to Russian would have silently left dates in
 * English.
 */
export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: 'ru',
  fallbackLocale: 'en',
  messages: { en, ru }
})

moment.locale('ru')
