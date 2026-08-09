import { defineStore } from 'pinia'
import moment from 'moment'
import { apiClient } from '@/plugins/api'
import { i18n } from '@/plugins/i18n'
import { getCaptchaToken, isCaptchaConfigured } from '@/plugins/recaptcha'
import { useOwnerStore } from '@/stores/owner'
import { slotTime } from '@/plugins/slot-time'

const LOCALES = ['en', 'ru']

const dayKey = (date) => moment(date).format('YYYY-MM-DD')

/**
 * Ported from vegetable.web/src/Frontend/ui/src/store/modules/reservation.module.js.
 *
 * Three behavioural fixes are folded in, each of which the original needed to
 * work at all — see MIGRATION.md:
 *
 * 1. The `getSelectedService` getter was dropped when multi-service selection
 *    landed, but date.vue still mapped it and used it to guard initCalendar().
 *    It was permanently undefined, so the calendar never populated. Selection
 *    is a list here and the guard reads the list.
 * 2. RESET_SERVICES and RESET_SERVICE were both `= "resetServices"`, so the
 *    two mutations collided on one key and "clear all services" silently
 *    removed nothing. They are separate actions here.
 * 3. Availability came from mock/slots.js, hardcoded to dates in 2018 — no day
 *    in any real month was ever bookable. It now comes from
 *    publicowner/monthslots and publicowner/slots.
 */
