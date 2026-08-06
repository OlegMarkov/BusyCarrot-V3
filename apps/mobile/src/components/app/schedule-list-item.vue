<template>
  <!--
    A schedule as a blueprint object: the range in condensed over the days it
    covers, with the schedule type carried as an accent tag on the right.
  -->
  <view class="blueprint sch-row" @longpress="longpress" @click="$emit('click')">
    <text class="corner tl" />
    <text class="corner tr" />
    <text class="corner bl" />
    <text class="corner br" />

    <view class="sch-row__main">
      <text class="sch-row__title">{{ title }}</text>
      <text class="sch-row__note">{{ note }}</text>
    </view>

    <view class="tag tag-accent sch-row__tag">
      <text class="sch-row__tag-text">{{ badgeText }}</text>
    </view>

    <uni-popup ref="deletePopup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ $t('common.areyousurefordelete') }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="doDelete">{{ $t('common.delete') }}</text>
          <text class="modal-dialog-button" @click="doCancelDelete">{{ $t('common.cancel') }}</text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import { useScheduleStore } from '@/stores/schedule'
import { useSettingsStore } from '@/stores/settings'
import { SCHEDULE_TYPES } from '@/constants/schedule-types'

/**
 * Ported from vegetable.mobile.vue/components/app/schedule-list-item.vue.
 *
 * One row of the schedules list: the date range, a summary of the pattern, and
 * a type badge.
 *
 * Changes:
 *  - the local `scheduleTypes` copy → `@/constants/schedule-types`
 *  - `:ref="'deleteSchedulePopup_' + schedule.id"` → a static ref
 *  - the `note` computed for a Custom schedule had an unreachable `return` after
 *    an if/else that always returns; dropped
 *  - the weekday summary used a `forEach` with a manually bound `this` and a
 *    hand-rolled separator; it is a `filter().map().join()`
 *  - `badgeType` was a computed returning the constant `'default'`; inlined
 *  - the popup-options imports were registered but never rendered; dropped
 *  - deleting passes the schedule's `employeeId` through, so the refetch reloads
 *    the right employee's schedules (see the note on `deleteSchedule` in
 *    stores/schedule.js — the original could never pass it)
 */
export default {
  name: 'ScheduleListItem',
  components: { uniPopup },
  emits: ['click'],
  props: {
    schedule: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState(useSettingsStore, ['language']),

    title() {
      const { scheduleStartDate, scheduleEndDate } = this.schedule
      if (scheduleStartDate === scheduleEndDate) return this.formatDate(scheduleStartDate)
      return `${this.formatDate(scheduleStartDate)}-${this.formatDate(scheduleEndDate)}`
    },

    note() {
      const { scheduleType, scheduleOnDays, onDays, offDays } = this.schedule

      if (scheduleType === SCHEDULE_TYPES.Week) {
        return (scheduleOnDays || [])
          .filter((day) => day.isEnabled)
          .map((day) => this.$t(`general-settings.day-short-${day.sequence}`))
          .join(', ')
      }

      if (scheduleType === SCHEDULE_TYPES.Switch) {
        return (
          onDays +
          this.$t('general-settings.schedule-working') +
          offDays +
          this.$t('general-settings.schedule-off-days')
        )
      }

      if (scheduleType === SCHEDULE_TYPES.Custom) {
        if (onDays === 0) return this.$t('general-settings.mark-as-off-day')
        const day = scheduleOnDays?.[0]
        if (!day) return ''
        return `${this.getTime(day.workStartTime)} - ${this.getTime(day.workEndTime)}`
      }

      return ''
    },

    badgeText() {
      return this.$t(`general-settings.schedule-type-${this.schedule.scheduleType}`)
    }
  },
  methods: {
    longpress() {
      uni.showActionSheet({
        itemList: [this.$t('common.delete')],
        success: (res) => {
          if (res.tapIndex === 0) this.deleteSchedule()
        }
      })
    },

    deleteSchedule() {
      this.$refs.deletePopup.open()
    },

    async doDelete() {
      if (!this.schedule?.id) return
      await useScheduleStore().deleteSchedule({
        scheduleId: this.schedule.id,
        employeeId: this.schedule.employeeId
      })
      this.$refs.deletePopup.close()
    },

    doCancelDelete() {
      this.$refs.deletePopup.close()
    },

    /** The API stores working hours as a timespan; show them as HH:mm. */
    getTime(timespan) {
      return moment().startOf('day').add(moment.duration(timespan)).format('HH:mm')
    },

    formatDate(date) {
      moment.locale(this.language)
      return moment(date).format('ll')
    }
  }
}
</script>

<style lang="scss" scoped>
.sch-row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: 0 6px 14px;
  padding: 11px 12px;
}

.sch-row__main {
  flex: 1;
  overflow: hidden;
}

.sch-row__title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
  color: var(--color-text);
}

.sch-row__note {
  font-family: var(--font-body);
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-neutral-600);
}

.sch-row__tag {
  margin-left: 10px;
}

.sch-row__tag-text {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-accent-800);
}
</style>
