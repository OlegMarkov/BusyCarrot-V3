<template>
  <!--
    A feed entry: the kind of event as a framed icon square, the headline in
    condensed over its detail, and the time reading off the right edge.
  -->
  <view class="feed-row" @click="$emit('click')">
    <view class="feed-row__icon">
      <uni-icons :type="notificationIcon.type" :size="15" :color="notificationIcon.color" />
    </view>

    <view class="feed-row__main">
      <text class="feed-row__title">{{ title }}</text>
      <text v-if="note" class="feed-row__body">{{ note }}</text>
    </view>

    <text class="feed-row__time">{{ timeText }}</text>
  </view>
</template>

<script>
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import moment from 'moment'
import { mapState } from 'pinia'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import { useNotificationStore } from '@/stores/notification'
import { useSettingsStore } from '@/stores/settings'
import { NOTIFICATION_TYPES } from '@/constants/notification-types'

/** Icon and colour per notification type; anything unlisted falls through. */
const ICONS = {
  [NOTIFICATION_TYPES.DailyReport]: { type: 'smallcircle', color: '#0FB2F2', size: 20 },
  [NOTIFICATION_TYPES.NewReservationClient]: { type: 'calendar', color: '#118C3C', size: 20 },
  [NOTIFICATION_TYPES.CancelReservationClient]: { type: 'closeempty', color: '#dd524d', size: 20 },
  [NOTIFICATION_TYPES.ChangeReservationClient]: { type: 'compose', color: '#F2A007', size: 20 },
  [NOTIFICATION_TYPES.ReminderReservation]: { type: 'notification', color: '#0FB2F2', size: 20 }
}

const FALLBACK_ICON = { type: 'empty', color: '#dd524d', size: 20 }

/**
 * Ported from vegetable.mobile.vue/components/app/notification-list-item.vue.
 *
 * Changes:
 *  - the 14-entry `notificationTypes` map was declared in `data` here *and* in
 *    the notifications page; it is now `@/constants/notification-types`
 *  - the five-branch `if/else` chain for the icon is a lookup table
 *  - `badgeType` / `badgeText` were computed but never used: the template passes
 *    `:showBadge="false"`, so no badge is ever rendered. Dropped.
 *  - `getTime` and `formatDate` were never called; dropped
 *  - `:ref="'deleteNotificationPopup_' + notification.id"` → a static ref
 *  - the popup-options imports were registered but never rendered; dropped
 */
export default {
  name: 'NotificationListItem',
  components: { uniPopup, uniIcons },
  emits: ['click'],
  props: {
    notification: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState(useSettingsStore, ['language']),
    /*
     * The row used to fold the headline and its detail into one string joined
     * by a newline, because the shared list item only had a title slot. The
     * feed layout gives them separate lines, so they are separate values now,
     * and the time is its own field rather than masquerading as the note.
     */
    title() {
      return this.notification.title
    },
    note() {
      return this.notification.description
    },
    timeText() {
      moment.locale(this.language)
      return moment(this.notification.notificationDateUTC).format('HH:mm')
    },
    extraNote() {
      return this.notification.note
    },
    showExtraNote() {
      return this.notification.notificationType === NOTIFICATION_TYPES.ChangeReservationClient
    },
    notificationIcon() {
      return ICONS[this.notification.notificationType] || FALLBACK_ICON
    }
  },
  methods: {
    longpress() {
      uni.showActionSheet({
        itemList: [this.$t('common.delete')],
        success: (res) => {
          if (res.tapIndex === 0) this.deleteNotification()
        }
      })
    },

    deleteNotification() {
      this.$refs.deletePopup.open()
    },

    async doDelete() {
      if (!this.notification?.id) return
      await useNotificationStore().deleteNotification(this.notification.id)
      this.$refs.deletePopup.close()
    },

    doCancelDelete() {
      this.$refs.deletePopup.close()
    }
  }
}
</script>

<style lang="scss" scoped>
.feed-row {
  flex-direction: row;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-rule-soft);
}

/* The event kind is framed rather than tinted — a wireframe object like
   everything else on the board. */
.feed-row__icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
  margin-right: 13px;
}

.feed-row__main {
  flex: 1;
  overflow: hidden;
}

.feed-row__title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 13.5px;
  line-height: 1.25;
  letter-spacing: 0.02em;
  color: var(--color-text);
}

.feed-row__body {
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-neutral-700);
  margin-top: 2px;
}

.feed-row__time {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-neutral-600);
  margin-left: 10px;
}
</style>
