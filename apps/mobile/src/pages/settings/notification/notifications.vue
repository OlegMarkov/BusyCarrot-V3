<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar
      :fixed="true"
      status-bar="true"
      left-icon="arrowleft"
      :title="$t('general-settings.notifications')"
      @clickLeft="navigateBack"
    />

    <scroll-view
      class="flex overflow-hidden"
      scroll-y
      :scroll-top="scrollTop"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
      @scroll="onScroll"
    >
      <uni-list v-if="notifications.length > 0">
        <template v-for="day in days" :key="day">
          <template v-if="getNotificationsByDate(day).length > 0">
            <view class="feed-day">
              <text class="feed-day__num">{{ formatDate(day) }}</text>
              <text class="feed-day__dow">{{ formatDay(day) }}</text>
              <view class="feed-day__rule" />
            </view>
            <notification-list-item
              v-for="notification in getNotificationsByDate(day)"
              :key="notification.id"
              class="notification-item"
              :notification="notification"
              @click="navigate(notification)"
            />
          </template>
        </template>
      </uni-list>

      <view v-else class="flex flex-container">
        <text class="no-notifications">{{ $t('notifications.no-notifications') }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniList from '@/components/ui/uni-list/uni-list.vue'
import uniSection from '@/components/ui/uni-section/uni-section.vue'
import notificationListItem from '@/components/app/notification-list-item.vue'
import { useNotificationStore } from '@/stores/notification'
import { useEmployeeStore } from '@/stores/employee'
import { useSettingsStore } from '@/stores/settings'

/** The feed covers the last two weeks, newest day first. */
const INTERVAL_DAYS = 14

/**
 * Ported from vegetable.mobile.vue/pages/settings/notification/notifications.nvue.
 *
 * The notification feed, grouped under a sticky day header.
 *
 * Changes:
 *  - the `<template v-for … v-if>` pair on one element is split: Vue 2 ran
 *    `v-for` first, Vue 3 runs `v-if` first, which would have left `day`
 *    undefined inside the condition had it referenced the loop variable
 *  - `interval()` was a method called from the template, so it rebuilt the
 *    14-day array on every re-render; it is a computed now
 *  - `list-refresh` → `<scroll-view refresher-enabled>`; `dom.scrollToElement`
 *    → a bound `scroll-top`
 *  - `onTabItemTap` is gone: this page is pushed from Settings rather than being
 *    a tab, and it read `this.tabIndex`, which was never mapped here
 *  - `getNotificationsByDatetest` (unused), the duplicated `notificationTypes`
 *    map (unused here) and the `searchInput` import (never rendered) are dropped
 */
export default {
  components: { uniNavBar, uniList, uniSection, notificationListItem },
  data() {
    return {
      refreshing: false,
      scrollTop: 0,
      currentScrollTop: 0
    }
  },
  computed: {
    ...mapState(useNotificationStore, ['notifications', 'getNotificationsByDate']),
    ...mapState(useEmployeeStore, ['employees']),
    ...mapState(useSettingsStore, ['language']),

    days() {
      const today = moment().local()
      return Array.from({ length: INTERVAL_DAYS + 1 }, (_, offset) =>
        today.clone().add(-offset, 'd').format('YYYY-MM-DD')
      )
    }
  },
  async onLoad() {
    // The feed renders employee names, so make sure they are loaded first.
    if (this.employees.length === 0) {
      this.refreshing = true
      await useEmployeeStore().fetchEmployees()
      this.refreshing = false
    }
    if (this.notifications.length === 0) await this.refresh()
  },
  methods: {
    formatDate(date) {
      moment.locale(this.language)
      return moment(date).format('ddd')
    },

    formatDay(date) {
      moment.locale(this.language)
      return moment(date).format('D')
    },

    navigate(notification) {
      const url = notification
        ? `/pages/settings/notification/edit?id=${notification.id}`
        : '/pages/settings/notification/edit'
      uni.navigateTo({ url })
    },

    navigateBack() {
      uni.navigateBack()
    },

    async refresh() {
      this.refreshing = true
      await useNotificationStore().fetchNotifications()
      this.refreshing = false
    },

    onScroll(event) {
      this.currentScrollTop = event.detail.scrollTop
    }
  }
}
</script>

<style lang="scss" scoped>
.feed-day {
  flex-direction: row;
  align-items: baseline;
  padding: 16px 16px 8px;
  background-color: var(--color-bg);
}

.feed-day__num {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 21px;
  line-height: 1;
  color: var(--color-text);
  margin-right: 9px;
}

.feed-day__dow {
  font-family: var(--font-body);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin-right: 9px;
}

.feed-day__rule {
  flex: 1;
  height: 1px;
  background-color: var(--color-divider);
}
</style>
