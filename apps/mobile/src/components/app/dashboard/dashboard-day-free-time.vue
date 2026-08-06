<template>
  <!--
    A bookable gap. Industry marks an empty slot as a dashed outline rather than
    the filled green block the app used — the gap is an absence, so it is drawn
    as one. Gaps outside working hours take the warm tone.
  -->
  <view class="gap-row" @click="$emit('click')">
    <view class="gap-rail">
      <text class="gap-rail__start">{{ startTimeFormat }}</text>
      <text class="gap-rail__len">{{ durationText }}</text>
    </view>

    <view class="gap-block" :class="{ 'gap-block--outside': freeTime.outOfSchedule }">
      <text class="gap-block__add" :class="{ 'gap-block__add--outside': freeTime.outOfSchedule }">
        + {{ $t('common.free-time-add-text') }}
      </text>
      <text class="gap-block__len">{{ startTimeFormat }} – {{ endTimeFormat }}</text>
    </view>
  </view>
</template>

<script>
import moment from 'moment'

/**
 * Ported from
 * vegetable.mobile.vue/components/app/dashboard/dashboard-day-free-time.nvue.
 * A bookable gap in the day; tapping it opens the reservation form prefilled
 * with that start time. Gaps outside working hours render outlined instead of
 * filled. `<div>` → `<view>`, `getApp().globalData.$t` → `$t`.
 */
export default {
  name: 'DashboardDayFreeTime',
  emits: ['click'],
  props: {
    freeTime: {
      type: Object,
      required: true
    }
  },
  computed: {
    durationMinutes() {
      return moment(this.freeTime.endTime).diff(moment(this.freeTime.startTime), 'minutes')
    },
    /** "45m" / "1h" / "1h 20m" — the duration the time column carries. */
    durationText() {
      const minutes = Math.max(0, Math.round(this.durationMinutes))
      if (minutes < 60) return `${minutes}m`
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      return rest ? `${hours}h ${rest}m` : `${hours}h`
    },
    startTimeFormat() {
      return moment(this.freeTime.startTime).format('HH:mm')
    },
    endTimeFormat() {
      return moment(this.freeTime.endTime).format('HH:mm')
    }
  }
}
</script>

<style lang="scss" scoped>
.gap-row {
  flex-direction: row;
  margin-bottom: 13px;
}

.gap-rail {
  width: 42px;
  flex-shrink: 0;
  align-items: flex-end;
  padding-top: 3px;
}

.gap-rail__start {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--color-text);
}

.gap-rail__len {
  font-family: var(--font-body);
  font-size: 10px;
  line-height: 1.5;
  color: var(--color-neutral-600);
}

.gap-block {
  flex: 1;
  min-height: 52px;
  margin-left: 11px;
  padding: 0 12px;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  border-width: 1px;
  border-style: dashed;
  border-color: rgba(89, 128, 166, 0.55);
  background-color: transparent;
}

.gap-block--outside {
  border-color: rgba(168, 121, 31, 0.5);
}

.gap-block__add {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent-700);
}

.gap-block__add--outside {
  color: var(--color-warn);
}

.gap-block__len {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-neutral-600);
}
</style>
