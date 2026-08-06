import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/request'

/**
 * Ported from vegetable.mobile.vue/store/logs.module.js.
 * Failures are swallowed on purpose — a logging call must never surface an
 * error to the user or interrupt whatever it was reporting on.
 */
export const useLogStore = defineStore('log', {
  actions: {
    async postLog(log) {
      try {
        await apiClient.LogsService.post(log)
      } catch {
        // intentionally ignored
      }
    }
  }
})
