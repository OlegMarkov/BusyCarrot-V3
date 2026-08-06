import { defineStore } from 'pinia'
import moment from 'moment'
import { apiClient } from '@/plugins/request'
import { tracked } from '@/stores/app'
import { useAppStore } from '@/stores/app'
import { useOwnerStore } from '@/stores/owner'
import { useScheduleStore } from '@/stores/schedule'

/**
 * Ported from vegetable.mobile.vue/store/reservation.module.js.
 */

/**
 * Combine a date with an "HH:mm" schedule time.
 *
 * FLAGGED BUG FIX — reviewed and signed off: keep the fix.
 *
 * The original wrote `workStartTime.substring(3, 2)` to pull the minutes out of
 * "09:30". `substring` swaps its arguments when start > end, so that returns
 * ":" rather than "30", and `Number(':')` is NaN. The author meant
 * `substr(3, 2)`. The typo appears 8 times (workStart/workEnd/breakStart/
 * breakEnd, in both `ifInSchedule` and `getFreeTimeByDate`); it is fixed in
 * this one function here.
 *
 * What that actually did — verified against moment, not assumed: `.set()`
 * *ignores* a NaN field. It does not invalidate the moment, and it does not
 * zero the minute. The moment simply keeps whatever minute its base already
 * had. So the schedule window silently inherited its minutes from elsewhere:
 *
 *   - in `ifInSchedule` the base is `reservation.startTime`, so a 09:30-18:30
 *     shift was tested as 09:15-18:15 for a booking that started at 10:15 —
 *     the window borrowed the *booking's* minutes.
 *   - in `getFreeTimeByDate` the base is the day being displayed (midnight),
 *     so the same shift was treated as 09:00-18:00.
 *
 * The effect is a boundary error of up to 59 minutes, in either direction,
 * not a wholesale failure — schedules on the hour behaved correctly, which is
 * presumably why it went unnoticed.
 *
 * Fixing it means shifts and breaks with non-zero minutes are now honoured
 * exactly. Expect free-time slots to move by up to an hour on such schedules,
 * and a booking sitting near a shift boundary may flip its "out of the
 * schedule" marker in either direction. To keep the old behaviour, drop the
 * `minute` field from the object below.
 */
function timeOnDate(date, hhmm) {
  const [hour, minute] = String(hhmm).split(':')
  return moment(date).set({
    hour: Number(hour),
    minute: Number(minute),
    second: 0,
    millisecond: 0
  })
}

/**
 * Remove a reservation's span from the list of free windows, splitting any
 * window it lands inside. Unchanged from the original `substractReservation`.
 */
function subtractReservation(times, reservation) {
  const start = moment(reservation.startTime)
  const end = moment(reservation.endTime)

  // Drop windows entirely covered by the reservation.
  let result = times.filter(
    (slot) =>
      !(
        moment(slot.startTime).isBetween(start, end, undefined, '[]') &&
        moment(slot.endTime).isBetween(start, end, undefined, '[]')
      )
  )

  const startIntersections = result.filter((slot) =>
    start.isBetween(slot.startTime, slot.endTime, undefined, '[]')
  )
  const endIntersections = result.filter((slot) =>
    end.isBetween(slot.startTime, slot.endTime, undefined, '[]')
  )

  if (startIntersections.length > 0 && endIntersections.length > 0) {
    const startIndex = result.indexOf(startIntersections[0])
    const endIndex = result.indexOf(endIntersections[0])
    result.splice(
      startIndex,
      startIndex === endIndex ? 1 : 2,
      {
        startTime: startIntersections[0].startTime,
        endTime: start.format(),
        outOfSchedule: startIntersections[0].outOfSchedule
      },
      {
        startTime: end.format(),
        endTime: endIntersections[0].endTime,
        outOfSchedule: endIntersections[0].outOfSchedule
      }
    )
  } else if (startIntersections.length > 0) {
    const startIndex = result.indexOf(startIntersections[0])
    result.splice(startIndex, 1, {
      startTime: startIntersections[0].startTime,
      endTime: start.format(),
      outOfSchedule: startIntersections[0].outOfSchedule
    })
  } else if (endIntersections.length > 0) {
    const endIndex = result.indexOf(endIntersections[0])
    result.splice(endIndex, 1, {
      startTime: end.format(),
      endTime: endIntersections[0].endTime,
      outOfSchedule: endIntersections[0].outOfSchedule
    })
  }

  return result.filter((slot) => slot.startTime !== slot.endTime)
}

