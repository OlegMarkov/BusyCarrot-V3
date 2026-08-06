import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/request'
import { useAppStore, tracked } from '@/stores/app'
import { useEmployeeStore } from '@/stores/employee'
import { useScheduleStore } from '@/stores/schedule'
import { useServiceStore } from '@/stores/service'
import { useCustomerStore } from '@/stores/customer'
import { useImageStore } from '@/stores/image'
import { useReservationStore } from '@/stores/reservation'

/**
 * Ported from vegetable.mobile.vue/store/owner.module.js.
 *
 * The one structural change: `FETCH_ALL_OWNER_DATA` used to `commit` mutations
 * belonging to five other modules (SET_EMPLOYEES, SET_SCHEDULES, SET_SERVICES,
 * SET_CUSTOMERS, SET_IMAGES). That worked only because the Vuex modules were
 * not namespaced and therefore shared one global mutation namespace. Pinia
 * stores are separate, so this store now calls into each of them explicitly.
 */
export const useOwnerStore = defineStore('owner', {
  state: () => ({
    owner: null
  }),

  actions: {
    setOwner(owner) {
      this.owner = owner
    },

    async fetchOwner() {
      return tracked(async () => {
        const { data } = await apiClient.OwnerService.get()
        this.owner = data
        return data
      })
    },

    /**
     * The app's cold-start call: one request returns the owner plus every
     * collection, which is then fanned out into the individual stores.
     */
    async fetchAllOwnerData() {
      const app = useAppStore()
      app.setApiCallsAll(true)

      const data = await tracked(async () => {
        const response = await apiClient.OwnerService.getAllData()
        const payload = response.data

        const employees = useEmployeeStore()
        const employeeId = payload.employees[0]?.id

        this.owner = payload
        employees.setEmployees(payload.employees)
        employees.setCurrentEmployeeId(employeeId)
        useScheduleStore().setSchedules(
          payload.schedules.filter((schedule) => schedule.employeeId === employeeId)
        )
        useServiceStore().setServices(payload.services)
        useCustomerStore().setCustomers(payload.customers)
        useImageStore().setImages(payload.images)

        const reservations = useReservationStore()
        reservations.fetchReservations()
        reservations.setReservationsDate(app.activeDay)

        return payload
      })

      app.setApiCallsAll(false)
      return data
    },

    async updateOwner(owner) {
      await tracked(() => apiClient.OwnerService.update(owner))
      return this.fetchOwner()
    },

    async createOwner(owner) {
      return tracked(async () => {
        const { data } = await apiClient.OwnerService.create(owner)

        const employees = useEmployeeStore()
        const employeeId = data.employees[0]?.id

        this.owner = data
        employees.setEmployees(data.employees)
        employees.setCurrentEmployeeId(employeeId)
        useScheduleStore().setSchedules(
          data.schedules.filter((schedule) => schedule.employeeId === employeeId)
        )
        useServiceStore().setServices(data.services)
        useCustomerStore().setCustomers(data.customers)
        useImageStore().setImages(data.images)
        useReservationStore().setReservations(data.reservations)

        return true
      })
    },

    async verifyDuplicateAlias(alias) {
      return tracked(() => apiClient.OwnerService.verifyDuplicateAlias(alias))
    },

    async deleteOwner() {
      return tracked(() => apiClient.OwnerService.delete())
    },

    reset() {
      this.owner = null
    }
  }
})
