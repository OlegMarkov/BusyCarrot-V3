import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/api'

/**
 * Ported from vegetable/Vegetable.Admin/store/service.module.js.
 *
 * Services are held as `{ id, checked, service }` wrappers, matching what the
 * old `selectedServices` Vuex getter produced and what the actions-panel rows
 * read (`serviceInfo.service.title`). `checked` drives the calendar filter and
 * survives a refetch so toggling a service off does not undo itself when the
 * list reloads.
 */
export const useServiceStore = defineStore('service', {
  state: () => ({
    services: []
  }),

  getters: {
    /** The wrappers, for the actions-panel list. */
    selectedServices: (state) => state.services,

    /** The service record itself, for everything else. */
    getServiceById: (state) => (id) => state.services.find((item) => item.id === id)?.service,

    /**
     * The service records themselves, unwrapped and minus the deleted ones —
     * the shape the pages want, and the counterpart of the customer store's
     * `activeCustomers`. Without it every caller has to know about the
     * `{ id, checked, service }` wrapper.
     */
    activeServices: (state) =>
      state.services
        .map((item) => item.service)
        .filter((service) => service && service.isDeleted !== true),

    checkedServiceIds: (state) =>
      state.services.filter((item) => item.checked).map((item) => item.id)
  },

  actions: {
    setServices(services) {
      this.services = services.map((service) => {
        const current = this.services.find((item) => item.id === service.id)
        return {
          id: service.id,
          checked: current ? current.checked : true,
          service
        }
      })
    },

    setServiceChecked(serviceId, checked) {
      const entry = this.services.find((item) => item.id === serviceId)
      if (entry) entry.checked = checked
    },

    async fetchServices() {
      const { data } = await apiClient.ServicesService.fetch()
      this.setServices(data)
      return data
    },

    async createService(service) {
      await apiClient.ServicesService.create(service)
      await this.fetchServices()
    },

    async updateService(serviceId, service) {
      await apiClient.ServicesService.update(serviceId, service)
      await this.fetchServices()
    },

    async deleteService(serviceId) {
      await apiClient.ServicesService.delete(serviceId)
      await this.fetchServices()
    }
  }
})
