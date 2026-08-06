<template>
  <li>
    <div class="uk-text-center">
      <h3>{{ $t('obs.date_title') }}</h3>
    </div>

    <div uk-grid>
      <div class="section-calendar uk-width-1-2@m">
        <div class="section-box" @click.stop.prevent>
          <div class="calendar-busy">
            <div class="calendar-header">
              <div class="calendar-nav">
                <span class="active-date">
                  <span>{{ monthFull }} {{ year }}</span>
                </span>
                <a
                  class="uk-icon-button obs-calendar-nav-buttons"
                  :title="$t('obs.calendar_next')"
                  uk-icon="chevron-right"
                  @click.stop.prevent="nextMonth"
                ></a>
                <a
                  class="uk-icon-button uk-margin-small-right obs-calendar-nav-buttons"
                  :title="$t('obs.calendar_previous')"
                  uk-icon="chevron-left"
                  @click.stop.prevent="previousMonth"
                ></a>
              </div>
            </div>

            <table class="calendar-body">
              <thead class="calendar-thead">
                <tr>
                  <th v-for="weekDay in weekDays" :key="weekDay">{{ weekDay }}</th>
                </tr>
              </thead>
              <tbody class="calendar-tbody">
                <tr v-for="(week, weekIndex) in weeks" :key="weekIndex">
                  <td
                    v-for="day in week"
                    :key="day.key"
                    class="calendar-current-month obs-calendar-day"
                  >
                    <span
                      :class="dayClass(day)"
                      :title="day.available ? '' : $t('obs.date_no_slots')"
                      @click.stop.prevent="daySelected(day)"
                      >{{ day.day }}</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="uk-width-1-2@m">
        <div uk-margin class="uk-text-center">
          <h5>{{ $t('obs.date_available_time') }} {{ selectedDateUI }}</h5>

          <p v-if="!bookingStore.canQuerySlots">{{ $t('obs.date_select_service_first') }}</p>
          <p v-else-if="bookingStore.loadingSlots" uk-spinner></p>
          <template v-else-if="bookingStore.selectedDate">
            <button
              v-for="slot in bookingStore.daySlots"
              :key="slot"
              class="uk-button uk-button-default uk-button-small obs-time"
              :class="{ 'uk-button-primary': isSelectedSlot(slot) }"
              @click.stop.prevent="timeSelected(slot)"
            >
              {{ formatTime(slot) }}
            </button>
            <p v-if="!bookingStore.daySlots.length">{{ $t('obs.date_no_slots') }}</p>
          </template>
          <p v-else>{{ $t('obs.date_select_day') }}</p>
        </div>
      </div>
    </div>
  </li>
</template>

<script>
/*
 * Ported from vegetable.web/src/Frontend/ui/src/components/date.vue.
 *
 * The month grid is rebuilt rather than transliterated. The original filled six
 * weeks through six hand-unrolled calls to a `fillWeek` helper that carried a
 * mutable cursor between them, wrote each `<tr>` out longhand in the template,
 * and mutated `day.class` strings in place to track selection. It also had two
 * defects that stopped it working at all:
 *
 *  - `initCalendar()` was only ever called from the selection watchers and the
 *    month buttons, never on mount, so the calendar started empty.
 *  - Its guard required `this.selectedService`, a getter that no longer existed
 *    after multi-service selection landed. It was permanently undefined, so the
 *    guard never passed and the grid stayed empty for good.
 *
 * Availability was read from `mock/slots.js`, whose newest date is in May 2018;
 * the live request was commented out. Day availability now comes from
 * publicowner/monthslots and the times from publicowner/slots.
 */
import moment from 'moment'
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useWizard } from '@/composables/wizard'

