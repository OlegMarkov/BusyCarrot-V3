<template>
  <view class="nv flex flex-column overflow-hidden">
    <!--
      The design pairs the search field with a square primary add button on the
      same row, rather than hiding "add" behind an icon in the nav bar's right
      slot. Same action, same popup — it is just visible now.
    -->
    <uni-nav-bar :fixed="true" status-bar="true">
      <view class="tools">
        <search-input class="tools__search" @input="onSearchInput" />
        <view class="tools__add" @click="openAddCustomerOptionsPopup">
          <uni-icons type="plus" :size="17" color="#f2f2f3" />
        </view>
      </view>
    </uni-nav-bar>

    <uni-popup-options
      ref="addCustomerWay"
      type="bottom"
      :mask-click="true"
      :title="$t('customer.add-new-popup-message')"
    >
      <uni-list-options>
        <uni-list-option-item
          :title="$t('customer.addnew')"
          show-extra-icon="true"
          :extra-icon="{ size: '23', type: 'plusempty' }"
          @click="navigate()"
        />
        <uni-list-option-item
          :title="$t('customer.addfromphone')"
          show-extra-icon="true"
          :extra-icon="{ size: '23', type: 'upload' }"
          @click="openContactImportPage"
        />
      </uni-list-options>
    </uni-popup-options>

    <scroll-view
      class="flex overflow-hidden"
      scroll-y
      :scroll-top="scrollTop"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
      @scrolltolower="increasePage"
      @scroll="onScroll"
    >
      <customer-list-item
        v-for="customer in loadedCustomers"
        :key="customer.id"
        :customer="customer"
        @click="navigate(customer)"
      />
    </scroll-view>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import searchInput from '@/components/app/search-input.vue'
import customerListItem from '@/components/app/customer-list-item.vue'
import uniPopupOptions from '@/components/app/popup-options/uni-popup-options.vue'
import uniListOptions from '@/components/app/popup-options/uni-list-options.vue'
import uniListOptionItem from '@/components/app/popup-options/uni-list-option-item.vue'
import { useCustomerStore } from '@/stores/customer'

const PAGE_SIZE = 25

/**
 * Ported from vegetable.mobile.vue/components/app/customers-list.nvue.
 *
 * The searchable, paged customer list behind the Clients tab.
 *
 * Changes:
 *  - the nvue `<list>` plus the separate `list-refresh` component become one
 *    `<scroll-view>` with `refresher-enabled` and `@scrolltolower`. Note that
 *    `@scrolltolower` now actually fires: it was declared on `<uni-list>` in the
 *    original, but that only wired up on the nvue renderer, so infinite scroll
 *    silently did nothing on the webview side and the list stayed capped at 25.
 *  - `dom.scrollToElement` in `gotoTop()` → binding `scroll-top`. The original
 *    looked up `$refs[firstCustomerId][0]` and recursed through `$nextTick`
 *    until the ref existed; Vue 3 does not collect v-for refs into arrays under
 *    a shared name, and the scroll-view makes the whole dance unnecessary.
 *  - `_.sortBy` → `Array.prototype.sort`; the two unused locals (`terms`, the
 *    shadowed `results`) in the filter are gone
 *  - the `uniPopup`, `uniPopupDialog` and `errorNotification` imports were never
 *    rendered; dropped. `customerToDelete` was likewise unused state.
 */
export default {
  name: 'CustomersList',
  components: {
    uniNavBar,
    uniIcons,
    searchInput,
    customerListItem,
    uniPopupOptions,
    uniListOptions,
    uniListOptionItem
  },
  data() {
    return {
      searchText: '',
      refreshing: false,
      page: 1,
      scrollTop: 0
    }
  },
  computed: {
    ...mapState(useCustomerStore, ['activeCustomers']),

    /** Every search term must match the first or last name. */
    filteredCustomers() {
      const terms = this.searchText.trim().toLowerCase().split(' ').filter(Boolean)

      const matches = this.activeCustomers.filter((customer) =>
        terms.every(
          (term) =>
            customer.firstName?.toLowerCase().includes(term) ||
            customer.lastName?.toLowerCase().includes(term)
        )
      )

      return [...matches].sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''))
    },

    loadedCustomers() {
      return this.filteredCustomers.slice(0, this.page * PAGE_SIZE)
    }
  },
  methods: {
    onSearchInput(text) {
      this.searchText = text
      this.page = 1
    },

    increasePage() {
      if (this.loadedCustomers.length < this.filteredCustomers.length) this.page += 1
    },

    /** Keep `scrollTop` in step so setting it to 0 always registers as a change. */
    onScroll(event) {
      this.currentScrollTop = event.detail.scrollTop
    },

    navigate(customer) {
      const url = customer ? `/pages/customer/edit?id=${customer.id}` : '/pages/customer/edit'
      uni.navigateTo({ url })
    },

    openAddCustomerOptionsPopup() {
      const actions = [
        { label: this.$t('customer.addnew'), run: () => this.navigate() },
        { label: this.$t('customer.addfromphone'), run: () => this.openContactImportPage() }
      ]
      uni.showActionSheet({
        itemList: actions.map((action) => action.label),
        success: (res) => actions[res.tapIndex]?.run()
      })
    },

    openContactImportPage() {
      uni.navigateTo({ url: '/pages/customer/contactImportList' })
    },

    async refresh() {
      this.refreshing = true
      await useCustomerStore().fetchCustomers()
      this.page = 1
      this.refreshing = false
    },

    /** Called by the page when the active tab is tapped again. */
    gotoTop() {
      this.scrollTop = this.currentScrollTop || 1
      this.$nextTick(() => {
        this.scrollTop = 0
      })
    }
  }
}
</script>

<style lang="scss" scoped>
/* The search field and the add button share one row; the button is the
   system's one solid object, 36px square to match the field's height. */
.tools {
  flex: 1;
  flex-direction: row;
  align-items: center;
}

.tools__search {
  flex: 1;
}

.tools__add {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  background-color: var(--color-accent);
  border: 1px solid var(--color-accent);
}
</style>
