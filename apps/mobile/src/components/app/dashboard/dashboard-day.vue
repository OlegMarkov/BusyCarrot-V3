<template>
  <view class="nv flex flex-column" style="align-content: stretch">
    <!--
      The accent-900 plate: the one place Industry allows a full colour field —
      steel as ground with type reversed to paper. It carries the day's identity
      on the left and the money on the right, replacing the separate white
      takings card and grey day header the app had before.
    -->
    <view class="plate day-plate">
      <view class="day-plate__left">
        <text class="plate-kicker">{{ weekDayLong }}</text>
        <text class="plate-figure day-plate__date">{{ bigDate }}</text>
        <text class="day-plate__hours">{{ subTitle }}</text>
      </view>
      <view class="day-plate__right" @click="scheduleTimeClick">
        <text class="plate-kicker">{{ $t('common.today') }}</text>
        <text class="plate-figure day-plate__total">{{ totalCostDay }}</text>
        <text class="day-plate__month">{{ $t('common.month') }} {{ totalCostMonth }}</text>
      </view>
    </view>

    <is-busy-indicator v-if="isBusy" :loading="isBusy" />
    <scroll-view v-else scroll-y class="flex flex-column overflow-hidden" :show-scrollbar="false">
      <view class="day-elements">
        <view v-for="(element, index) in dayElements" :key="index">
          <dashboard-day-reservation v-if="element.id" :reservation="element" />
          <dashboard-day-free-time
            v-else
            :free-time="element"
            @click="addReservation(element.startTime)"
          />
        </view>
      </view>

      <view v-if="!ifSchedule" class="day-closed">
        <text class="day-closed__text">{{ $t('common.day-off') }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import dashboardDayReservation from './dashboard-day-reservation.vue'
import dashboardDayFreeTime from './dashboard-day-free-time.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import isBusyIndicator from '@/components/app/is-busy-indicator.vue'
import { useAppStore } from '@/stores/app'
import { useScheduleStore } from '@/stores/schedule'
import { useReservationStore } from '@/stores/reservation'
import { useOwnerStore } from '@/stores/owner'
import { format } from '@/plugins/helpers'
import { tArray } from '@/plugins/i18n'

const SCHEDULE_TYPE_CUSTOM = 2

/**
 * Ported from vegetable.mobile.vue/components/app/dashboard/dashboard-day.nvue.
 *
 * One day of the dashboard: takings, the day header with its working hours, and
 * the day's bookings interleaved with the free gaps between them.
 *
 * Changes:
 *  - `<list>`/`<cell>` → `<scroll-view>`/`<view>`; `<div>` → `<view>`
 *  - `_.sortBy` → `Array.prototype.sort`
 *  - vuex mapGetters spanning three modules → pinia mapState per store
 *  - the `onappear` / `disappear` / `moment` / `isIOS` methods and the
 *    popup-options, uni-list and non-cell-list-item imports were unused; dropped
 *  - `scheduleTimeClick` used a chain of `if` branches that each called
 *    `getSpecialScheduleIdByDate` again; it is computed once here
 */
export default {
  name: 'DashboardDay',
  components: {
    dashboardDayReservation,
    dashboardDayFreeTime,
    uniIcons,
    isBusyIndicator
  },
  props: {
    date: {
      type: String,
      required: true
    }
  },
  computed: {
    ...mapState(useAppStore, ['today', 'isBusy']),
    ...mapState(useScheduleStore, [
      'getScheduleByDate',
      'getSpecialScheduleIdByDate',
      'getScheduleById',
      'getRegularSchedule'
    ]),
    ...mapState(useOwnerStore, ['owner']),
    ...mapState(useReservationStore, [
      'getReservationsByDate',
      'getFreeTimeByDate',
      'getReservationsTotalCostByDate',
      'getReservationsTotalCostByMonth'
    ]),

    /* — the accent-900 plate — */
    currency() {
      return this.owner?.currency?.symbol || ''
    },
    /** The plate spells the weekday out rather than abbreviating it. */
    weekDayLong() {
      return tArray('calendar.weekdays')[this.mDate.day()]
    },
    /** '02 AUG' — the day number at 38px with the month abbreviated beside it. */
    bigDate() {
      return `${this.mDate.format('DD')} ${tArray('calendar.monthsShort')[this.mDate.month()]}`
    },
    totalCostDay() {
      // v9 list interpolation — see the note in plugins/i18n.js.
      return this.$t('common.price-format', [
        this.currency,
        this.getReservationsTotalCostByDate(this.date)
      ])
    },
    totalCostMonth() {
      return this.$t('common.price-format', [
        this.currency,
        this.getReservationsTotalCostByMonth(this.mDate.month())
      ])
    },

    mDate() {
      return moment(this.date)
    },
    title() {
      return `${this.weekDay} ${this.mDate.format('D')} ${this.monthName}`
    },
    subTitle() {
      return this.scheduleText
    },
    type() {
      if (this.isCurrentDate) return 'today'
      return this.ifSchedule ? 'working-day' : 'day-off'
    },
    monthName() {
      return tArray('calendar.months')[this.mDate.month()]
    },
    weekDay() {
      return tArray('calendar.weekdaysShort')[this.mDate.day()]
    },
    scheduleText() {
      if (!this.ifSchedule) return this.$t('common.day-off')
      return `${this.schedule.workStartTime.substring(0, 5)}-${this.schedule.workEndTime.substring(0, 5)}`
    },
    ifSchedule() {
      return Boolean(this.schedule)
    },
    schedule() {
      return this.getScheduleByDate(this.mDate.clone().startOf('day'))
    },
    regularSchedule() {
      return this.getRegularSchedule
    },
    dayReservations() {
      return this.getReservationsByDate(this.date)
    },
    isCurrentDate() {
      return this.today.isSame(this.mDate, 'day')
    },
    freeTimes() {
      return this.getFreeTimeByDate(this.date)
    },
    /** Bookings and gaps in one chronological list. */
    dayElements() {
      return [...this.freeTimes, ...this.dayReservations].sort((a, b) =>
        a.startTime < b.startTime ? -1 : 1
      )
    }
  },
  methods: {
    addReservation(time) {
      const timeParam = time ? `&time=${moment(time).format('HH:mm')}` : ''
      uni.navigateTo({ url: `/pages/reservation/edit?date=${this.date}${timeParam}` })
    },

    scheduleTimeClick() {
      const specialId = this.getSpecialScheduleIdByDate(this.mDate.clone().startOf('day'))
      const ownScheduleId = this.schedule?.scheduleId

      // A custom (one-off) schedule already covers this day — edit it directly.
      if (ownScheduleId && this.getScheduleById(ownScheduleId)?.scheduleType === SCHEDULE_TYPE_CUSTOM) {
        uni.navigateTo({ url: `/pages/settings/schedule/edit?id=${ownScheduleId}` })
        return
      }

      if (specialId) {
        uni.navigateTo({ url: `/pages/settings/schedule/edit?id=${specialId}` })
        return
      }

      // A regular schedule applies: ask whether to override this day or edit it.
      if (this.regularSchedule) {
        uni.showActionSheet({
          itemList: [
            this.$t('general-settings.schedule-popup-message-add'),
            this.$t('general-settings.schedule-popup-message-edit')
          ],
          success: (res) => {
            if (res.tapIndex === 0) this.newSchedule()
            else if (res.tapIndex === 1) this.editSchedule()
          }
        })
        return
      }

      this.newSchedule()
    },

    newSchedule() {
      const date = this.mDate.format('YYYY-MM-DD')
      if (!this.schedule) {
        uni.navigateTo({ url: `/pages/settings/schedule/edit?date=${date}` })
        return
      }
      const params = [
        `date=${date}`,
        `workStartTime=${this.schedule.workStartTime.substring(0, 5)}`,
        `workEndTime=${this.schedule.workEndTime.substring(0, 5)}`
      ].join('&')
      uni.navigateTo({ url: `/pages/settings/schedule/edit?${params}` })
    },

    editSchedule() {
      const id = this.schedule ? this.schedule.scheduleId : this.regularSchedule.id
      uni.navigateTo({ url: `/pages/settings/schedule/edit?id=${id}` })
    }
  }
}
</script>

<style lang="scss" scoped>
.day-plate {
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  padding: 15px 16px 17px;
}

.day-plate__left {
  flex: 1;
}

.day-plate__right {
  align-items: flex-end;
}

.day-plate__date {
  font-size: 38px;
  margin-top: 5px;
  letter-spacing: 0.01em;
}

.day-plate__hours {
  font-family: var(--font-body);
  font-size: 11.5px;
  line-height: 1;
  opacity: 0.72;
  margin-top: 8px;
}

.day-plate__total {
  font-size: 27px;
  margin-top: 5px;
}

.day-plate__month {
  font-family: var(--font-body);
  font-size: 10.5px;
  line-height: 1;
  opacity: 0.62;
  margin-top: 9px;
}

.day-elements {
  padding: 16px 14px 22px;
}

.day-closed {
  padding: 34px 0;
  align-items: center;
}

.day-closed__text {
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}
</style>
