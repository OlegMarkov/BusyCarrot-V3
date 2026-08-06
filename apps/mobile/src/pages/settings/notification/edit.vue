<template>
  <view class="nv">
    <uni-nav-bar
      left-icon="arrowleft"
      right-icon="checkmarkempty"
      status-bar="true"
      fixed="true"
      title=""
      @clickLeft="navigateBack"
      @clickRight="save"
    />

    <form class="form">
      <view class="custom-container">
        <view class="custom-icon">
          <uni-icons
            :color="notificationIcon.color"
            size="20"
            :type="notificationIcon.type"
            class="uni-icon-wrapper"
          />
        </view>
        <view class="custom-content">
          <text class="custom-title">{{ notification.title }}</text>
        </view>
      </view>

      <view v-if="isReservationNotification" class="padding-20-0">
        <view class="custom-container" @click="navigateToReservation">
          <view class="custom-icon">
            <uni-icons color="black" size="30" type="cart" class="uni-icon-wrapper" />
          </view>
          <view class="custom-content">
            <text class="custom-title">{{ services }}</text>
            <text class="custom-note">{{ formatDate }}</text>
          </view>
        </view>

        <view class="custom-container" @click="navigateToCustomer">
          <view class="custom-icon">
            <uni-icons color="black" size="30" type="person" class="uni-icon-wrapper" />
          </view>
          <view class="custom-content">
            <text class="custom-title">{{ customer }}</text>
          </view>
        </view>
      </view>

      <view class="padding-20-0">
        <view v-if="displayReminder" class="custom-container" @click="$refs.reminder.open()">
          <view class="custom-icon">
            <uni-icons color="black" size="30" type="notification" class="uni-icon-wrapper" />
          </view>
          <view class="custom-content">
            <text class="custom-title">{{ timeConvert(reservation.remindInMin) }}</text>
            <text class="custom-note">{{ reminderText }}</text>
          </view>
        </view>
      </view>
    </form>

    <uni-popup ref="reminder" type="bottom">
      <view :style="reminderPanelStyle">
        <uni-list>
          <uni-list-item
            v-for="interval in reminderOptions"
            :key="interval"
            :title="timeConvert(interval)"
            @click="selectInterval(interval)"
          />
        </uni-list>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import uniList from '@/components/ui/uni-list/uni-list.vue'
import uniListItem from '@/components/ui/uni-list-item/uni-list-item.vue'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import { useNotificationStore } from '@/stores/notification'
import { useReservationStore } from '@/stores/reservation'
import { useSettingsStore } from '@/stores/settings'
import { timeConvert } from '@/plugins/helpers'
import { NOTIFICATION_TYPES } from '@/constants/notification-types'

const REMINDER_INTERVALS = [0, 30, 60, 120, 180]
const REMINDER_ITEM_HEIGHT = 50

/** Notification kinds that refer to a reservation. */
const RESERVATION_TYPES = [
  NOTIFICATION_TYPES.NewReservationClient,
  NOTIFICATION_TYPES.ChangeReservationClient,
  NOTIFICATION_TYPES.ReminderReservation
]

/** Icon and colour per notification type — same table as notification-list-item. */
const ICONS = {
  [NOTIFICATION_TYPES.DailyReport]: { type: 'smallcircle', color: '#0FB2F2', size: 20 },
  [NOTIFICATION_TYPES.NewReservationClient]: { type: 'calendar', color: '#118C3C', size: 20 },
  [NOTIFICATION_TYPES.CancelReservationClient]: { type: 'closeempty', color: '#dd524d', size: 20 },
  [NOTIFICATION_TYPES.ChangeReservationClient]: { type: 'compose', color: '#F2A007', size: 20 },
  [NOTIFICATION_TYPES.ReminderReservation]: { type: 'notification', color: '#0FB2F2', size: 20 }
}

const FALLBACK_ICON = { type: 'empty', color: '#dd524d', size: 20 }

/**
 * Ported from vegetable.mobile.vue/pages/settings/notification/edit.nvue.
 *
 * A single notification: its text, and for reservation notifications shortcuts
 * into the booking and the customer, plus a reminder picker that writes back to
 * the reservation.
 *
 * Changes:
 *  - `displayReminder` was a computed that **narrowed `reminderOptions` in place**
 *    and decremented `calculateHeight` each time it ran. Because it filtered the
 *    same array it read, repeated evaluation kept shrinking the list — options
 *    disappeared as the page re-rendered. It is pure now: `reminderOptions`
 *    derives from the reservation start time and the panel height derives from
 *    that.
 *  - the five-branch icon `if/else` chain → a lookup table
 *  - the duplicated 14-entry `notificationTypes` map → `@/constants/notification-types`
 *  - `uni.$off('reservation:updated')` removed every listener on that channel;
 *    it now removes only this page's handler
 *  - `navText` was a computed returning `''`; the nav bar takes a literal
 *  - `smsTest()` (a hardcoded phone number behind a commented-out button),
 *    `displayConfirmation`, `moment()` and the `errorNotification` import were
 *    all unused; dropped
 *  - `<div>` → `<view>`; the two `v-if="isReservationNotification"` blocks share
 *    one wrapper
 */
