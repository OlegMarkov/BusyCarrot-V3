import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/request'
import { tracked } from '@/stores/app'
import { asyncForEach } from '@/plugins/helpers'
import { getEmployeeIsChecked, setEmployeeIsChecked } from '@/plugins/local-storage'

/** Ported from vegetable.mobile.vue/store/employee.module.js. */
export const useEmployeeStore = defineStore('employee', {
  state: () => ({
    employees: [],
    selectedEmployees: [],
    currentEmployeeId: ''
  }),

  getters: {
    getEmployeeById: (state) => (id) => state.employees.find((employee) => employee.id === id),
    getCurrentEmployeeId: (state) => state.currentEmployeeId
  },

  actions: {
    setEmployees(employees) {
      this.employees = employees
    },

    setCurrentEmployeeId(id) {
      this.currentEmployeeId = id
    },

    async fetchEmployees() {
      return tracked(async () => {
        const { data } = await apiClient.EmployeesService.fetch()
        await asyncForEach(data, async (employee) => {
          employee.isChecked = await getEmployeeIsChecked(employee.id)
        })
        // The original indexed data[0] unguarded; an owner always has at least
        // one employee, but an empty response used to throw inside the try and
        // surface as a raised error rather than an empty list.
        if (data.length) this.currentEmployeeId = data[0].id
        this.employees = data
        return data
      })
    },

    async createEmployee(employee) {
      await tracked(() => apiClient.EmployeesService.create(employee))
      return this.fetchEmployees()
    },

    async updateEmployee({ employeeId, employee }) {
      await tracked(() => apiClient.EmployeesService.update(employeeId, employee))
      return this.fetchEmployees()
    },

    async deleteEmployee(employeeId) {
      await tracked(() => apiClient.EmployeesService.delete(employeeId))
      return this.fetchEmployees()
    },

    /** Per-device dashboard filter flag — see plugins/local-storage.js. */
    async updateEmployeeIsChecked({ employeeId, isChecked }) {
      await setEmployeeIsChecked(employeeId, isChecked)
      const employee = this.employees.find((item) => item.id === employeeId)
      if (employee) employee.isChecked = isChecked
    },

    /**
     * A blank employee template from the API, for the "add" form.
     *
     * FLAGGED (signed off): the original returned the whole HTTP response here and
     * `pages/employee/edit.nvue` assigned it straight to `employee`, so the new
     * employee form was bound to `{ data, status, headers, config }` — every
     * field was blank and Create posted that shape back. The sibling service
     * store had the same action but its page unwrapped `.data`. All the
     * getEmpty* actions now resolve the record itself.
     */
    async getEmptyEmployee() {
      return tracked(async () => {
        const { data } = await apiClient.EmployeesService.get()
        return data
      })
    },

    reset() {
      this.employees = []
      this.selectedEmployees = []
      this.currentEmployeeId = ''
    }
  }
})
