<template>
  <view class="pattern">
    <view class="plate pattern__plate">
      <text class="plate-kicker">{{ $t('general-settings.general-schedule') }}</text>
      <text class="pattern__title">{{ title }}</text>
      <text class="pattern__range">{{ range }}</text>
    </view>

    <view v-for="row in rows" :key="row.key" class="pat-row">
      <text class="pat-row__day" :class="{ 'pat-row__day--off': row.closed }">{{ row.day }}</text>

      <!-- The bar is the day's span laid against a fixed 08:00–21:00 window, so
           a short day reads as a short bar rather than a full one. -->
      <view class="pat-row__track">
        <view v-if="!row.closed" class="pat-row__bar" :style="row.barStyle" />
      </view>

      <text class="pat-row__hours" :class="{ 'pat-row__hours--off': row.closed }">
        {{ row.hours }}
      </text>
    </view>
  </view>
</template>

<script>
import { tArray } from '@/plugins/i18n'
import { SCHEDULE_TYPES } from '@/constants/schedule-types'

/** The window the bars are drawn against, in minutes from midnight. */
const SPAN_START = 8 * 60
const SPAN_END = 21 * 60

/** "09:30:00" → 570 */
function toMinutes(value) {
  if (!value) return null
  const [h, m] = String(value).split(':')
  return Number(h) * 60 + Number(m)
}

/**
 * The week at a glance: one bar per weekday, sized by that day's opening hours.
 *
 * Only weekly schedules get bars. A rotating schedule stores `scheduleOnDays`
 * by position in its on/off cycle, not by weekday — drawing "Monday 09:00–18:00"
 * from that would state something untrue, so those keep the summary row the
 * schedule list already gives them.
 */
export default {
  name: 'WeekPattern',
  props: {
    schedule: { type: Object, default: null }
  },
  computed: {
    isWeekly() {
      return this.schedule?.scheduleType === SCHEDULE_TYPES.Week
    },

    title() {
      return this.$t('general-settings.week-pattern')
    },

    range() {
      const days = this.rows.filter((row) => !row.closed).length
      return this.$t('general-settings.open-days', [days])
    },

    /** Monday-first, matching the API's scheduleOnDays order. */
    rows() {
      const names = tArray('calendar.weekdaysShort')
      const onDays = this.schedule?.scheduleOnDays || []

      return Array.from({ length: 7 }, (_, index) => {
        // `weekdaysShort` is Sunday-first; scheduleOnDays is Monday-first.
        const day = names[(index + 1) % 7]
        const onDay = this.isWeekly ? onDays[index] : null
        const open = onDay?.isEnabled ? toMinutes(onDay.workStartTime) : null
        const close = onDay?.isEnabled ? toMinutes(onDay.workEndTime) : null
        const closed = open === null || close === null

        return {
          key: index,
          day,
          closed,
          hours: closed
            ? this.$t('common.day-off')
            : `${onDay.workStartTime.substring(0, 5)} – ${onDay.workEndTime.substring(0, 5)}`,
          barStyle: closed ? '' : this.barStyle(open, close)
        }
      })
    }
  },
  methods: {
    barStyle(open, close) {
      const span = SPAN_END - SPAN_START
      const left = Math.max(0, ((open - SPAN_START) / span) * 100)
      const width = Math.max(2, Math.min(100 - left, ((close - open) / span) * 100))
      return `left: ${left}%; width: ${width}%;`
    }
  }
}
</script>

<style lang="scss" scoped>
.pattern {
  margin-bottom: 6px;
}

.pattern__plate {
  padding: 14px 16px 16px;
}

.pattern__title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 22px;
  line-height: 1.1;
  margin-top: 6px;
}

.pattern__range {
  font-family: var(--font-body);
  font-size: 11.5px;
  line-height: 1.3;
  opacity: 0.72;
  margin-top: 5px;
}

.pat-row {
  flex-direction: row;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-rule);
}

.pat-row__day {
  width: 42px;
  flex-shrink: 0;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 12.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
}

.pat-row__day--off,
.pat-row__hours--off {
  color: var(--color-neutral-500);
}

.pat-row__track {
  flex: 1;
  height: 9px;
  margin: 0 12px;
  /* --color-text at 7%, pre-computed: color-mix() is uneven on older webviews. */
  background-color: rgba(29, 31, 32, 0.07);
  position: relative;
}

.pat-row__bar {
  position: absolute;
  top: 0;
  bottom: 0;
  background-color: var(--color-accent);
}

.pat-row__hours {
  width: 96px;
  flex-shrink: 0;
  text-align: right;
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--color-neutral-700);
}
</style>
