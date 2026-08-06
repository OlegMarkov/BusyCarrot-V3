<template>
  <customers-list ref="customersList" />
</template>

<script>
import { mapState } from 'pinia'
import customersList from '@/components/app/customers-list.vue'
import { useAppStore } from '@/stores/app'

/**
 * Ported from vegetable.mobile.vue/pages/customer/customers.nvue.
 * A thin host for components/app/customers-list; the only thing it adds is
 * "tap the active tab again to scroll back to the top".
 */
export default {
  components: { customersList },
  computed: {
    ...mapState(useAppStore, ['tabIndex'])
  },
  onTabItemTap(item) {
    if (this.tabIndex === item.index) this.$refs.customersList.gotoTop()
    useAppStore().setTabIndex(item.index)
  }
}
</script>
