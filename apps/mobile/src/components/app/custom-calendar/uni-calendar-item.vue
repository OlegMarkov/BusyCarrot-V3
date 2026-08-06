<template>
  <view
    class="uni-calendar-item__weeks-box"
    :class="{
      'uni-calendar-item--disable': weeks.disable,
      'uni-calendar-item--isDay': isSelected && weeks.isDay,
      'uni-calendar-item--checked': isSelected && !weeks.isDay,
      'uni-calendar-item--multiple': weeks.multiple
    }"
    @click="$emit('change', weeks)"
  >
    <view class="uni-calendar-item__weeks-box-item">
      <text v-if="selected && weeks.extraInfo" class="uni-calendar-item__weeks-box-circle" />

      <text
        class="uni-calendar-item__weeks-box-text"
        :class="{
          'uni-calendar-item--isDay-text': weeks.isDay,
          'uni-calendar-item--isDay': isSelected && weeks.isDay,
          'uni-calendar-item--checked': isSelected && !weeks.isDay,
          'uni-calendar-item--multiple': weeks.multiple,
          'uni-calendar-item--disable': weeks.disable,
          'uni-calendar-item--inactive': !schedule
        }"
        >{{ weeks.date }}</text
      >

      <text
        v-if="weeks.extraInfo && weeks.extraInfo.info"
        class="uni-calendar-item__weeks-lunar-text"
        :class="{
          'uni-calendar-item--extra': weeks.extraInfo.info,
          'uni-calendar-item--isDay-text': weeks.isDay,
          'uni-calendar-item--isDay': isSelected && weeks.isDay,
          'uni-calendar-item--checked': isSelected && !weeks.isDay,
          'uni-calendar-item--multiple': weeks.multiple,
          'uni-calendar-item--disable': weeks.disable
        }"
        >{{ weeks.extraInfo.info }}</text
      >

      <!-- One dot per reservation booked that day -->
      <view class="uni-calendar-item__weeks-box-dots-place">
        <view
          v-for="index in dayReservations"
          :key="index"
          class="uni-calendar-item__weeks-box-dot"
        />
      </view>
    </view>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import { useReservationStore } from '@/stores/reservation'
import { useScheduleStore } from '@/stores/schedule'

/**
 * Ported from
 * vegetable.mobile.vue/components/app/custom-calendar/uni-calendar-item.vue.
 *
 * One day cell: the date, a dot per reservation, and dimmed when the employee
 * is not scheduled to work that day.
 *
 * Changes:
 *  - `<div>` → `<view>`
 *  - vuex mapGetters → pinia mapState across two stores
 *  - the repeated `calendar.fullDate === weeks.fullDate` test (written out eight
 *    times) is the `isSelected` computed
 *  - the two lunar-calendar `<text>` blocks are dropped. `lunar` is false for
 *    every use of this calendar, and the branches rendered either an empty
 *    string or hardcoded Chinese lunar month names. `calendar.js` (the 25KB
 *    lunar table behind them) is still imported by util.js for date maths.
 */
export default {
  name: 'UniCalendarItem',
  emits: ['change'],
  props: {
    weeks: {
      type: Object,
      default: () => ({})
    },
    calendar: {
      type: Object,
      default: () => ({})
    },
    selected: {
      type: Array,
      default: () => []
    },
    lunar: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    ...mapState(useReservationStore, ['getReservationsCountByDate']),
    ...mapState(useScheduleStore, ['getScheduleByDate']),
    isSelected() {
      return this.calendar.fullDate === this.weeks.fullDate
    },
    dayReservations() {
      return this.getReservationsCountByDate(this.weeks.fullDate)
    },
    schedule() {
      return this.getScheduleByDate(moment(this.weeks.fullDate))
    }
  }
}
</script>

<style lang="scss" scoped>
.uni-calendar-item__weeks-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.uni-calendar-item__weeks-box-text {
  font-size: $uni-font-size-base;
  color: $uni-text-color;
}

.uni-calendar-item__weeks-lunar-text {
  font-size: $uni-font-size-sm;
  color: $uni-text-color;
}

.uni-calendar-item__weeks-box-item {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100rpx;
  height: 100rpx;
}

.uni-calendar-item__weeks-box-circle {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 8px;
  height: 8px;
  border-radius: 8px;
  background-color: $uni-color-error;
}

.uni-calendar-item__weeks-box-dots-place {
  position: absolute;
  bottom: 8rpx;
  left: 22rpx;
  width: 60rpx;
  height: 22rpx;
  justify-content: center;
  flex-direction: row;
  flex-wrap: wrap;
}

.uni-calendar-item__weeks-box-dot {
  width: 10rpx;
  height: 10rpx;
  margin-left: 2rpx;
  margin-bottom: 2rpx;
  border-radius: 10px;
  background-color: $theme-green;
}

.uni-calendar-item--disable {
  opacity: 0;
  background-color: rgba(249, 249, 249, $uni-opacity-disabled);
  color: $uni-text-color-disable;
}

.uni-calendar-item--inactive {
  opacity: 0.3;
}

.uni-calendar-item--isDay-text {
  color: $theme-blue;
  font-weight: bold;
}

.uni-calendar-item--isDay {
  background-color: $theme-blue;
  opacity: 0.8;
  color: #fff;
  border-radius: 50%;
}

.uni-calendar-item--extra {
  color: $uni-color-error;
  opacity: 0.8;
}

.uni-calendar-item--checked {
  background-color: $theme-blue;
  color: #fff;
  opacity: 0.8;
  border-radius: 50%;
}

.uni-calendar-item--multiple {
  background-color: $uni-color-primary;
  color: #fff;
  opacity: 0.8;
}
</style>
