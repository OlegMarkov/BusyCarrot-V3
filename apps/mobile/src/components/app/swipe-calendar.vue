<template>
  <view class="nv uni-margin-wrap">
    <swiper
      ref="swiper"
      circular
      :style="swiperStyle"
      :current="activeCalendar.id"
      @change="swiperChange"
    >
      <swiper-item v-for="item in calendars" :key="item.id" :item-id="String(item.id)">
        <custom-uni-calendar
          :date="item.currentDate"
          :selected="item.selected"
          :chosen-date="item.chosenDate"
          :show-month="false"
          @change="dateSelected"
          @height="changeHeight($event, item.id)"
        />
      </swiper-item>
    </swiper>
  </view>
</template>

<script>
import moment from 'moment'
import customUniCalendar from '@/components/app/custom-calendar/uni-calendar.vue'
import { publishDate, subscribeDate } from '@/plugins/date-bus'

const SLIDE_MS = 230
const SLIDE_PX = 350

/**
 * Ported from vegetable.mobile.vue/components/app/swipe-calendar.vue.
 *
 * Three month grids on a circular swiper, rotated so there is always a month
 * either side of the visible one. Only publishes a date change when the strip is
 * expanded (or the user tapped "back to today"), so scrolling months while it is
 * collapsed does not move the dashboard.
 *
 * Changes:
 *  - `BroadcastChannel('dateBC')` → plugins/date-bus.js. Because uni's event bus
 *    echoes to the sender (BroadcastChannel did not), this subscribes with a
 *    `source` tag so its own posts are skipped, and unsubscribes on unmount.
 *  - `uni.requireNativePlugin('animation')`, a three-stage native transition
 *    (slide out, jump to the far side, slide back), is now a CSS transform on
 *    the swiper with the same 230ms timings.
 *  - `<div>` → `<view>`; the `:key`/`:item-id` are strings, as uni-app expects.
 *  - `activeCalendar`'s setter is now `setActiveCalendar()`. A computed setter
 *    that took a different type than its getter returned (an id in, an object
 *    out) is legal but confusing, and Vue 3 evaluates it more eagerly.
 */
export default {
  name: 'SwipeCalendar',
  components: { customUniCalendar },
  emits: ['height'],
  props: {
    isExpanded: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      backToTodayClicked: false,
      slideOffset: 0,
      slideDuration: 0,
      calendars: [0, 1, 2].map((id) => ({
        id,
        isActive: id === 0,
        currentDate: moment().format('YYYY-MM-DD'),
        selected: [],
        chosenDate: '',
        height: 700
      }))
    }
  },
  computed: {
    activeCalendar() {
      return this.calendars.find((item) => item.isActive) || this.calendars[0]
    },
    nextCalendar() {
      return this.calendars[this.getNextId(this.activeCalendar.id)]
    },
    prevCalendar() {
      return this.calendars[this.getPrevId(this.activeCalendar.id)]
    },
    swiperStyle() {
      return {
        height: `${this.activeCalendar.height}px`,
        transform: `translateX(${this.slideOffset}px)`,
        transitionProperty: 'transform',
        transitionDuration: `${this.slideDuration}ms`,
        transitionTimingFunction: 'ease'
      }
    }
  },
  mounted() {
    this.unsubscribe = subscribeDate('swipe-calendar', (date) => this.initCalendar(date))
  },
  unmounted() {
    this.unsubscribe?.()
    clearTimeout(this.slideTimer)
  },
  methods: {
    initCalendar(date) {
      this.animateSwipe(date)

      const base = date ? moment(date) : moment()
      this.nextCalendar.currentDate = base.clone().add(1, 'M').startOf('month').format('YYYY-MM-DD')
      this.prevCalendar.currentDate = base.clone().add(-1, 'M').startOf('month').format('YYYY-MM-DD')
      this.activeCalendar.currentDate = base.format('YYYY-MM-DD')
      this.activeCalendar.chosenDate = base.format('YYYY-MM-DD')

      this.$emit('height', { height: this.activeCalendar.height })
    },

    dateSelected(event) {
      this.activeCalendar.chosenDate = ''
      if (this.isExpanded || this.backToTodayClicked) {
        this.backToTodayClicked = false
        publishDate(event.fulldate, 'swipe-calendar')
      }
    },

    backToToday() {
      this.backToTodayClicked = true
      this.initCalendar()
    },

    /**
     * Jumping more than one month should look like a swipe rather than a cut:
     * slide the strip off in the direction of travel, reposition it on the far
     * side with no transition, then slide it back in.
     */
    animateSwipe(date) {
      if (!this.isExpanded) return

      const from = moment(this.activeCalendar.currentDate)
      const to = moment(date)
      if (from.isSame(to, 'month')) return

      const goingBack = from.isAfter(to, 'month')
      clearTimeout(this.slideTimer)

      this.slideDuration = SLIDE_MS
      this.slideOffset = goingBack ? SLIDE_PX : -SLIDE_PX

      this.slideTimer = setTimeout(() => {
        this.slideDuration = 0
        this.slideOffset = goingBack ? -SLIDE_PX : SLIDE_PX

        this.slideTimer = setTimeout(() => {
          this.slideDuration = SLIDE_MS
          this.slideOffset = 0
        }, 20)
      }, SLIDE_MS)
    },

    swiperChange(event) {
      const newId = event.detail.current
      const newDate = moment(this.calendars[newId].currentDate)

      // Keep a month loaded on the far side of whichever way we just moved.
      if (newDate > moment(this.activeCalendar.currentDate)) {
        this.calendars[this.getNextId(newId)].currentDate = newDate
          .clone()
          .add(1, 'M')
          .format('YYYY-MM-DD')
      } else {
        this.calendars[this.getPrevId(newId)].currentDate = newDate
          .clone()
          .add(-1, 'M')
          .format('YYYY-MM-DD')
      }

      this.setActiveCalendar(newId)
    },

    setActiveCalendar(id) {
      this.calendars.forEach((item) => {
        item.isActive = item.id === id
      })
      this.setChosenDate()
      this.$emit('height', { height: this.calendars.find((item) => item.id === id).height })
    },

    /** Landing on the current month selects today; any other month, its 1st. */
    setChosenDate() {
      const active = moment(this.activeCalendar.currentDate)
      const now = moment()
      this.activeCalendar.chosenDate =
        active.month() === now.month() && active.year() === now.year()
          ? now.format('YYYY-MM-DD')
          : active.startOf('month').format('YYYY-MM-DD')
    },

    getNextId(id) {
      return id + 1 === 3 ? 0 : id + 1
    },

    getPrevId(id) {
      return id - 1 === -1 ? 2 : id - 1
    },

    changeHeight(event, id) {
      this.calendars.find((item) => item.id === id).height = event.height
    }
  }
}
</script>

<style scoped>
.uni-margin-wrap {
  width: 690rpx;
  margin: 0 30rpx;
}
</style>
