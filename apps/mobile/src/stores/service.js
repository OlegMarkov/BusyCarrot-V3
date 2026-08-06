import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/request'
import { tracked } from '@/stores/app'
import { setServiceIsChecked } from '@/plugins/local-storage'

/** Ported from vegetable.mobile.vue/store/service.module.js. */
export const useServiceStore = defineStore('service', {
  state: () => ({
    services: [],
    selectedServices: []
  }),

  getters: {
    activeServices: (state) => state.services.filter((service) => service.isDeleted === false),
    getServiceById: (state) => (id) => state.services.find((service) => service.id === id)
  },

  actions: {
    setServices(services) {
      this.services = services
    },

    async fetchServices() {
      return tracked(async () => {
        const { data } = await apiClient.ServicesService.fetch()
        // NOTE: unlike employees, the original had the per-service isChecked
        // hydration commented out here, so services come back without the flag.
        // Left as-is rather than "fixed" — turning it on would change which
        // services the dashboard filter shows.
        this.services = data
        return data
      })
    },

    async createService(service) {
      const data = await tracked(async () => {
        const response = await apiClient.ServicesService.create(service)
        return response.data
      })
      await this.fetchServices()
      return data
    },

    async updateService({ serviceId, service }) {
      await tracked(() => apiClient.ServicesService.update(serviceId, service))
      return this.fetchServices()
    },

    async deleteService(serviceId) {
      await tracked(() => apiClient.ServicesService.delete(serviceId))
      return this.fetchServices()
    },

    async updateServiceIsChecked({ serviceId, isChecked }) {
      await setServiceIsChecked(serviceId, isChecked)
      const service = this.services.find((item) => item.id === serviceId)
      if (service) service.isChecked = isChecked
    },

    /** A blank service template from the API. Resolves the record, not the response. */
    async getEmptyService() {
      return tracked(async () => {
        const { data } = await apiClient.ServicesService.get()
        return data
      })
    },

    reset() {
      this.services = []
      this.selectedServices = []
    }
  }
})
