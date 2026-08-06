<template>
  <view v-if="accessToken" class="nv flex flex-column" style="align-content: stretch">
    <custom-nav-bar ref="navBar" status-bar="true">
      <!--
        The design gives the bar one bordered button at each end: today/reset on
        the left, the locale on the right. "Reset" here does both jobs the two
        old buttons did — returns to today *and* refetches — so nothing is lost
        by collapsing them into the one control the design draws.
      -->
      <template #left>
        <is-busy-indicator v-if="apiCallsAll" :loading="apiCallsAll" />
        <view v-else class="nav-box" @click="resetToToday">
          <uni-icons type="refresh" :size="17" color="#1d1f20" />
        </view>
      </template>

      <view class="nav-title">
        <text class="nav-title__month">{{ navText }}</text>
        <text v-if="ownerName" class="nav-title__owner">{{ ownerName }}</text>
      </view>

      <template #right>
        <view class="nav-box" @click="cycleLocale">
          <text class="nav-box__locale">{{ localeLabel }}</text>
        </view>
      </template>
    </custom-nav-bar>

    <week-strip />

    <dashboard-list ref="listHeight" class="flex overflow-hidden" :height="listHeight" />

    <view v-if="ifShowHint" class="hint" @click="dismissHint">
      <view class="image-container">
        <image src="@/static/finger-swipe.png" style="width: 100rpx; height: 100rpx" />
      </view>
      <text style="text-align: center">{{ $t('hints.swipe-day') }}</text>
    </view>

    <view v-if="isOldVersion" class="hint">
      <view class="image-container">
        <image src="@/static/warning.png" style="width: 100rpx; height: 100rpx" />
      </view>
      <text style="text-align: center">{{ $t('hints.old-version') }}</text>
    </view>

    <!--
      The sheets live at page level: a day row is inside a <swiper-item>, which
      clips anything that tries to cover the screen from in there.
    -->
    <new-reservation-sheet
      v-model="newSheet"
      :date="sheetDate"
      :start-time="sheetStartTime"
      @created="onReservationChanged"
    />
    <booking-detail-sheet
      v-model="detailSheet"
      :reservation-id="sheetReservationId"
      @deleted="onReservationChanged"
    />
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import customNavBar from '@/components/app/custom-nav-bar/custom-nav-bar.vue'
import weekStrip from '@/components/app/week-strip.vue'
import dashboardList from '@/components/app/dashboard/dashboard-list.vue'
import newReservationSheet from '@/components/app/dashboard/new-reservation-sheet.vue'
import bookingDetailSheet from '@/components/app/dashboard/booking-detail-sheet.vue'
import isBusyIndicator from '@/components/app/is-busy-indicator.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useOwnerStore } from '@/stores/owner'
import { useSettingsStore } from '@/stores/settings'
import { useReservationStore } from '@/stores/reservation'
import { capitalize } from '@/plugins/helpers'
import { tArray, LANGUAGES, getLocale } from '@/plugins/i18n'
import { publishDate, subscribeDate } from '@/plugins/date-bus'
import { subscribeSheet } from '@/plugins/sheet-bus'
import { getPushClientId, appVersion, isIOS } from '@/plugins/native'

/**
 * Ported from vegetable.mobile.vue/pages/index/index.nvue.
 *
 * The dashboard: a nav bar whose title is the shown month, a pull-down month
 * calendar behind it, and the swipeable day list beneath.
 *
 * Changes:
 *  - `BroadcastChannel('dateBC')` → plugins/date-bus.js (see the note there
 *    about the sender receiving its own messages)
 *  - `uni.requireNativePlugin('dom').getComponentRect` → `uni.createSelectorQuery()`.
 *    This is the one substitution that is not like-for-like: the query is async
 *    and only resolves after layout, so it runs in `$nextTick` and the list gets
 *    a sensible default until it lands.
 *  - `slot="left"` / `slot="right"` / `slot="expandable"` → `#left` / `#right` /
 *    `#expandable`; Vue 3 dropped the `slot` attribute
 *  - `<div>` → `<view>`; vuex → Pinia
 *  - `uniDrawer`, `flyoutMenu` and `errorNotification` were imported and
 *    registered but never rendered; dropped
 *  - `mapState(['testStore','locales','locale','token'])` referenced root Vuex
 *    state that did not exist; dropped
 *  - the unused `title`, `showMenu`, `date` handling around `bindLocaleChange` /
 *    `getLocaleIndex` (no locale picker in this template) is gone
 */
