import { defineStore } from 'pinia'
import moment from 'moment'
import { apiClient } from '@/plugins/api'

/**
 * NEW IN THE DESKTOP REDESIGN — Vegetable.Admin had no notion of schedules, and
 * neither did the Vue 3 port until now. The Hours section and the calendar's
 * open/close bounds both need them.
 *
 * The shape follows apps/mobile's schedule store, which is exercised against
 * the same `owner/schedule` endpoints, but only the read side is carried: the
 * desktop design displays the weekly pattern and its overrides, it does not
 * edit them.
 */

/**
 * Vegetable.Entities.ScheduleType.
 *
 * `week` is 0 and `switch` is 1 — these were transposed here, which made
 * `weekSchedule` search for a type no weekly schedule carries. Every lookup
 * returned null and every day rendered closed. It went unnoticed because the
 * in-repo stub was written to serve `scheduleType: 1`, agreeing with the wrong
 * constant; a real Vegetable.API issues 0. apps/mobile has had it right all
 * along in constants/schedule-types.js, and the API's own resolveScheduleOnDay
 * branches on 0 for weekly, 1 for rotating.
 */
export const SCHEDULE_TYPE = { week: 0, switch: 1, custom: 2 }

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: [],
    loading: false
  }),

  getters: {
    /**
     * The recurring weekly schedule, if the owner has one. Custom (one-off)
     * schedules override it on their own dates.
     */
    weekSchedule: (state) =>
      state.schedules.find((schedule) => schedule.scheduleType === SCHEDULE_TYPE.week) || null,

    customSchedules: (state) =>
      state.schedules.filter((schedule) => schedule.scheduleType === SCHEDULE_TYPE.custom),

    /**
     * The schedule covering a given day: a custom one if it exists, else the
     * weekly pattern's entry for that weekday.
     *
     * `scheduleOnDays` is indexed Monday-first by the API — `(dayOfWeek + 6) % 7`
     * is the same conversion PublicOwnerController does when it reads the array.
     */
    scheduleOnDate: (state) => (date) => {
      const target = moment(date)

      const custom = state.schedules.find(
        (schedule) =>
          schedule.scheduleType === SCHEDULE_TYPE.custom &&
          target.isBetween(schedule.scheduleStartDate, schedule.scheduleEndDate, 'day', '[]')
      )
      if (custom) return custom.scheduleOnDays?.[0] ?? null

      const week = state.schedules.find((schedule) => schedule.scheduleType === SCHEDULE_TYPE.week)
      if (!week) return null
      if (!target.isBetween(week.scheduleStartDate, week.scheduleEndDate, 'day', '[]')) return null

      const index = (target.day() + 6) % 7
      const day = week.scheduleOnDays?.[index] ?? null
      return day && day.isEnabled !== false ? day : null
    }
  },

  actions: {
    setSchedules(schedules) {
      this.schedules = schedules || []
    },

    async fetchSchedules(employeeId) {
      if (!employeeId) return []
      this.loading = true
      try {
        const { data } = await apiClient.SchedulesService.fetch(employeeId)
        this.setSchedules(data)
        return data
      } finally {
        this.loading = false
      }
    },

    reset() {
      this.schedules = []
    }
  }
})
