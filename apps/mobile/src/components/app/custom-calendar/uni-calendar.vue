<template>
  <view class="nv uni-calendar">
    <view class="uni-calendar__content">
      <view class="uni-calendar__box">
        <view v-if="showMonth" class="uni-calendar__box-bg">
          <text class="uni-calendar__box-bg-text">{{ nowDate.month }}</text>
        </view>

        <view class="uni-calendar__weeks">
          <view v-for="(label, index) in weekdayLabels" :key="index" class="uni-calendar__weeks-day">
            <text class="uni-calendar__weeks-day-text">{{ label }}</text>
          </view>
        </view>

        <view v-for="(week, weekIndex) in weeks" :key="weekIndex" class="uni-calendar__weeks">
          <view v-for="(day, dayIndex) in week" :key="dayIndex" class="uni-calendar__weeks-item">
            <uni-calendar-item
              :weeks="day"
              :calendar="calendar"
              :selected="selected"
              :lunar="lunar"
              @change="choiceDate"
            />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import Calendar from './util.js'
import uniCalendarItem from './uni-calendar-item.vue'
import { tArray } from '@/plugins/i18n'

/**
 * Ported from
 * vegetable.mobile.vue/components/app/custom-calendar/uni-calendar.vue — the
 * project's fork of uni-ui's calendar, used as the month grid inside
 * components/app/swipe-calendar.vue.
 *
 * Changes:
 *  - the popup mode is removed. `insert` defaulted to true and swipe-calendar,
 *    the only consumer, never set it false, so the mask, the fixed-position
 *    sheet, `open()` / `close()` / `confirm()` and their styles were unreachable.
 *    That also removes the hardcoded Chinese 取消 / 确定 / 回到今天 buttons the
 *    upstream component shipped with.
 *  - the seven hand-written weekday cells became a v-for
 *  - `getApp().globalData.$t` → `$t`
 *
 * `pre()` / `next()` / `backtoday()` are kept: swipe-calendar drives month
 * changes through `date`, but these remain the component's public API.
 */
export default {
  name: 'CustomUniCalendar',
  components: { uniCalendarItem },
  emits: ['change', 'monthSwitch', 'height'],
  props: {
    date: { type: String, default: '' },
    selected: { type: Array, default: () => [] },
    lunar: { type: Boolean, default: false },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    range: { type: Boolean, default: false },
    showMonth: { type: Boolean, default: true },
    chosenDate: { type: String, default: '' }
  },
  data() {
    return {
      weeks: [],
      calendar: {},
      nowDate: ''
    }
  },
  computed: {
    weekdayLabels() {
      // `$t` would hand back the key itself here — see tArray in plugins/i18n.js.
      return tArray('calendar.weekdaysMin')
    }
  },
  watch: {
    selected(value) {
      this.cale.setSelectInfo(this.nowDate.fullDate, value)
      this.weeks = this.cale.weeks
    },
    date(value) {
      this.setDate(value)
    },
    chosenDate(value) {
      if (!value) return
      this.calendar = this.cale.getInfo(value)
      this.change()
    }
  },
  created() {
    this.cale = new Calendar({
      date: this.date,
      selected: this.selected,
      startDate: this.startDate,
      endDate: this.endDate,
      range: this.range
    })
    this.init(this.cale.date.fullDate)
  },
  methods: {
    init(date) {
      this.weeks = this.cale.weeks
      this.nowDate = this.calendar = this.cale.getInfo(date)
    },

    change() {
      const { year, month, date, fullDate, lunar, extraInfo } = this.calendar
      this.$emit('change', {
        range: this.cale.multipleStatus,
        year,
        month,
        date,
        fulldate: fullDate,
        lunar,
        extraInfo: extraInfo || {}
      })
    },

    monthSwitch() {
      const { year, month } = this.nowDate
      this.$emit('monthSwitch', { year, month: Number(month) })
    },

    choiceDate(day) {
      if (day.disable) return
      this.calendar = day
      this.cale.setMultiple(this.calendar.fullDate)
      this.weeks = this.cale.weeks
      this.change()
    },

    backtoday() {
      this.cale.setDate(this.date)
      this.weeks = this.cale.weeks
      this.nowDate = this.calendar = this.cale.getInfo(this.date)
      this.change()
    },

    pre() {
      this.setDate(this.cale.getDate(this.nowDate.fullDate, -1, 'month').fullDate)
      this.monthSwitch()
    },

    next() {
      this.setDate(this.cale.getDate(this.nowDate.fullDate, +1, 'month').fullDate)
      this.monthSwitch()
    },

    setDate(date) {
      this.cale.setDate(date)
      this.weeks = this.cale.weeks
      this.nowDate = this.cale.getInfo(date)
      // A month that spills into a sixth row needs the taller strip.
      const spillsToSixthRow = this.weeks[5]?.some((day) => day.disable === false)
      this.$emit('height', { height: spillsToSixthRow ? 700 : 600 })
    }
  }
}
</script>

<style lang="scss" scoped>
.uni-calendar {
  display: flex;
  flex-direction: column;
}

.uni-calendar__content {
  background-color: #fff;
}

.uni-calendar__weeks {
  position: relative;
  display: flex;
  flex-direction: row;
}

.uni-calendar__weeks-item {
  flex: 1;
}

.uni-calendar__weeks-day {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 45px;
  border-bottom-color: #f5f5f5;
  border-bottom-style: solid;
  border-bottom-width: 1px;
}

.uni-calendar__weeks-day-text {
  font-size: 14px;
}

.uni-calendar__box {
  position: relative;
}

.uni-calendar__box-bg {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.uni-calendar__box-bg-text {
  font-size: 200px;
  font-weight: bold;
  color: $uni-text-color-grey;
  opacity: 0.1;
  text-align: center;
  line-height: 1;
}
</style>