export default {
  components: {
    customNavBar,
    weekStrip,
    dashboardList,
    isBusyIndicator,
    uniIcons,
    newReservationSheet,
    bookingDetailSheet
  },
  data() {
    return {
      date: '',
      listHeight: 400,
      newSheet: false,
      detailSheet: false,
      sheetDate: '',
      sheetStartTime: '',
      sheetReservationId: ''
    }
  },
  computed: {
    ...mapState(useUserStore, ['accessToken', 'userDb']),
    ...mapState(useAppStore, ['isBusy', 'tabIndex', 'apiCallsAll']),
    ...mapState(useSettingsStore, ['hints', 'applicationSettings', 'language']),
    ...mapState(useOwnerStore, ['owner']),

    navText() {
      if (!this.date) return this.$t('common.loading')
      const mdate = moment(this.date)
      // Out-of-year months carry the year, so they use the short month names.
      if (mdate.year() !== new Date().getFullYear()) {
        return `${capitalize(tArray('calendar.monthsShort')[mdate.month()])}, ${mdate.year()}`
      }
      return capitalize(tArray('calendar.months')[mdate.month()])
    },

    /** Reads the store rather than getLocale() so the button re-renders on change. */
    localeLabel() {
      return (this.language || getLocale()).toUpperCase()
    },

    /** The design's nav carries the business under the month. */
    ownerName() {
      return this.owner?.title || ''
    },

    /** Show the swipe hint until the user has dismissed it once. */
    ifShowHint() {
      if (!this.userDb || !this.hints) return false
      return (this.userDb.shownHintsFlag & this.hints.dashboardSwipe) !== this.hints.dashboardSwipe
    },

    isOldVersion() {
      if (!this.applicationSettings) return false
      const current = appVersion()
      if (!current) return false
      const minimum = isIOS()
        ? this.applicationSettings.minIOSVersion
        : this.applicationSettings.minAndroidVersion
      return this.compareVersions(minimum, current) > 0
    }
  },

  onLoad() {
    if (!this.accessToken) {
      uni.redirectTo({ url: '/pages/login/loginint' })
      return
    }

    const settings = useSettingsStore()
    settings.fetchApplicationSettings()
    settings.fetchHints()
    settings.fetchCurrencies()
    useOwnerStore().fetchAllOwnerData()

    useUserStore()
      .fetchUser()
      .then((result) => {
        if (!result) return

        // Register this device for push if it isn't already, or if a previous
        // registration never recorded which platform it came from.
        const cid = getPushClientId()
        const registrations = result.userData || []
        const needsRegistration =
          cid &&
          (!registrations.some((item) => item.cid === cid) ||
            registrations.some((item) => item.cid === cid && item.platform == null))

        if (needsRegistration) {
          useUserStore().upsertUserData({
            phoneNumber: result.phoneNumber,
            cid,
            platform: uni.getSystemInfoSync().platform
          })
        }

        if (!result.onboardingCompleted) {
          uni.reLaunch({ url: '/pages/onboarding/onboarding' })
        }
      })

    this.unsubscribe = subscribeDate('index', (date) => {
      this.date = date
    })

    this.unsubscribeSheet = subscribeSheet((kind, payload) => {
      if (kind === 'new') {
        this.sheetDate = payload.date || this.date
        this.sheetStartTime = payload.startTime || ''
        this.newSheet = true
        return
      }
      if (kind === 'detail') {
        this.sheetReservationId = payload.reservationId
        this.detailSheet = true
      }
    })
  },

  onUnload() {
    this.unsubscribe?.()
    this.unsubscribeSheet?.()
  },

  onTabItemTap(item) {
    if (this.tabIndex === item.index) this.backToToday()
    useAppStore().setTabIndex(item.index)
  },

  mounted() {
    this.backToToday()
    this.measureListHeight()
  },

  methods: {
    /**
     * Replaces `dom.getComponentRect(this.$refs.listHeight, cb)`. The selector
     * query resolves after layout, so this runs on nextTick.
     */
    measureListHeight() {
      this.$nextTick(() => {
        uni
          .createSelectorQuery()
          .in(this)
          .select('.flex.overflow-hidden')
          .boundingClientRect((rect) => {
            if (rect && rect.height) this.listHeight = parseInt(rect.height, 10)
          })
          .exec()
      })
    },

    dismissHint() {
      const user = useUserStore()
      user.userDb.shownHintsFlag |= this.hints.dashboardSwipe
      user.updateUser(user.userDb)
    },

    backToToday() {
      this.date = moment().format('YYYY-MM-DD')
      publishDate(this.date, 'index')
    },

    refresh() {
      useOwnerStore().fetchAllOwnerData()
      const reservations = useReservationStore()
      reservations.fetchReservationsCountByDays()
      reservations.fetchReservationsTotalCostByMonth()
    },

    /** Refetch the day after a sheet creates or deletes a booking. */
    onReservationChanged() {
      useReservationStore().fetchReservations()
      this.refresh()
    },

    /** The nav bar's left button: the design's "today / reset", both jobs. */
    resetToToday() {
      this.backToToday()
      this.refresh()
    },

    /**
     * The design puts the locale in the nav bar rather than only in Settings.
     * Two languages, so the button steps rather than opening a picker; the
     * Settings control is unchanged and stays in sync through the store.
     */
    cycleLocale() {
      const next = LANGUAGES[(LANGUAGES.indexOf(getLocale()) + 1) % LANGUAGES.length]
      // The same action the Settings picker calls, so the two stay in step and
      // the native tab bar gets relabelled either way.
      useSettingsStore().upsertLanguage(next)
    },

    /** Returns > 0 when `a` is newer than `b`. Both are dotted version strings. */
    compareVersions(a, b) {
      const left = String(a).split('.').map(Number)
      const right = String(b).split('.').map(Number)
      const length = Math.max(left.length, right.length)
      for (let i = 0; i < length; i++) {
        const diff = (left[i] || 0) - (right[i] || 0)
        if (diff) return diff
      }
      return 0
    }
  }
}
</script>

<style lang="scss" scoped>
.nav-title {
  align-items: center;
}

.nav-title__month {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 19px;
  line-height: 1;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text);
}

.nav-title__owner {
  font-family: var(--font-body);
  font-size: 9.5px;
  line-height: 1.4;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

/* The nav's two icon buttons are framed squares, like every other object. */
.nav-box {
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
}

.nav-box__locale {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.08em;
  color: var(--color-text);
}

.hint {
  position: absolute;
  bottom: 10rpx;
  left: 10rpx;
  right: 10rpx;
  justify-content: center;
  flex-direction: column;
  background-color: $uni-bg-color-grey;
  border-radius: 20rpx;
  padding: 10rpx;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
