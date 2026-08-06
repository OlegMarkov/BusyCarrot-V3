<template>
  <view class="nv">
    <uni-nav-bar
      left-icon="arrowleft"
      right-icon="checkmarkempty"
      status-bar="true"
      fixed="true"
      :title="navText"
      @clickLeft="navigateBack"
      @clickRight="save"
    />

    <form class="form">
      <view class="form-item">
        <text class="input-label">{{ $t('employee.firstName') }}</text>
        <input v-model="employee.firstName" class="input-text" type="text" />
      </view>
      <view class="form-item">
        <text class="input-label">{{ $t('employee.lastName') }}</text>
        <input v-model="employee.lastName" class="input-text" type="text" />
      </view>
      <view class="form-item">
        <text class="input-label">{{ $t('employee.description') }}</text>
        <input v-model="employee.description" class="input-text" type="text" />
      </view>
      <view class="form-item">
        <text class="input-label">{{ $t('employee.startOfWorkDate') }}</text>
        <picker
          mode="date"
          :value="renderNullableDate(employee.startOfWorkDate)"
          @change="bindStartOfWorkDateChange"
        >
          <view class="uni-input input-text">{{ renderNullableDate(employee.startOfWorkDate) }}</view>
        </picker>
      </view>
    </form>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import { useEmployeeStore } from '@/stores/employee'

/**
 * Ported from vegetable.mobile.vue/pages/employee/edit.nvue.
 *
 * Changes:
 *  - `:placeholder="t.firstName"` (and the three like it) are gone. `t` was the
 *    translator *function*, so `t.firstName` was always `undefined` and no
 *    placeholder ever rendered.
 *  - `errorNotification` / `uniIcons` were registered but never rendered
 *  - the `moment()` method and the empty `@submit` / `@reset` handlers are gone
 *  - new-employee loading now gets the record itself rather than the whole HTTP
 *    response — see the note on `getEmptyEmployee` in stores/employee.js
 */
export default {
  components: { uniNavBar },
  data() {
    return {
      employee: {},
      backup: {}
    }
  },
  computed: {
    ...mapState(useEmployeeStore, ['getEmployeeById']),
    navText() {
      if (!this.employee) return this.$t('common.loading')
      if (!this.employee.firstName && !this.employee.lastName) return this.$t('employee.new')
      return `${this.employee.firstName || ''} ${this.employee.lastName || ''}`
    }
  },
  onLoad(option) {
    const employees = useEmployeeStore()
    if (option.id) {
      this.employee = { ...employees.getEmployeeById(option.id) }
      this.backup = { ...this.employee }
    } else {
      employees.getEmptyEmployee().then((result) => {
        this.employee = result || {}
      })
    }
  },
  methods: {
    /** Discarded edits are undone by refetching the list. */
    navigateBack() {
      if (JSON.stringify(this.backup) !== JSON.stringify(this.employee)) {
        useEmployeeStore().fetchEmployees()
      }
      uni.navigateBack()
    },

    save() {
      const employees = useEmployeeStore()
      if (this.employee.id) {
        employees.updateEmployee({ employeeId: this.employee.id, employee: this.employee })
      } else {
        employees.createEmployee(this.employee)
      }
      uni.navigateBack()
    },

    bindStartOfWorkDateChange(event) {
      this.employee.startOfWorkDate = event.detail.value
    },

    renderNullableDate(date) {
      return date ? moment(date).format('YYYY-MM-DD') : ''
    }
  }
}
</script>
