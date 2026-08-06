<template>
  <swiper circular :style="swiperStyle" :current="activeDayIndex" @change="swiperChange">
    <swiper-item
      v-for="(item, index) in days"
      :key="index"
      :item-id="String(index)"
      :style="{ height: height + 'px' }"
    >
      <dashboard-day :date="item.date" />
    </swiper-item>
  </swiper>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import dashboardDay from './dashboard-day.vue'
import { useAppStore } from '@/stores/app'
import { useReservationStore } from '@/stores/reservation'
import { publishDate, subscribeDate } from '@/plugins/date-bus'

const SLIDE_MS = 230
const SLIDE_PX = 350
/** Refetch when the shown day drifts more than this from what's loaded. */
const REFETCH_DAY_THRESHOLD = 3

/**
 * Ported from vegetable.mobile.vue/components/app/dashboard/dashboard-list.nvue.
 *
 * Three days on a circular swiper — the visible one plus a day either side —
 * rotated as the user swipes so there is always a neighbour rendered.
 *
 * Changes:
 *  - `BroadcastChannel('dateBC')` → plugins/date-bus.js, with a `source` tag so
 *    this component ignores the echo of its own posts (uni's bus notifies the
 *    sender; BroadcastChannel did not) and an unsubscribe on unmount
 *  - `uni.requireNativePlugin('animation')`'s three-stage slide is a CSS
 *    transform with the same 230ms timings
 *  - vuex dispatch/commit → Pinia
 *  - `:current` is now bound. The original mutated `activeDayIndex` but never
 *    fed it back to the swiper, so a programmatic date change (tapping a day in
 *    the calendar) updated the data without moving the swiper to that slide.
 */
export default {
  name: 'DashboardList',
  components: { dashboardDay },
  props: {
    height: {
      type: [Number, String],
      default: 400
    }
  },
  data() {
    return {
      activeDayIndex: 0,
      slideOffset: 0,
      slideDuration: 0,
      days: [
        { date: moment().format('YYYY-MM-DD') },
        { date: moment().add(1, 'day').format('YYYY-MM-DD') },
        { date: moment().add(-1, 'day').format('YYYY-MM-DD') }
      ]
    }
  },
  computed: {
    ...mapState(useReservationStore, ['reservationsDate']),
    activeDay() {
      return this.days[this.activeDayIndex]
    },
    nextDay() {
      return this.days[this.getNextIndex(this.activeDayIndex)]
    },
    prevDay() {
      return this.days[this.getPrevIndex(this.activeDayIndex)]
    },
    swiperStyle() {
      return {
        height: `${this.height}px`,
        transform: `translateX(${this.slideOffset}px)`,
        transitionProperty: 'transform',
        transitionDuration: `${this.slideDuration}ms`,
        transitionTimingFunction: 'ease'
      }
    }
  },
  mounted() {
    this.unsubscribe = subscribeDate('dashboard-list', (date) => this.goToDate(date))
  },
  unmounted() {
    this.unsubscribe?.()
    clearTimeout(this.slideTimer)
    clearTimeout(this.settleTimer)
  },
  methods: {
    swiperChange(event) {
      const newIndex = event.detail.current
      const newDate = moment(this.days[newIndex].date)

      // Keep a day loaded on the far side of whichever way we just moved.
      if (newDate > moment(this.activeDay.date)) {
        this.days[this.getNextIndex(newIndex)].date = newDate
          .clone()
          .add(1, 'day')
          .format('YYYY-MM-DD')
      } else {
        this.days[this.getPrevIndex(newIndex)].date = newDate
          .clone()
          .add(-1, 'day')
          .format('YYYY-MM-DD')
      }

      this.activeDayIndex = newIndex
      publishDate(this.activeDay.date, 'dashboard-list')
      useAppStore().setActiveDay(this.activeDay.date)
      this.refetchIfDrifted(this.activeDay.date)
    },

    goToDate(date) {
      this.animateSwipe(date)

      // The original waited out its slide animation before swapping the dates,
      // so the outgoing day stays rendered until it is off screen.
      clearTimeout(this.settleTimer)
      this.settleTimer = setTimeout(() => {
        this.activeDay.date = date
        this.prevDay.date = moment(date).add(-1, 'day').format('YYYY-MM-DD')
        this.nextDay.date = moment(date).add(1, 'day').format('YYYY-MM-DD')
        useAppStore().setActiveDay(date)
        this.refetchIfDrifted(date)
      }, 100)
    },

    /**
     * Reservations are fetched in a window around a date; only refetch once the
     * requested day has moved outside it.
     */
    refetchIfDrifted(date) {
      const reservations = useReservationStore()
      if (!this.reservationsDate) {
        reservations.fetchReservations()
        return
      }
      const difference = moment(this.reservationsDate).diff(moment(date), 'days')
      if (difference < -REFETCH_DAY_THRESHOLD || difference > REFETCH_DAY_THRESHOLD) {
        reservations.fetchReservations()
      }
    },

    animateSwipe(date) {
      const from = moment(this.activeDay.date)
      const to = moment(date)
      if (from.isSame(to, 'day')) return

      const goingBack = from.isAfter(to, 'day')
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

    getNextIndex(index) {
      return index + 1 === 3 ? 0 : index + 1
    },

    getPrevIndex(index) {
      return index - 1 === -1 ? 2 : index - 1
    }
  }
}
</script>
