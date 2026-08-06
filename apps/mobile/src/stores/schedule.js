import { defineStore } from 'pinia'
import moment from 'moment'
import { apiClient } from '@/plugins/request'
import { tracked } from '@/stores/app'
import { useEmployeeStore } from '@/stores/employee'

/**
 * Ported from vegetable.mobile.vue/store/schedule.module.js.
 *
 * The large commented-out SET_SCHEDULES_FOR_DAYS block, the `days` state and
 * the `getDashboardDays()` helpers at the bottom of the original were all dead
 * and are not carried over — `getScheduleByDate` below is the live replacement
 * and computes the same thing on demand.
 */

/**
 * Resolve which schedule (if any) covers `date`.
 * Schedule types: 0 = weekly, 1 = rotating on/off, 2 = custom override.
 * A custom schedule always wins over the regular one.
 */
function resolveScheduleOnDay(schedules, date) {
  const custom = schedules.filter(
    (schedule) =>
      schedule.scheduleType === 2 &&
      moment(schedule.scheduleStartDate) <= date &&
      moment(schedule.scheduleEndDate) >= date
  )

  if (custom.length > 0) {
    return custom[0].onDays === 0 ? '' : custom[0].scheduleOnDays[0]
  }

  const regular = schedules.filter(
    (schedule) =>
      schedule.scheduleType !== 2 &&
      moment(schedule.scheduleStartDate) <= date &&
      moment(schedule.scheduleEndDate) >= date
  )

  if (regular.length === 0) return ''
  const schedule = regular[0]

  // Weekly: moment's Sunday is 0, but the schedule array starts on Monday.
  if (schedule.scheduleType === 0) {
    const dayIndex = date.day() === 0 ? 6 : date.day() - 1
    const scheduleOnDay = schedule.scheduleOnDays[dayIndex]
    return scheduleOnDay?.isEnabled ? scheduleOnDay : ''
  }

  // Rotating: position within the on+off cycle, counted from the start date.
  if (schedule.scheduleType === 1) {
    const diff = date.diff(moment(schedule.scheduleStartDate), 'days')
    const cycleLength = schedule.onDays + schedule.offDays
    const dayIndex = cycleLength > diff ? diff : diff % cycleLength
    return schedule.scheduleOnDays[dayIndex] || ''
  }

  return ''
}

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: []
  }),

  getters: {
    getRegularSchedule: (state) => state.schedules.find((schedule) => schedule.scheduleType !== 2),
    getScheduleById: (state) => (id) => state.schedules.find((schedule) => schedule.id === id),
    getScheduleByDate: (state) => (date) => resolveScheduleOnDay(state.schedules, date),
    getSpecialScheduleIdByDate: (state) => (date) => {
      const custom = state.schedules.filter(
        (schedule) =>
          schedule.scheduleType === 2 &&
          moment(schedule.scheduleStartDate) <= date &&
          moment(schedule.scheduleEndDate) >= date
      )
      return custom.length > 0 ? custom[0].id : ''
    }
  },

  actions: {
    setSchedules(schedules) {
      this.schedules = schedules
    },

    async fetchSchedules(employeeId) {
      return tracked(async () => {
        const targetId = employeeId || useEmployeeStore().currentEmployeeId
        const { data } = await apiClient.SchedulesService.fetch(targetId)
        this.schedules = data
        return data
      })
    },

    async createSchedule(schedule) {
      await tracked(() => apiClient.SchedulesService.create(schedule))
      return this.fetchSchedules(schedule.employeeId)
    },

    async updateSchedule(schedule) {
      await tracked(() => apiClient.SchedulesService.update(schedule))
      return this.fetchSchedules(schedule.employeeId)
    },

    /**
     * NOTE: the original declared this as `(context, scheduleId, employeeId)`.
     * Vuex actions only ever receive one payload argument, so `employeeId` was
     * always undefined and the refetch fell back to the current employee. Takes
     * an object here so a caller can actually pass both.
     */
    async deleteSchedule({ scheduleId, employeeId } = {}) {
      await tracked(() => apiClient.SchedulesService.delete(scheduleId))
      return this.fetchSchedules(employeeId)
    },

    /** Blank templates from the API. Both resolve the record, not the response. */
    async getEmptySchedule() {
      return tracked(async () => {
        const { data } = await apiClient.SchedulesService.get()
        return data
      })
    },

    async getEmptyScheduleOnDay() {
      return tracked(async () => {
        const { data } = await apiClient.SchedulesService.getOnDay()
        return data
      })
    },

    reset() {
      this.schedules = []
    }
  }
})