export default {
  name: 'ObsDate',
  props: { index: { type: Number, default: 0 } },

  setup() {
    return { wizard: useWizard() }
  },

  data() {
    const now = moment()
    return { year: now.year(), month: now.month() }
  },

  computed: {
    ...mapStores(useBookingStore),

    locale() {
      return this.bookingStore.locale
    },

    monthFull() {
      return moment().locale(this.locale).month(this.month).format('MMMM')
    },

    /*
     * The original always laid the grid out Sunday-first (it indexed with
     * moment's `.day()`) while labelling the columns from `moment.weekdaysShort()`,
     * which is also Sunday-first. Consistent, but wrong for ru, where the week
     * starts on Monday. Both the labels and the grid now follow the locale.
     */
    firstDayOfWeek() {
      return moment().locale(this.locale).localeData().firstDayOfWeek()
    },

    weekDays() {
      const short = moment.localeData(this.locale).weekdaysShort()
      return short.slice(this.firstDayOfWeek).concat(short.slice(0, this.firstDayOfWeek))
    },

    weeks() {
      const firstOfMonth = moment([this.year, this.month, 1])
      const offset = (firstOfMonth.day() - this.firstDayOfWeek + 7) % 7
      const cursor = firstOfMonth.clone().subtract(offset, 'days')
      const today = moment().startOf('day')

      const weeks = []
      for (let week = 0; week < 6; week += 1) {
        const days = []
        for (let day = 0; day < 7; day += 1) {
          const date = cursor.clone()
          days.push({
            key: date.format('YYYY-MM-DD'),
            date,
            day: date.date(),
            inMonth: date.month() === this.month,
            isPast: date.isBefore(today),
            available: this.bookingStore.isDayAvailable(date)
          })
          cursor.add(1, 'day')
        }
        weeks.push(days)
      }
      return weeks
    },

    selectedDateUI() {
      const date = this.bookingStore.selectedDate
      return date ? moment(date).locale(this.locale).format('dddd, LL') : ''
    }
  },

  watch: {
    // Any upstream change invalidates availability; refetch for the month on show.
    'bookingStore.canQuerySlots': {
      immediate: true,
      handler() {
        this.loadMonth()
      }
    },
    year() {
      this.loadMonth()
    },
    month() {
      this.loadMonth()
    }
  },

  methods: {
    loadMonth() {
      if (!this.bookingStore.canQuerySlots) return
      this.bookingStore.fetchMonthSlots(this.year, this.month)
    },

    dayClass(day) {
      return {
        current: day.inMonth,
        'obs-prev': !day.inMonth && day.date.isBefore(moment([this.year, this.month, 1])),
        'obs-next': !day.inMonth && !day.date.isBefore(moment([this.year, this.month, 1])),
        'obs-calendar-day-unavailable': !day.available,
        selected: this.isSelectedDay(day)
      }
    },

    isSelectedDay(day) {
      const selected = this.bookingStore.selectedDate
      return Boolean(selected) && moment(selected).isSame(day.date, 'day')
    },

    isSelectedSlot(slot) {
      const selected = this.bookingStore.selectedTime
      return Boolean(selected) && moment(selected).isSame(moment(slot))
    },

    formatTime(slot) {
      return moment(slot).format('HH:mm')
    },

    daySelected(day) {
      if (!day.available) return
      this.bookingStore.changeDate(day.date.toDate())
      this.bookingStore.fetchDaySlots(day.date.toDate())
    },

    timeSelected(slot) {
      this.bookingStore.changeTime(slot)
      this.wizard.showStep(this.index + 1)
    },

    nextMonth() {
      if (this.month === 11) {
        this.month = 0
        this.year += 1
      } else {
        this.month += 1
      }
    },

    previousMonth() {
      if (this.month === 0) {
        this.month = 11
        this.year -= 1
      } else {
        this.month -= 1
      }
    }
  }
}
</script>

<style>
.obs-time {
  margin-left: 5px;
  margin-bottom: 5px;
}

/***  calendar start  ***/

.section-box {
  border: 1px solid #e5e5e5;
  background-color: #fff;
}

.obs-calendar-nav-buttons {
  float: right;
}

.section-calendar .section-box {
  padding: 0;
}

.calendar-busy .calendar-header {
  margin-top: 15px;
}

.calendar-busy .calendar-nav {
  padding: 0 15px;
  font-size: 14px;
}

.calendar-busy .calendar-nav .active-date {
  color: #333333;
  font-weight: 600;
  text-transform: uppercase;
}

.calendar-body {
  width: 100%;
}

.calendar-busy .calendar-body th {
  color: #757575;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  padding: 13px 5px;
}

.calendar-busy .calendar-body th,
.calendar-busy .calendar-body td {
  width: 14.2857%;
  text-align: center;
  vertical-align: middle;
}

.calendar-busy .calendar-body td {
  color: #1e87f0;
  font-size: 14px;
  font-weight: 400;
}

.calendar-busy .calendar-body td span {
  width: 36px;
  height: 36px;
  line-height: 36px;
  display: block;
  margin: 0 auto;
}

@media (max-width: 567px) {
  .calendar-busy .calendar-body td span {
    width: 25px;
    height: 25px;
    line-height: 25px;
  }

  .calendar-busy .calendar-header {
    margin-top: 5px;
  }
}

td.calendar-current-month.obs-calendar-day span {
  border-radius: 20px;
}

td.calendar-current-month.obs-calendar-day span:hover {
  cursor: pointer;
  background-color: #ebebeb;
}

td.calendar-current-month.obs-calendar-day span.selected {
  background-color: #ebebeb;
}

td.calendar-current-month span.obs-calendar-day-unavailable {
  color: #00000036;
}

td.calendar-current-month span.obs-calendar-day-unavailable:hover {
  cursor: default;
  background-color: white;
}

/* Days spilling in from the neighbouring months were rendered by the original
   but never dimmed, so they read as part of this month. */
td.calendar-current-month span.obs-prev,
td.calendar-current-month span.obs-next {
  opacity: 0.4;
}

/***  calendar end  ***/
</style>
