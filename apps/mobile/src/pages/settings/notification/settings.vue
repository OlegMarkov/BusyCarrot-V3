<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar
      left-icon="arrowleft"
      right-icon="checkmarkempty"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.notifications')"
      @clickLeft="navigateBack"
      @clickRight="save"
    />

    <form v-if="userDb" class="form">
      <view class="form-item">
        <text class="input-label">{{ $t('general-settings.turn-on-notifications') }}</text>
        <switch
          color="#118C3C"
          :checked="userDb.allowNotifications"
          @change="userDb.allowNotifications = !userDb.allowNotifications"
        />
      </view>

      <view class="form-item">
        <picker
          mode="time"
          :value="dailyNotificationTime"
          :disabled="!userDb.allowNotifications"
          @change="bindDailyNotificationTimeChange"
        >
          <text class="input-label">{{ $t('general-settings.notification-start-time') }}</text>
          <text
            :class="['uni-input', 'input-text', !userDb.allowNotifications ? 'text-disabled' : '']"
          >
            {{ dailyNotificationTime }}
          </text>
          <text class="input-desc">{{ $t('general-settings.notification-description') }}</text>
        </picker>
      </view>
    </form>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import { useUserStore } from '@/stores/user'

/**
 * Ported from vegetable.mobile.vue/pages/settings/notification/settings.nvue.
 *
 * Per-user notification preferences: a master switch and the time of the daily
 * summary. Edits `userDb` in place and saves on the tick.
 *
 * Changes: the `computed` block was declared twice (the second silently replaced
 * the first, which was empty); `backup` was assigned in `onLoad` without being
 * declared in `data`; the `uniList` / `uniListItem` imports were never rendered;
 * a stray `console.log(this.userDb)` in `save()` is gone.
 */
export default {
  components: { uniNavBar },
  data() {
    return {
      backup: {}
    }
  },
  computed: {
    ...mapState(useUserStore, ['userDb']),
    /** The API stores this as a timespan; the picker wants HH:mm. */
    dailyNotificationTime() {
      return moment()
        .startOf('day')
        .add(moment.duration(this.userDb?.dailyNotificationTime))
        .format('HH:mm')
    }
  },
  onLoad() {
    this.backup = { ...this.userDb }
  },
  methods: {
    navigateBack() {
      if (JSON.stringify(this.backup) !== JSON.stringify(this.userDb)) {
        useUserStore().fetchUser()
      }
      uni.navigateBack()
    },

    save() {
      useUserStore().updateUser(this.userDb)
      uni.navigateBack()
    },

    bindDailyNotificationTimeChange(event) {
      this.userDb.dailyNotificationTime = event.detail.value
    }
  }
}
</script>
