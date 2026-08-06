import { defineStore } from 'pinia'
import moment from 'moment'

/**
 * Which day the dashboard is looking at, and in what view.
 *
 * Replaces the `$root.$on` / `$root.$emit` event bus the Nuxt app used to pass
 * `CHANGE_DATE`, `CHANGE_CALENDAR_TYPE` and `CHANGE_SCHEDULE` between the page,
 * the calendar and the calendar header. Vue 3 removed `$on` / `$off` / `$emit`
 * on component instances, so that pattern has no direct equivalent — shared
 * state is the replacement, and it means the header and the calendar no longer
 * have to agree on message names.
 */
export const useCalendarStore = defineStore('calendar', {
  state: () => ({
    /** The day the calendar is focused on, 'YYYY-MM-DD'. */
    focus: moment().format('YYYY-MM-DD'),
    /** 'month' | 'week' | 'day' — the same three the old header offered. */
    type: 'month'
  }),

  getters: {
    focusMoment: (state) => moment(state.focus)
  },

  actions: {
    setFocus(date) {
      this.focus = moment(date).format('YYYY-MM-DD')
    },

    setType(type) {
      this.type = type
    },

    today() {
      this.focus = moment().format('YYYY-MM-DD')
    }
  }
})
