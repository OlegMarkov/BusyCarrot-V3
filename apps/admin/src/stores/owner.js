import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/api'
import { useEmployeeStore } from '@/stores/employee'
import { useServiceStore } from '@/stores/service'

/**
 * The palette the dashboard assigns round-robin to employees and services, so
 * each gets a stable colour in the actions panel and on the calendar. Taken
 * verbatim from the `fetch()` hook in Vegetable.Admin/pages/_lang/index.vue.
 */
const PALETTE = [
  'red',
  'pink',
  'purple',
  'deep-purple',
  'indigo',
  'blue',
  'light-blue',
  'cyan',
  'teal',
  'green',
  'light-green',
  'lime',
  'yellow',
  'amber',
  'orange',
  'deep-orange',
  'blue-grey',
  'grey'
]

/** Attaches a palette colour to every employee and service, in order. */
function withPaletteColours(owner) {
  let index = 0
  const paint = (record) => ({ ...record, color: PALETTE[index++ % PALETTE.length] })

  return {
    ...owner,
    employees: (owner.employees || []).map(paint),
    services: (owner.services || []).map(paint)
  }
}

// Ported from vegetable/Vegetable.Admin/store/owner.module.js.
// state/mutations map 1:1; the underscore findIndex use became a plain array method.
export const useOwnerStore = defineStore('owner', {
  state: () => ({
    locales: ['en', 'ru'],
    locale: 'en',
    owner: null,
    selectedEmployees: null,
    selectedServices: null,
    normalizedData: null,
    denormalizedData: null
    // `authenticated`, `tempCompanyId` and `user` moved out with Auth0. The
    // token is the only thing that decides whether there is a session, and it
    // lives in stores/session.js; `user` held an Auth0 profile, which no longer
    // exists, and `tempCompanyId` belonged to the `?companyid=` invite flow.
  }),
  getters: {
    currentOwner: (state) => state.owner,
    addresses: (state) => state.owner?.addresses
  },
  actions: {
    /**
     * One request returns the owner plus its employees and services.
     *
     * Replaces the Nuxt `fetch()` hook in pages/_lang/index.vue, which called
     * axios directly from the page and committed three mutations. It also
     * assigned each employee and service a palette colour but stored the result
     * in local variables that were never used — the colours are attached to the
     * records here so the actions panel and calendar can actually read them.
     */
    async fetchAllOwnerData() {
      try {
        const { data } = await apiClient.OwnerService.getAllData()

        this.owner = withPaletteColours(data)
        useEmployeeStore().setEmployees(this.owner.employees || [])
        useServiceStore().setServices(this.owner.services || [])

        return this.owner
      } catch (error) {
        // The original swallowed this and set the owner to {}; keeping the
        // record null lets the guards in the components do their job.
        console.error('Failed to load owner data', error)
        return null
      }
    },

    setLang(locale) {
      if (this.locales.includes(locale)) this.locale = locale
    },
    setOwner(owner) {
      this.owner = owner
    },
    setSelectedEmployees(selectedEmployees) {
      this.selectedEmployees = selectedEmployees
    },
    setSelectedServices(selectedServices) {
      this.selectedServices = selectedServices
    },
    updateEmployee(employee) {
      const employees = this.owner.employees
      const index = employees.findIndex((emp) => emp.id === employee.id)
      employees[index] = { ...employee }
      this.owner.employees = [...employees]
    },
    setNormalizedData(normalizedData) {
      this.normalizedData = normalizedData
    },
    setDenormalizedData(denormalizedData) {
      this.denormalizedData = denormalizedData
    }
  },
  persist: true // replaces vuex-persistedstate (key: 'vegetable')
})
