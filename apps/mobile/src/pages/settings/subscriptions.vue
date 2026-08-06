<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="$t('subscription.page-title')"
      @clickLeft="navigateBack"
    />

    <scroll-view class="flex overflow-hidden" scroll-y>
      <subscription-item
        v-for="subscriptionType in subscriptionTypes"
        :key="subscriptionType.id"
        :title="$t(subscriptionType.name)"
        :subtitle="subtitleFor(subscriptionType.id)"
        :note="$t(subscriptionType.description)"
        :is-checked="selectedSubscriptionId === subscriptionType.id"
        :status="statusFor(subscriptionType.id)"
        @click="selectSubscription(subscriptionType)"
      >
        <template #description>
          <view>
            <text v-for="(detail, index) in subscriptionDetails" :key="index" class="detail-line">
              {{ detail }}
            </text>
          </view>
        </template>
      </subscription-item>
    </scroll-view>

    <button
      v-if="selectedSubscriptionId !== defaultSubscriptionId"
      class="activate-subscription-button bottom"
      @click="$refs.plansPopup.open()"
    >
      {{ subscribeButtonText }}
    </button>

    <uni-popup ref="plansPopup" type="bottom">
      <view style="background-color: white">
        <view class="flex flex-column" style="padding-top: 10px; padding-bottom: 10px">
          <subscription-renew
            v-for="subscriptionDiscount in subscriptionDiscounts"
            :key="subscriptionDiscount.id"
            :subscription-plan="subscriptionDiscount"
            :selected-subsciption-id="selectedSubscriptionId"
            @click="subscribe(subscriptionDiscount.id)"
          />
        </view>
      </view>
    </uni-popup>

    <uni-popup ref="underConstructionPopup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">Under Construction</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="$refs.underConstructionPopup.close()">Ok</text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import subscriptionItem from '@/components/app/subscription-item.vue'
import subscriptionRenew from '@/components/app/subscription-renew.vue'
import { useOwnerStore } from '@/stores/owner'
import { useSubscriptionStore } from '@/stores/subscription'
import { openUrl } from '@/plugins/native'

/**
 * Ported from vegetable.mobile.vue/pages/settings/subscriptions.nvue.
 *
 * Lists the plans, expands the selected one to show its features, and opens a
 * sheet of purchase terms. Buying hands off to a payment URL from the API.
 *
 * Changes:
 *  - `defaultSubscriptionId` was a computed that, when the types had not loaded,
 *    *dispatched a fetch* and then fell straight through to
 *    `defaultSubscription.id` — throwing on `undefined.id` every time. It is a
 *    pure computed returning `null` until the data arrives; `onLoad` already
 *    fetches the types.
 *  - `subtitle`, `getStatus` and `subscribeButtonText` were computeds returning
 *    functions so the template could call them with an argument. The two that
 *    take an id are plain methods now; `subscribeButtonText` took none and is a
 *    real computed.
 *  - `<list>` → `<scroll-view>`; `<uni-title>` inside the description slot →
 *    plain `<text>` rows (uni-title was one of the vendored components nothing
 *    else used, so it is not ported)
 *  - `plus.runtime.openURL` → `openUrl()`; a stray `console.log("!!!!")` removed
 *  - store getters are `enabledSubscriptionTypes` / `enabledSubscriptionDiscounts`,
 *    which filter to enabled and sort by id as the originals did
 */
export default {
  components: { uniNavBar, uniPopup, subscriptionItem, subscriptionRenew },
  data() {
    return {
      selectedSubscriptionId: null
    }
  },
  computed: {
    ...mapState(useOwnerStore, ['owner']),
    ...mapState(useSubscriptionStore, {
      subscriptionTypes: 'enabledSubscriptionTypes',
      subscriptionDiscounts: 'enabledSubscriptionDiscounts'
    }),

    defaultSubscription() {
      return this.subscriptionTypes.find((type) => type.isDefault)
    },

    defaultSubscriptionId() {
      return this.defaultSubscription?.id ?? null
    },

    /** The feature list for the expanded plan, one line per pipe-separated part. */
    subscriptionDetails() {
      if (this.selectedSubscriptionId == null) return []
      return this.$t(`subscription.subscription-details-${this.selectedSubscriptionId}`).split('|')
    },

    subscribeButtonText() {
      if (!this.owner) return this.$t('subscription.subscribe')
      if (this.owner.hasActiveSubscription) {
        return this.owner.subscriptionTypeId === this.selectedSubscriptionId
          ? this.$t('subscription.renew')
          : this.$t('subscription.subscribe')
      }
      return this.owner.subscriptionEndDate != null
        ? this.$t('subscription.renew')
        : this.$t('subscription.subscribe')
    }
  },
  async onLoad() {
    const subscriptions = useSubscriptionStore()

    useOwnerStore().fetchAllOwnerData()
    subscriptions.fetchSubscriptionDiscounts()
    await subscriptions.fetchSubscriptionTypes()

    this.selectedSubscriptionId = this.owner?.hasActiveSubscription
      ? this.owner.subscriptionTypeId
      : this.defaultSubscriptionId
  },
  methods: {
    /** The free plan never expires; a paid one shows its end date. */
    subtitleFor(id) {
      const prefix = this.$t('subscription.expired-at')
      if (id === this.defaultSubscriptionId) return prefix + this.$t('subscription.no-limit')
      if (this.owner?.subscriptionEndDate != null) {
        return prefix + moment(this.owner.subscriptionEndDate).format('YYYY-MM-DD')
      }
      return ''
    },

    statusFor(id) {
      if (!this.owner) return 'none'
      if (this.owner.hasActiveSubscription) {
        return this.owner.subscriptionTypeId === id ? 'active' : 'none'
      }
      if (id === this.defaultSubscriptionId) return 'active'
      return this.owner.subscriptionEndDate != null ? 'expired' : 'none'
    },

    navigateBack() {
      uni.navigateBack()
    },

    selectSubscription(subscriptionType) {
      this.selectedSubscriptionId = subscriptionType.id
    },

    async subscribe(discountId) {
      const discount = this.subscriptionDiscounts.find((item) => item.id === discountId)
      if (!discount) return

      this.$refs.plansPopup.close()

      const paymentUrl = await useSubscriptionStore().initPayment({
        subscriptionTypeId: this.selectedSubscriptionId,
        quantity: discount.quantity
      })

      // An empty URL means the plan applied without payment (a free trial).
      if (paymentUrl === '') {
        useOwnerStore().fetchAllOwnerData()
        return
      }
      if (paymentUrl === 'underconstruction') {
        this.$refs.underConstructionPopup.open()
        return
      }
      if (paymentUrl) openUrl(paymentUrl)
    }
  }
}
</script>

<style lang="scss" scoped>
.detail-line {
  font-size: $uni-font-size-base;
  color: #666;
  margin-bottom: 8rpx;
}

.activate-subscription-button {
  border-color: rgba(17, 140, 60, 0.6);
  border-style: solid;
  color: rgba(17, 140, 60, 0.6);
  border-radius: 35rpx;
  border-width: 4rpx;
}

.bottom {
  position: fixed;
  left: $uni-spacing-col-base;
  right: $uni-spacing-col-base;
  /* #ifdef H5 */
  bottom: var(--window-bottom);
  /* #endif */
  /* #ifndef H5 */
  bottom: $uni-spacing-row-base;
  /* #endif */
}
</style>
