import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/request'
import { tracked } from '@/stores/app'

/** Ported from vegetable.mobile.vue/store/customer.module.js. */
export const useCustomerStore = defineStore('customer', {
  state: () => ({
    customers: []
  }),

  getters: {
    activeCustomers: (state) => state.customers.filter((customer) => customer.isDeleted === false),
    getCustomerById: (state) => (id) => state.customers.find((customer) => customer.id === id)
  },

  actions: {
    setCustomers(customers) {
      this.customers = customers
    },

    async fetchCustomers() {
      return tracked(async () => {
        const { data } = await apiClient.CustomersService.fetch()
        this.customers = data
        return data
      })
    },

    async createCustomer(customer) {
      const data = await tracked(async () => {
        const response = await apiClient.CustomersService.create(customer)
        return response.data
      })
      await this.fetchCustomers()
      return data
    },

    async importCustomers(customers) {
      await tracked(() => apiClient.CustomersService.importCustomers(customers))
      return this.fetchCustomers()
    },

    async updateCustomer({ customerId, customer }) {
      await tracked(() => apiClient.CustomersService.update(customerId, customer))
      return this.fetchCustomers()
    },

    async deleteCustomer(customerId) {
      await tracked(() => apiClient.CustomersService.delete(customerId))
      return this.fetchCustomers()
    },

    /** A blank customer template from the API. Resolves the record, not the response. */
    async getEmptyCustomer() {
      return tracked(async () => {
        const { data } = await apiClient.CustomersService.get()
        return data
      })
    },

    /** Telegram invite link, shared over SMS or the system share sheet. */
    async getShareLink(customerId) {
      return tracked(async () => {
        const { data } = await apiClient.CustomersService.getShareLink(customerId)
        return data
      })
    },

    reset() {
      this.customers = []
    }
  }
})
