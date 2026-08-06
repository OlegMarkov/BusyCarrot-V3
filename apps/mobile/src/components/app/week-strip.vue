<template>
  <view class="week-strip">
    <view
      v-for="day in week"
      :key="day.key"
      class="week-strip__cell"
      :class="{ 'week-strip__cell--active': day.isActive }"
      @click="pick(day)"
    >
      <text class="week-strip__dow" :class="{ 'week-strip__on-accent': day.isActive }">
        {{ day.dow }}
      </text>
      <text class="week-strip__num" :class="{ 'week-strip__on-accent': day.isActive }">
        {{ day.num }}
      </text>
      <!--
        A 4px square, not a dot — the system has no circles. Present when the
        shop is open that day, so a closed day reads as a gap in the row.
      -->
      <view
        class="week-strip__mark"
        :class="{
          'week-strip__mark--hidden': !day.isOpen,
          'week-strip__mark--on-accent': day.isActive
        }"
      />
    </view>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import { useAppStore } from '@/stores/app'
import { useScheduleStore } from '@/stores/schedule'
import { publishDate, subscribeDate } from '@/plugins/date-bus'
import { tArray } from '@/plugins/i18n'

const SOURCE = 'week-strip'

/**
 * The seven days around the active one, replacing the expandable month
 * calendar the app used to carry in its nav bar.
 *
 * This is the redesign's model of the dashboard: a day at a time, with its week
 * for context. It is a deliberate trade — the month grid could jump to any date
 * and showed a dot per booking; this shows one week and marks which days the
 * shop is open. Paging happens by swiping the day list, which moves the window
 * with it, so distant dates are reached by scrolling rather than by jumping.
 *
 * The window starts on the locale's own first day of the week, so it reads
 * Monday-first in Russian and Sunday-first in English rather than being fixed
 * to one of them.
 */
export default {
  name: 'WeekStrip',
  data() {
    return {
      unsubscribe: null
    }
  },
  computed: {
    ...mapState(useAppStore, ['activeDay', 'today']),
    ...mapState(useScheduleStore, ['getScheduleByDate']),

    firstDayOfWeek() {
      return moment.localeData().firstDayOfWeek()
    },

    week() {
      const active = moment(this.activeDay)
      const offset = (active.day() - this.firstDayOfWeek + 7) % 7
      const start = active.clone().subtract(offset, 'days')
      const weekdays = tArray('calendar.weekdaysShort')

      return Array.from({ length: 7 }, (_, index) => {
        const date = start.clone().add(index, 'days')
        return {
          key: date.format('YYYY-MM-DD'),
          dow: weekdays[date.day()],
          num: date.format('D'),
          isActive: date.isSame(active, 'day'),
          isOpen: Boolean(this.getScheduleByDate(date.clone().startOf('day')))
        }
      })
    }
  },

  mounted() {
    // Follow the day list when it is swiped, so the strip and the day agree.
    this.unsubscribe = subscribeDate(SOURCE, (date) => {
      useAppStore().setActiveDay(moment(date).format('YYYY-MM-DD'))
    })
  },

  beforeUnmount() {
    this.unsubscribe?.()
  },

  methods: {
    pick(day) {
      if (day.isActive) return
      useAppStore().setActiveDay(day.key)
      publishDate(day.key, SOURCE)
    }
  }
}
</script>

<style lang="scss" scoped>
.week-strip {
  flex-direction: row;
  background-color: var(--color-bg);
  border-bottom: 1px solid var(--color-divider);
}

.week-strip__cell {
  flex: 1;
  align-items: center;
  padding: 9px 0 10px;
  border-right: 1px solid var(--color-divider);
}

.week-strip__cell--active {
  background-color: var(--color-accent);
}

.week-strip__dow {
  font-family: var(--font-body);
  font-size: 9px;
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text);
  opacity: 0.62;
}

.week-strip__num {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 17px;
  line-height: 1;
  color: var(--color-text);
  margin-top: 3px;
}

.week-strip__on-accent {
  color: var(--color-bg);
}

.week-strip__mark {
  width: 4px;
  height: 4px;
  background-color: var(--color-accent);
  margin-top: 3px;
}

.week-strip__mark--on-accent {
  background-color: rgba(242, 242, 243, 0.7);
}

/* Kept in flow rather than removed, so the row's cells stay the same height. */
.week-strip__mark--hidden {
  background-color: transparent;
}
</style>
