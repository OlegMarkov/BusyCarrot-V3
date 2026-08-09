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
    },

    async createCustomer(customer) {
      await apiClient.CustomersService.create(customer)
      await this.fetchCustomers()
    },

    /**
     * The whole customer goes back, not the changed fields.
     *
     * OwnerRepo.UpdateCustomer does `_context.Update(customer)` after loading
     * the existing row as-no-tracking, which is a full row replace: anything
     * absent from the body is written as null. So the dialog seeds its draft
     * from the stored record and returns all of it, including fields it does
     * not show — notes, chatId, chatLanguage — rather than a patch.
     */
    async updateCustomer(customerId, customer) {
      await apiClient.CustomersService.update(customerId, customer)
      await this.fetchCustomers()
    },

    /**
     * A soft delete server-side: the row stays and `isDeleted` flips, which is
     * why `activeCustomers` filters rather than the list simply shrinking.
     */
    async deleteCustomer(customerId) {
      await apiClient.CustomersService.delete(customerId)
      await this.fetchCustomers()
    }
  }
})
