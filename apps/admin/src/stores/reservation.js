import { defineStore } from 'pinia'
import moment from 'moment'
import { apiClient } from '@/plugins/api'

/**
 * NEW IN THE VUE 3 PORT — there was no reservation store in Vegetable.Admin.
 *
 * The old dashboard calendar (`components/calendar.vue`) was Vuetify 2's demo
 * component pasted in verbatim: `updateRange()` generated random events with
 * names from a hardcoded list ("Meeting", "Holiday", "PTO", …). It never called
 * the API. This store is what replaces that, so the calendar shows the owner's
 * actual bookings.
 *
 * Endpoint shapes follow packages/api-client, which is exercised by the mobile
 * app against the same Vegetable.API.
 */
export const useReservationStore = defineStore('reservation', {
  state: () => ({
    reservations: [],
    /** The day the loaded window is centred on, so we can tell when to refetch. */
    loadedDate: null,
    loading: false
  }),

  getters: {
    getReservationById: (state) => (id) =>
      state.reservations.find((reservation) => reservation.id === id),

    getReservationsByDate: (state) => (date) =>
      state.reservations.filter((reservation) => reservation.date === date)
  },

  actions: {
    /**
     * The API returns a window of reservations around a given day, so paging the
     * calendar to a nearby month reuses what is already loaded.
     */
    async fetchReservations(date, timezone) {
      const target = date || moment().format('YYYY-MM-DD')
      this.loading = true
      try {
        const { data } = await apiClient.ReservationsService.fetch(target, timezone)
        this.setReservations(data)
        this.loadedDate = target
        return data
      } finally {
        this.loading = false
      }
    },

    /** UTC timestamps from the API become local, plus a `date` key to group by. */
    setReservations(reservations) {
      this.reservations = reservations
        .map((reservation) => ({
          ...reservation,
          date: moment.utc(reservation.startTime).local().format('YYYY-MM-DD'),
          startTime: moment.utc(reservation.startTime).local().format(),
          endTime: moment.utc(reservation.endTime).local().format()
        }))
        .sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
    },

    /**
     * The calendar's new-booking rail has always called this; it was never
     * written, so confirming a booking threw "createReservation is not a
     * function" and nothing left the browser. The stub never saw a request, so
     * nothing looked wrong until the API was real.
     *
     * The payload must carry the nested `customer`, not just `customerId` —
     * OwnerRepo.CreateReservation reads `reservation.Customer.Id` before doing
     * anything else. The caller supplies it.
     */
    async createReservation(reservation) {
      const { data } = await apiClient.ReservationsService.create(reservation)
      await this.fetchReservations(this.loadedDate)
      return data
    },

    async updateReservation(reservationId, reservation) {
      const { data } = await apiClient.ReservationsService.update(reservationId, reservation)
      await this.fetchReservations(this.loadedDate)
      return data
    },

    async deleteReservation(reservationId) {
      await apiClient.ReservationsService.delete(reservationId)
      await this.fetchReservations(this.loadedDate)
    }
  }
})
