<template>
  <view class="nv flex flex-column overflow-hidden">
    <!-- The design gives this screen one add control, the full-width button at
         the end of the list, so the nav bar carries only the search. -->
    <uni-nav-bar :fixed="true" status-bar="true">
      <search-input @input="onSearchInput" />
    </uni-nav-bar>

    <scroll-view
      class="flex overflow-hidden"
      scroll-y
      :scroll-top="scrollTop"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
      @scroll="onScroll"
    >
      <view class="price-list">
        <view class="price-list__head">
          <text class="price-list__title">{{ $t('service.price-list') }}</text>
          <text class="price-list__count">{{ filteredServices.length }}</text>
        </view>

        <service-list-item
          v-for="service in filteredServices"
          :key="service.id"
          :service="service"
          @click="navigate(service)"
        />

        <view class="btn btn-secondary btn-block price-list__add" @click="navigate()">
          <text class="price-list__add-text">+ {{ $t('service.addnew') }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import searchInput from '@/components/app/search-input.vue'
import serviceListItem from '@/components/app/service-list-item.vue'
import { useAppStore } from '@/stores/app'
import { useServiceStore } from '@/stores/service'

/**
 * Ported from vegetable.mobile.vue/pages/service/services.nvue.
 *
 * Note the deliberate difference from the customer list: a service matches if
 * *any* search term hits its title or description (`some`), whereas a customer
 * has to match *every* term (`every`). Both behaviours are preserved as they
 * were, but the empty-search case is now explicit — `[].some()` is false, so
 * naively filtering out empty terms would have emptied the list.
 *
 * Other changes: `list-refresh` → `<scroll-view refresher-enabled>`;
 * `dom.scrollToElement` in `gotoTop()` → a bound `scroll-top` (Vue 3 does not
 * collect v-for refs into arrays, which is what the original indexed into);
 * `errorNotification` and the unused `t()` computed are gone.
 */
export default {
  components: { uniNavBar, searchInput, serviceListItem },
  data() {
    return {
      searchText: '',
      refreshing: false,
      scrollTop: 0,
      currentScrollTop: 0
    }
  },
  computed: {
    ...mapState(useServiceStore, ['activeServices']),
    ...mapState(useAppStore, ['tabIndex']),

    filteredServices() {
      const terms = this.searchText.trim().toLowerCase().split(' ').filter(Boolean)
      if (terms.length === 0) return this.activeServices

      return this.activeServices.filter((service) =>
        terms.some(
          (term) =>
            service.title?.toLowerCase().includes(term) ||
            service.description?.toLowerCase().includes(term)
        )
      )
    }
  },
  onLoad() {
    if (this.activeServices.length === 0) this.refresh()
  },
  onTabItemTap(item) {
    if (this.tabIndex === item.index) this.gotoTop()
    useAppStore().setTabIndex(item.index)
  },
  methods: {
    onSearchInput(text) {
      this.searchText = text
    },

    onScroll(event) {
      this.currentScrollTop = event.detail.scrollTop
    },

    navigate(service) {
      const url = service ? `/pages/service/edit?id=${service.id}` : '/pages/service/edit'
      uni.navigateTo({ url })
    },

    async refresh() {
      this.refreshing = true
      await useServiceStore().fetchServices()
      this.refreshing = false
    },

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
.price-list {
  padding: 14px;
}

.price-list__head {
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 10px;
}

.price-list__title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text);
}

.price-list__count {
  font-family: var(--font-body);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.price-list__add {
  margin-top: 14px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
}

.price-list__add-text {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text);
}
</style>