export default {
  components: { uniNavBar, uniIcons, uniList, uniListItem, uniPopup },
  data() {
    return {
      notification: {},
      reservation: { remindInMin: 0 },
      reminderChanged: false,
      keyboardHeight: 0
    }
  },
  computed: {
    ...mapState(useNotificationStore, ['getNotificationById']),
    ...mapState(useSettingsStore, ['language']),

    notificationIcon() {
      return ICONS[this.notification.notificationType] || FALLBACK_ICON
    },

    isReservationNotification() {
      return RESERVATION_TYPES.includes(this.notification.notificationType)
    },

    formatDate() {
      moment.locale(this.language)
      const start = moment.utc(this.reservation.startTime).local().format('ddd, D MMM kk:mm')
      const end = moment.utc(this.reservation.endTime).local().format('kk:mm')
      return `${start} - ${end}`
    },

    services() {
      return (this.reservation.reservationServices || [])
        .map((item) => item.service?.title)
        .filter(Boolean)
        .join(', ')
    },

    customer() {
      const customer = this.reservation.customer
      if (!customer) return ''
      return [customer.firstName, customer.lastName].filter(Boolean).join(' ')
    },

    reminderText() {
      return this.reservation.remindInMin !== 0
        ? this.$t('notifications.reminder-on')
        : this.$t('notifications.reminder-off')
    },

    /** Only offer reminders that would still fire before the booking starts. */
    reminderOptions() {
      if (!this.reservation.startTime) return REMINDER_INTERVALS
      const minutesAway = moment.utc(this.reservation.startTime).diff(moment.utc(), 'minutes')
      return REMINDER_INTERVALS.filter((interval) => minutesAway > interval)
    },

    displayReminder() {
      return this.reminderOptions.length > 1 && this.isReservationNotification
    },

    reminderPanelStyle() {
      return {
        transitionProperty: 'height',
        height: `${this.reminderOptions.length * REMINDER_ITEM_HEIGHT + this.keyboardHeight}px`,
        transitionDuration: '100ms'
      }
    }
  },
  onLoad(option) {
    this.onReservationUpdated = () => this.init(option.id)
    uni.$on('reservation:updated', this.onReservationUpdated)
    this.init(option.id)
  },
  onUnload() {
    uni.$off('reservation:updated', this.onReservationUpdated)
    uni.offKeyboardHeightChange?.(this.keyboardCallback)
  },
  mounted() {
    this.keyboardCallback = (res) => {
      this.keyboardHeight = res.height
    }
    uni.onKeyboardHeightChange(this.keyboardCallback)
  },
  methods: {
    async init(id) {
      this.notification = this.getNotificationById(id) || {}
      if (!this.notification.reservationId) return

      const result = await useReservationStore().fetchReservationById(
        this.notification.reservationId
      )
      if (result) this.reservation = { ...this.reservation, ...result }
    },

    navigateToReservation() {
      uni.navigateTo({ url: `/pages/reservation/edit?id=${this.notification.reservationId}` })
    },

    navigateToCustomer() {
      if (!this.reservation.customer) return
      uni.navigateTo({ url: `/pages/customer/edit?id=${this.reservation.customer.id}` })
    },

    navigateBack() {
      uni.navigateBack()
    },

    save() {
      if (!this.reminderChanged) {
        uni.navigateBack()
        return
      }
      useReservationStore()
        .updateReservation({ reservationId: this.reservation.id, reservation: this.reservation })
        .then(() => uni.navigateBack())
    },

    selectInterval(interval) {
      this.reservation.remindInMin = interval
      this.reminderChanged = true
      this.$refs.reminder.close()
    },

    timeConvert
  }
}
</script>

<style lang="scss" scoped>
.custom-container {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
}

.custom-icon {
  margin-right: 28rpx;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.custom-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  color: #3b4144;
  justify-content: center;
  padding-top: $uni-spacing-col-base;
  padding-bottom: $uni-spacing-col-base;
}

.custom-title {
  font-size: $uni-font-size-xlg;
}

.custom-note {
  margin-top: 6rpx;
  color: $uni-text-color-grey;
  font-size: $uni-font-size-base;
}
</style>
