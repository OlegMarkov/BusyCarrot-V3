import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/request'
import { tracked } from '@/stores/app'

/** Ported from vegetable.mobile.vue/store/subscription.module.js. */
export const useSubscriptionStore = defineStore('subscription', {
  state: () => ({
    subscriptionTypes: [],
    subscriptionDiscounts: []
  }),

  getters: {
    // The original sorted the state arrays in place inside the getter, which
    // mutates state during a read. Copying first keeps the getter pure.
    enabledSubscriptionTypes: (state) =>
      state.subscriptionTypes.filter((type) => type.isEnabled === true).sort((a, b) => a.id - b.id),
    enabledSubscriptionDiscounts: (state) =>
      state.subscriptionDiscounts
        .filter((type) => type.isEnabled === true)
        .sort((a, b) => a.id - b.id)
  },

  actions: {
    async fetchSubscriptionTypes() {
      return tracked(async () => {
        const { data } = await apiClient.SubscriptionService.fetchSubscriptionTypes()
        this.subscriptionTypes = data
        return data
      })
    },

    async fetchSubscriptionDiscounts() {
      return tracked(async () => {
        const { data } = await apiClient.SubscriptionService.fetchSubscriptionDiscounts()
        this.subscriptionDiscounts = data
        return data
      })
    },

    async initPayment({ subscriptionTypeId, quantity }) {
      return tracked(async () => {
        const { data } = await apiClient.SubscriptionService.initPayment(
          subscriptionTypeId,
          quantity
        )
        return data
      })
    }
  }
})
