import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/api'

/**
 * Ported from vegetable.web/src/Frontend/ui/src/store/modules/owner.module.js.
 *
 * The alias ("moniker") used to be read out of a hidden <div id="moniker"> that
 * the Razor host rendered, and passed down by `provide('moniker', ...)`. Obs is
 * a standalone SPA now, so it comes from the route instead — see
 * src/router/index.js.
 *
 * The original swallowed every failure in `catch(e){ console.log(e) }`, which
 * left `owner` null and the page blank with no explanation. Failures are kept
 * here so the page can say what went wrong.
 */
export const useOwnerStore = defineStore('owner', {
  state: () => ({
    alias: null,
    owner: null,
    loading: false,
    error: null
  }),

  getters: {
    services: (state) => state.owner?.services ?? [],
    employees: (state) => state.owner?.employees ?? [],
    addresses: (state) => state.owner?.addresses ?? [],
    primaryAddress: (state) => state.owner?.addresses?.[0] ?? null
  },

  actions: {
    async fetchOwner(alias) {
      this.alias = alias
      this.loading = true
      this.error = null

      try {
        const { data } = await apiClient.PublicService.getOwnerByAlias(alias)

        // GetByAlias returns the JSON body as a string, and returns "null" —
        // not a 404 — for an alias nobody owns.
        const owner = typeof data === 'string' ? JSON.parse(data) : data
        if (!owner) {
          this.error = 'not-found'
          return null
        }

        this.owner = owner
        return owner
      } catch (error) {
        this.error = error
        return null
      } finally {
        this.loading = false
      }
    }
  }
})
