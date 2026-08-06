import { createI18n } from 'vue-i18n'
import moment from 'moment'
// moment ships no locale data unless it is imported. Webpack used to pull the
// whole locale directory in by default, so the Vue 2 app got Russian dates for
// free; Vite does not, which made every `moment.locale('ru')` in the app a
// silent no-op — the UI switched language and the dates stayed English.
import 'moment/dist/locale/ru'
import en from '@/locales/en.json'
import ru from '@/locales/ru.json'

export const LANGUAGES = ['en', 'ru']

/**
 * Ported from vegetable.mobile.vue/plugins/i18n.js (vue-i18n v8) and the
 * `getLanguage()` helper that used to live in store/settings.module.js.
 *
 * `legacy: true` keeps `this.$t` / `$t` available in Options API components,
 * which is what lets the port delete the old global-access hack: every
 * component used to define a `t()` computed that reached through
 * `getApp().globalData.$t` (73 call sites) because the Vue 2 i18n instance
 * wasn't reachable from nvue components. That is no longer necessary.
 */
function initialLocale() {
  const stored = uni.getStorageSync('language')
  if (stored && LANGUAGES.includes(stored)) return stored

  const system = uni.getSystemInfoSync().language || 'en'
  const short = system.substring(0, 2)
  return LANGUAGES.includes(short) ? short : 'en'
}

export const i18n = createI18n({
  legacy: true,
  globalInjection: true,
  locale: initialLocale(),
  fallbackLocale: 'en',
  messages: { en, ru }
})

/** For non-component callers (helpers, the request transport, App.vue). */
export function t(key, ...args) {
  return i18n.global.t(key, ...args)
}

/**
 * Read an array out of the locale files — month names, weekday names, etc.
 *
 * Required by the v8 → v9 upgrade: `$t()` used to hand back whatever was in the
 * messages, so the old code could write `t('calendar.months')[date.month()]`.
 * In v9 `t()` always returns a string, so that expression silently indexed into
 * the *key* and produced single characters. `tm()` is the v9 way to reach a
 * non-string message; `rt()` resolves each entry, which is a no-op for plain
 * strings but required if a message ever gains interpolation.
 */
export function tArray(key) {
  const messages = i18n.global.tm(key)
  return Array.isArray(messages) ? messages.map((message) => i18n.global.rt(message)) : []
}

export function getLocale() {
  return i18n.global.locale
}

export function setLocale(locale) {
  if (!LANGUAGES.includes(locale)) return
  i18n.global.locale = locale
  // Keep moment in step, so dates follow the interface language. The six
  // components that format dates each call `moment.locale(language)` too;
  // this makes the app-wide default correct even before one of them runs.
  moment.locale(locale)
  uni.setStorageSync('language', locale)
}

/**
 * The tab bar is rendered natively, so its labels can't come from the template
 * and have to be pushed after every locale change. Was duplicated three times
 * in the original (App.vue, plugins/helpers.js, store/settings.module.js).
 */
export function updateTabBarText() {
  const keys = [
    'menu.tab-dashboard',
    'menu.tab-clients',
    'menu.tab-services',
    'menu.tab-schedules',
    'menu.tab-settings'
  ]
  keys.forEach((key, index) => {
    // `setTabBarItem` rejects with "not TabBar page" whenever the current page
    // is not one of the five tabs — which is the case at boot, and on the login
    // and edit screens. That is a benign condition, not a failure, but without
    // a handler each call surfaces as an uncaught rejection and buries real
    // errors in the console.
    const result = uni.setTabBarItem({ index, text: t(key) })
    if (result && typeof result.catch === 'function') result.catch(() => {})
  })
}
