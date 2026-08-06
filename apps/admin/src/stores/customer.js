import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/api'

/**
 * NEW IN THE VUE 3 PORT — Vegetable.Admin had no customer store.
 *
 * The calendar needs customer names to label its events; the old demo calendar
 * used made-up event names instead, so nothing ever loaded customers.
 */
export const useCustomerStore = defineStore('customer', {
  state: () => ({
    customers: []
  }),

  getters: {
    activeCustomers: (state) => state.customers.filter((customer) => customer.isDeleted === false),
    getCustomerById: (state) => (id) => state.customers.find((customer) => customer.id === id)
  },

  actions: {
    async fetchCustomers() {
      const { data } = await apiClient.CustomersService.fetch()
      this.customers = data
      return data
    }
  }
})