/** UTC timestamps from the API → local, plus the `date` key the UI groups by. */
function localise(reservation) {
  return {
    ...reservation,
    date: moment.utc(reservation.startTime).local().format('YYYY-MM-DD'),
    startTime: moment.utc(reservation.startTime).local().format(),
    endTime: moment.utc(reservation.endTime).local().format()
  }
}

function countByDate(reservations) {
  return reservations.reduce((counts, reservation) => {
    counts[reservation.date] = (counts[reservation.date] || 0) + 1
    return counts
  }, {})
}

export const useReservationStore = defineStore('reservation', {
  state: () => ({
    reservations: [],
    // Keyed by 'YYYY-MM-DD'. The original declared this as `[]` and then wrote
    // string keys onto it; an object is what it actually is.
    reservationsCountByDays: {},
    reservationsTotalCostByMonth: {},
    reservationsDate: null
  }),

  getters: {
    getReservationById: (state) => (id) =>
      state.reservations.find((reservation) => reservation.id === id),
    getReservationsByDate: (state) => (date) =>
      state.reservations.filter((reservation) => reservation.date === date),
    getReservationsCountByDate: (state) => (date) => state.reservationsCountByDays[date] ?? 0,
    getReservationsTotalCostByDate: (state) => (date) =>
      state.reservations
        .filter((reservation) => reservation.date === date)
        .reduce((total, reservation) => total + reservation.cost, 0) ?? 0,
    getReservationsTotalCostByMonth: (state) => (month) =>
      state.reservationsTotalCostByMonth[month] ?? 0,
    getReservationsByCustomer: (state) => (customerId) =>
      state.reservations.filter((reservation) => reservation.customerId === customerId),
    getActiveReservationsByCustomer: (state) => (customerId) =>
      state.reservations.filter(
        (reservation) =>
          reservation.customerId === customerId && moment(reservation.startTime).isAfter()
      ),
    getActiveReservationsByService: (state) => (serviceId) =>
      state.reservations.filter(
        (reservation) =>
          reservation.serviceId === serviceId && moment(reservation.startTime).isAfter()
      ),

    /** Does this reservation fall inside working hours (and outside the break)? */
    ifInSchedule() {
      return (reservation) => {
        const schedule = useScheduleStore().getScheduleByDate(
          moment(reservation.startTime).startOf('day')
        )
        if (!schedule) return false

        const start = moment(reservation.startTime)
        const end = moment(reservation.endTime)
        const workStart = timeOnDate(reservation.startTime, schedule.workStartTime)
        const workEnd = timeOnDate(reservation.startTime, schedule.workEndTime)

        if (schedule.enableBreakTime) {
          const breakStart = timeOnDate(reservation.startTime, schedule.breakStartTime)
          const breakEnd = timeOnDate(reservation.startTime, schedule.breakEndTime)
          return (
            (start.isBetween(workStart, breakStart, undefined, '[]') &&
              end.isBetween(workStart, breakStart, undefined, '[]')) ||
            (start.isBetween(breakEnd, workEnd, undefined, '[]') &&
              end.isBetween(breakEnd, workEnd, undefined, '[]'))
          )
        }

        return (
          start.isBetween(workStart, workEnd, undefined, '[]') &&
          end.isBetween(workStart, workEnd, undefined, '[]')
        )
      }
    },

    /**
     * The day's unbooked windows. `all` forces out-of-schedule windows to be
     * included when some reservation already sits outside working hours.
     */
    getFreeTimeByDate(state) {
      return (date, all) => {
        const schedule = useScheduleStore().getScheduleByDate(moment(date))
        const reservations = state.reservations.filter(
          (reservation) => reservation.date === date
        )

        let times = []
        let anyReservationsOutOfSchedule = false

        const dayStart = moment(date).startOf('day')
        const dayEnd = moment(date).endOf('day').set({ second: 0, millisecond: 0 })

        if (schedule) {
          const workStart = timeOnDate(date, schedule.workStartTime)
          const workEnd = timeOnDate(date, schedule.workEndTime)

          if (schedule.enableBreakTime) {
            const breakStart = timeOnDate(date, schedule.breakStartTime)
            const breakEnd = timeOnDate(date, schedule.breakEndTime)

            times = [
              { startTime: dayStart.format(), endTime: workStart.format(), outOfSchedule: true },
              { startTime: workStart.format(), endTime: breakStart.format(), outOfSchedule: false },
              { startTime: breakStart.format(), endTime: breakEnd.format(), outOfSchedule: true },
              { startTime: breakEnd.format(), endTime: workEnd.format(), outOfSchedule: false },
              { startTime: workEnd.format(), endTime: dayEnd.format(), outOfSchedule: true }
            ]

            anyReservationsOutOfSchedule = reservations.some((reservation) => {
              const start = moment(reservation.startTime)
              const end = moment(reservation.endTime)
              return !(
                (start.isBetween(workStart, breakStart, undefined, '[]') &&
                  end.isBetween(workStart, breakStart, undefined, '[]')) ||
                (start.isBetween(breakEnd, workEnd, undefined, '[]') &&
                  end.isBetween(breakEnd, workEnd, undefined, '[]'))
              )
            })
          } else {
            times = [
              { startTime: dayStart.format(), endTime: workStart.format(), outOfSchedule: true },
              { startTime: workStart.format(), endTime: workEnd.format(), outOfSchedule: false },
              { startTime: workEnd.format(), endTime: dayEnd.format(), outOfSchedule: true }
            ]

            anyReservationsOutOfSchedule = reservations.some(
              (reservation) =>
                !(
                  moment(reservation.startTime).isBetween(workStart, workEnd, undefined, '[]') &&
                  moment(reservation.endTime).isBetween(workStart, workEnd, undefined, '[]')
                )
            )
          }
        } else {
          times = [{ startTime: dayStart.format(), endTime: dayEnd.format(), outOfSchedule: true }]
        }

        reservations.forEach((reservation) => {
          times = subtractReservation(times, reservation)
        })

        if (!schedule || (anyReservationsOutOfSchedule && all)) return times
        return times.some((slot) => slot.outOfSchedule === false)
          ? times.filter((slot) => slot.outOfSchedule === false)
          : times
      }
    }
  },

  actions: {
    setReservations(reservations) {
      this.reservations = reservations
        .map(localise)
        .sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
      this.reservationsCountByDays = {
        ...this.reservationsCountByDays,
        ...countByDate(this.reservations)
      }
    },

    /** Adds one reservation to the loaded set — used by push deep links. */
    addReservation(reservation) {
      this.reservations = [...this.reservations, localise(reservation)].sort((a, b) =>
        a.startTime < b.startTime ? -1 : 1
      )
      this.reservationsCountByDays = {
        ...this.reservationsCountByDays,
        ...countByDate(this.reservations)
      }
    },

    setReservationsDate(date) {
      this.reservationsDate = date
    },

    async fetchReservations() {
      const app = useAppStore()
      this.reservationsDate = app.activeDay

      await tracked(async () => {
        const owner = useOwnerStore().owner
        const { data } = await apiClient.ReservationsService.fetch(app.activeDay, owner?.timeZone)
        this.setReservations(data)
        return data
      })

      // The original kicked these off from the `finally` block, i.e. after every
      // fetch, success or failure.
      this.fetchReservationsCountByDays()
      this.fetchReservationsTotalCostByMonth()
    },

    async fetchReservationsCountByDays() {
      return tracked(async () => {
        const { data } = await apiClient.ReservationsService.getCountByDays()
        this.reservationsCountByDays = data
        return data
      })
    },

    async fetchReservationsTotalCostByMonth() {
      return tracked(async () => {
        const { data } = await apiClient.ReservationsService.getTotalCostByMonth()
        this.reservationsTotalCostByMonth = data
        return data
      })
    },

    async fetchReservationById(reservationId) {
      return tracked(async () => {
        const { data } = await apiClient.ReservationsService.get(reservationId)
        this.addReservation(data)
        return data
      })
    },

    async createReservation(reservation) {
      const data = await tracked(async () => {
        const response = await apiClient.ReservationsService.create(reservation)
        return response.data
      })
      await this.fetchReservations()
      return data
    },

    async updateReservation({ reservationId, reservation }) {
      await tracked(() =>
        apiClient.ReservationsService.update(reservationId, {
          ...reservation,
          startTime: moment.utc(reservation.startTime),
          endTime: moment.utc(reservation.endTime)
        })
      )
      return this.fetchReservations()
    },

    async deleteReservation(reservationId) {
      await tracked(() => apiClient.ReservationsService.delete(reservationId))
      return this.fetchReservations()
    },

    /** A blank reservation template from the API. Resolves the record, not the response. */
    async getEmptyReservation() {
      return tracked(async () => {
        const { data } = await apiClient.ReservationsService.get()
        return data
      })
    },

    reset() {
      this.reservations = []
      this.reservationsCountByDays = {}
      this.reservationsTotalCostByMonth = {}
      this.reservationsDate = null
    }
  }
})
