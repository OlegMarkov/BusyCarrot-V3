import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/api'

/**
 * Ported from vegetable/Vegetable.Admin/store/employee.module.js.
 *
 * Same `{ id, checked, employee }` wrapper shape as the service store — the
 * actions-panel rows read `employeeInfo.employee.fullName`, and `checked`
 * drives which employees' bookings the calendar shows.
 */
export const useEmployeeStore = defineStore('employee', {
  state: () => ({
    employees: []
  }),

  getters: {
    /** The employee record itself. */
    getEmployeeById: (state) => (id) => state.employees.find((item) => item.id === id)?.employee,

    /** Unwrapped employee records; see the note on the service store. */
    activeEmployees: (state) =>
      state.employees
        .map((item) => item.employee)
        .filter((employee) => employee && employee.isDeleted !== true),

    /** The wrapper, when the caller needs `checked` too. */
    getEmployeeEntryById: (state) => (id) => state.employees.find((item) => item.id === id),

    checkedEmployeeIds: (state) =>
      state.employees.filter((item) => item.checked).map((item) => item.id)
  },

  actions: {
    setEmployees(employees) {
      this.employees = employees.map((employee) => {
        const current = this.employees.find((item) => item.id === employee.id)
        return {
          id: employee.id,
          checked: current ? current.checked : true,
          employee
        }
      })
    },

    setEmployeeChecked(employeeId, checked) {
      const entry = this.employees.find((item) => item.id === employeeId)
      if (entry) entry.checked = checked
    },

    async fetchEmployees() {
      const { data } = await apiClient.EmployeesService.fetch()
      this.setEmployees(data)
      return data
    },

    async createEmployee(employee) {
      await apiClient.EmployeesService.create(employee)
      await this.fetchEmployees()
    },

    async updateEmployee(employeeId, employee) {
      await apiClient.EmployeesService.update(employeeId, employee)
      await this.fetchEmployees()
    },

    async deleteEmployee(employeeId) {
      await apiClient.EmployeesService.delete(employeeId)
      await this.fetchEmployees()
    }
  }
})
