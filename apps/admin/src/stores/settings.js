import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/api'

// Ported from vegetable/Vegetable.Admin/store/settings.module.js.
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    currencies: []
  }),
  actions: {
    async fetchCurrencies() {
      const { data } = await apiClient.SettingsService.getCurrencies()
      this.currencies = data
      return data
    }
  }
})
