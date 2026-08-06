<template>
  <view class="nv renew-body" @click="$emit('click')">
    <view v-if="trialOnly" class="flex-column">
      <text class="renew-text-trial-only">{{ trial }}</text>
    </view>

    <view v-else class="flex-column">
      <text class="renew-text-period">{{ period }}</text>
      <view class="flex-row renew-row">
        <text v-if="totalPrice < totalPriceOld" class="renew-text renew-text--struck">
          {{ totalPriceOld }}
        </text>
        <text class="renew-text-price">{{ totalPrice }}{{ currencySymbol }}</text>
      </view>
      <text class="renew-text-price">{{ totalPricePerMonth }}</text>
    </view>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import { useOwnerStore } from '@/stores/owner'
import { useSubscriptionStore } from '@/stores/subscription'

/**
 * Ported from vegetable.mobile.vue/components/app/subscription-renew.nvue.
 *
 * One purchase option inside the "renew" sheet: a term length, its discounted
 * price with the undiscounted one struck through, and the per-month equivalent.
 * Terms fully covered by the free trial show as trial-only instead.
 *
 * Changes:
 *  - `{{this.owner.currency.symbol}}` in the template (the `this.` prefix) → a
 *    guarded `currencySymbol` computed
 *  - `<div>` → `<view>`; the inline `text-decoration: line-through` → a class
 *  - `totalPrice` and `totalPriceOld` shared their whole trial/quantity
 *    calculation, differing only by whether the discount applied; that is one
 *    `priceFor(unitPrice)` helper now
 *  - the selected plan may not be in the loaded types list yet, so the price
 *    lookup is guarded — the original threw on `.price` of undefined
 */
export default {
  name: 'SubscriptionRenew',
  emits: ['click'],
  props: {
    subscriptionPlan: { type: Object, required: true },
    selectedSubsciptionId: { type: [String, Number], default: null }
  },
  computed: {
    ...mapState(useOwnerStore, ['owner']),
    ...mapState(useSubscriptionStore, ['enabledSubscriptionTypes']),

    currencySymbol() {
      return this.owner?.currency?.symbol || ''
    },

    /** The trial is only on offer to an owner who has never subscribed. */
    isTrialAvailable() {
      return this.owner?.subscriptionStartDate == null
    },

    trialOnly() {
      return (
        this.isTrialAvailable &&
        this.subscriptionPlan.quantity <= this.subscriptionPlan.trialQuantity
      )
    },

    trial() {
      if (!this.isTrialAvailable) return ''
      return `${this.subscriptionPlan.trialQuantity} ${this.$t('subscription.month-free')}`
    },

    period() {
      return `${this.subscriptionPlan.quantity} ${this.$t('subscription.month')}`
    },

    /** Prices come from the API in minor units. */
    unitPrice() {
      const type = this.enabledSubscriptionTypes.find(
        (item) => item.id === this.selectedSubsciptionId
      )
      return type ? type.price / 100 : 0
    },

    totalPrice() {
      return this.priceFor(this.unitPrice * (1 - this.subscriptionPlan.percentage / 100))
    },

    totalPriceOld() {
      return this.priceFor(this.unitPrice)
    },

    totalPricePerMonth() {
      const perMonth = Math.round(this.totalPrice / this.subscriptionPlan.quantity)
      return `${perMonth}${this.currencySymbol} ${this.$t('subscription.perMonth')}`
    }
  },
  methods: {
    /** Free trial months are not charged for. */
    priceFor(monthlyPrice) {
      const { quantity, trialQuantity } = this.subscriptionPlan
      if (!this.isTrialAvailable) return monthlyPrice * quantity
      if (quantity <= trialQuantity) return null
      return monthlyPrice * (quantity - trialQuantity)
    }
  }
}
</script>

<style lang="scss" scoped>
.renew-body {
  height: 200rpx;
  justify-content: center;
  margin: 5rpx $uni-spacing-col-base;
  border-color: rgba(17, 140, 60, 0.6);
  border-width: 4rpx;
  border-style: solid;
  border-radius: 35rpx;
}

.renew-text-period {
  font-size: $uni-font-size-xlg;
  font-weight: 500;
  text-align: center;
}

.renew-text-price {
  font-size: $uni-font-size-xlg;
  color: rgba(17, 140, 60, 1);
  font-weight: 500;
  text-align: center;
}

.renew-text-trial-only {
  font-size: 40rpx;
  font-weight: 500;
  text-align: center;
}

.renew-text {
  font-size: 35rpx;
  color: #999999;
  text-align: center;
  margin-right: 10rpx;
}

.renew-text--struck {
  text-decoration: line-through;
}

.renew-row {
  align-items: center;
  justify-content: center;
  padding: 5rpx;
}
</style>
