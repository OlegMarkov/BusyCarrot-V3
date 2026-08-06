<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.currency')"
      @clickLeft="navigateBack()"
    />
    <items>
      <items-item
        v-for="currency in currencies || []"
        :key="currency.id"
        :title="$t('general-settings.currency-' + currency.currencyCode)"
        :selected="owner && owner.currency && owner.currency.id === currency.id"
        @click="navigateBack(currency)"
      />
    </items>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import items from '@/components/app/items.vue'
import itemsItem from '@/components/app/items-item.vue'
import { useSettingsStore } from '@/stores/settings'
import { useOwnerStore } from '@/stores/owner'

/**
 * Ported from vegetable.mobile.vue/pages/settings/currencies.nvue.
 *
 * Changes: the unused `currency` data field and the `onLoad` that assigned to an
 * undeclared `selectedCurrency` are gone; `currencies` and `owner.currency` are
 * guarded, since this page can open before either has loaded.
 */
export default {
  components: { uniNavBar, items, itemsItem },
  computed: {
    ...mapState(useSettingsStore, ['currencies']),
    ...mapState(useOwnerStore, ['owner'])
  },
  methods: {
    navigateBack(currency) {
      if (currency) {
        const owners = useOwnerStore()
        uni.$emit('update:currency', { currency })
        owners.owner.currency = currency
        owners.updateOwner(owners.owner)
      }
      uni.navigateBack()
    }
  }
}
</script>