export const useBookingStore = defineStore('booking', {
  state: () => ({
    locales: LOCALES,
    locale: 'ru',

    steps: [],

    selectedAddress: null,
    selectedServices: [],
    selectedEmployee: null,
    selectedDate: null,
    selectedTime: null,
    selectedClient: null,

    // dayKey -> boolean, for the month grid
    monthSlots: {},
    // ISO datetimes bookable on selectedDate
    daySlots: [],
    loadingSlots: false,

    // Handle returned by PUT publicowner/reservation/{alias}; the reservation
    // is only written once the code tied to it is verified.
    commandKey: null,
    telegramUrl: null,
    bookingError: null,
    confirmed: false
  }),

  getters: {
    hasSelectedServices: (state) => state.selectedServices.length > 0,

    isServiceSelected: (state) => (service) =>
      state.selectedServices.some((selected) => selected.id === service.id),

    // The API sizes a slot by how long the whole booking takes, so multi-service
    // bookings need the sum, not the first service's duration.
    totalDurationInMinutes: (state) =>
      state.selectedServices.reduce((total, service) => total + (service.durationInMinutes || 0), 0),

    totalCost: (state) =>
      state.selectedServices.reduce((total, service) => total + (service.cost || 0), 0),

    // What date.vue used to guard on. All three have to be chosen before the
    // API can say anything about availability.
    canQuerySlots: (state) =>
      Boolean(state.selectedAddress && state.selectedServices.length && state.selectedEmployee),

    selectedDateTime: (state) => {
      if (!state.selectedDate) return null
      // selectedDate is a real local Date off the calendar, so it formats
      // normally. selectedTime is a slot string from the API and does not —
      // see plugins/slot-time.js.
      const day = moment(state.selectedDate).locale(state.locale).format('ddd, LL')
      if (!state.selectedTime) return day
      return `${day} | ${slotTime(state.selectedTime)}`
    },

    isDayAvailable: (state) => (date) => state.monthSlots[dayKey(date)] === true,

    // True only once the month has actually been fetched — before that every
    // day would otherwise look unavailable.
    hasMonthSlots: (state) => Object.keys(state.monthSlots).length > 0
  },

  actions: {
    changeLocale(locale) {
      if (!this.locales.includes(locale)) return
      this.locale = locale
      i18n.global.locale.value = locale
      moment.locale(locale)
    },

    /**
     * Ported from PersonalPage.vue's setup(): a step only appears when there is
     * a choice to make, otherwise the single option is preselected.
     *
     * The original pushed 'location' and 'employee' without registering either
     * component on the page, so any owner with more than one address or
     * employee rendered an unresolved <component :is>. Both are registered now.
     */
    buildSteps(owner) {
      const steps = []

      if (owner.addresses?.length > 1) steps.push('location')
      else this.selectedAddress = owner.addresses?.[0] ?? null

      if (owner.services?.length > 1) steps.push('service')
      else if (owner.services?.length === 1) this.selectedServices = [owner.services[0]]

      if (owner.employees?.length > 1) steps.push('employee')
      else this.selectedEmployee = owner.employees?.[0] ?? null

      steps.push('date')
      steps.push('confirmation')

      this.steps = steps
      return steps
    },

    changeAddress(address) {
      this.selectedAddress = address
      this.clearSchedule()
    },

    toggleService(service) {
      const index = this.selectedServices.findIndex((selected) => selected.id === service.id)
      if (index > -1) this.selectedServices.splice(index, 1)
      else this.selectedServices.push(service)
      this.clearSchedule()
    },

    resetServices() {
      this.selectedServices = []
      this.clearSchedule()
    },

    changeEmployee(employee) {
      this.selectedEmployee = employee
      this.clearSchedule()
    },

    changeDate(date) {
      this.selectedDate = date
      this.selectedTime = null
    },

    changeTime(time) {
      this.selectedTime = time
    },

    /** Anything downstream of a changed selection stops being valid. */
    clearSchedule() {
      this.selectedDate = null
      this.selectedTime = null
      this.monthSlots = {}
      this.daySlots = []
    },

    /**
     * Day-level availability for one calendar month.
     *
     * GetAvailableMonthSlots returns a List<(DateTime, bool)>. Newtonsoft
     * serialises a ValueTuple through its public fields, so the wire shape is
     * `{ item1, item2 }` — read defensively in case that ever becomes a named
     * type.
     */
    async fetchMonthSlots(year, month) {
      if (!this.canQuerySlots) return

      const owner = useOwnerStore()
      const startDate = moment([year, month, 1])
      const endDate = startDate.clone().endOf('month')

      this.loadingSlots = true
      try {
        const { data } = await apiClient.PublicService.getMonthSlots(owner.alias, {
          employeeId: this.selectedEmployee.id,
          duration: this.totalDurationInMinutes,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD')
        })

        const days = typeof data === 'string' ? JSON.parse(data) : data
        const slots = {}
        for (const day of days ?? []) {
          const date = day.item1 ?? day.date ?? day.Item1
          const available = day.item2 ?? day.available ?? day.Item2
          if (date) slots[dayKey(date)] = Boolean(available)
        }
        this.monthSlots = slots
      } catch (error) {
        this.monthSlots = {}
        this.bookingError = error
      } finally {
        this.loadingSlots = false
      }
    },

    /** Bookable start times on one day, as an array of ISO datetimes. */
    async fetchDaySlots(date) {
      if (!this.canQuerySlots || !date) {
        this.daySlots = []
        return
      }

      const owner = useOwnerStore()

      this.loadingSlots = true
      try {
        const { data } = await apiClient.PublicService.getSlots(owner.alias, {
          employeeId: this.selectedEmployee.id,
          duration: this.totalDurationInMinutes,
          date: moment(date).format('YYYY-MM-DD')
        })

        const slots = typeof data === 'string' ? JSON.parse(data) : data
        this.daySlots = Array.isArray(slots) ? slots : []
      } catch (error) {
        this.daySlots = []
        this.bookingError = error
      } finally {
        this.loadingSlots = false
      }
    },

    /**
     * Step one of booking. The API stashes the reservation against a command key
     * and sends a confirmation code; nothing is written until verifyCode().
     *
     * The old app had no equivalent — confirmation.vue sent an email code and
     * showed a success modal without ever calling a reservation endpoint, so no
     * booking made through the site was ever recorded.
     */
    async createReservation(customer) {
      this.bookingError = null

      if (!isCaptchaConfigured()) {
        this.bookingError = 'captcha-not-configured'
        return null
      }

      const owner = useOwnerStore()

      const reservation = {
        startTime: moment(this.selectedTime).toISOString(),
        employeeId: this.selectedEmployee?.id ?? null,
        reservationType: 1, // ReservationType.CustomerWeb
        isConfirmed: false,
        customer: {
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phoneNumber
        },
        reservationServices: this.selectedServices.map((service) => ({ serviceId: service.id }))
      }

      try {
        const token = await getCaptchaToken('booking')
        const { data } = await apiClient.PublicService.createReservation(
          owner.alias,
          reservation,
          token
        )

        const result = typeof data === 'string' ? JSON.parse(data) : data
        this.commandKey = result?.commandKey ?? null
        this.telegramUrl = result?.tlgUrl ?? null
        this.selectedClient = customer
        return result
      } catch (error) {
        this.bookingError = error
        return null
      }
    },

    /** Step two: verifying the code is what actually writes the reservation. */
    async verifyCode(phone, code) {
      this.bookingError = null

      if (!this.commandKey) {
        this.bookingError = 'missing-command-key'
        return false
      }

      try {
        const token = await getCaptchaToken('verify')
        await apiClient.PublicService.verifyCode(phone, {
          code,
          commandKey: this.commandKey,
          captchaToken: token
        })
        this.confirmed = true
        return true
      } catch (error) {
        this.bookingError = error
        return false
      }
    }
  }
})
