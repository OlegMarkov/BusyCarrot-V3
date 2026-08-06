import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/request'
import { tracked } from '@/stores/app'
import { LANGUAGES, getLocale, setLocale, updateTabBarText } from '@/plugins/i18n'

/**
 * Ported from vegetable.mobile.vue/store/settings.module.js.
 *
 * The original's `getLanguage()` ran at module load and was broken: inside the
 * `uni.setStorage` success callback it referenced `this.state` and `this.store`,
 * neither of which exists there, so on a device whose system language was `en`
 * or `ru` and had nothing stored yet it threw, got swallowed by the outer
 * try/catch, and `language` was initialised to `{}` instead of a string.
 *
 * Locale resolution now lives in plugins/i18n.js (`initialLocale()`), and this
 * store simply reflects it.
 */
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    currencies: null,
    applicationSettings: null,
    languages: LANGUAGES,
    language: getLocale(),
    hints: null
  }),

  actions: {
    async fetchCurrencies() {
      return tracked(async () => {
        const { data } = await apiClient.SettingsService.getCurrencies()
        this.currencies = data
        return data
      })
    },

    async fetchApplicationSettings() {
      return tracked(async () => {
        const { data } = await apiClient.SettingsService.getApplicationSettings()
        this.applicationSettings = data
        return data
      })
    },

    async fetchHints() {
      return tracked(async () => {
        const { data } = await apiClient.SettingsService.getHints()
        this.hints = data
        return data
      })
    },

    /** Was UPSERT_LANGUAGE: persist, switch vue-i18n, relabel the native tab bar. */
    upsertLanguage(language) {
      if (!this.languages.includes(language)) return
      setLocale(language)
      this.language = language
      updateTabBarText()
    }
  }
})
