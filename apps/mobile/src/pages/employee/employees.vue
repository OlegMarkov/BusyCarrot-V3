<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar :fixed="true" status-bar="true" right-icon="personadd" @clickRight="navigate()">
      <search-input @input="onSearchInput" />
    </uni-nav-bar>

    <scroll-view
      class="flex overflow-hidden"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
    >
      <uni-list>
        <uni-list-item
          v-for="employee in filteredEmployees"
          :key="employee.id"
          :title="employee.firstName + ' ' + employee.lastName"
          :note="employee.description"
          :thumb="employee.avatar || '/static/no-avatar.png'"
          @click="navigate(employee)"
        />
      </uni-list>
    </scroll-view>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniList from '@/components/ui/uni-list/uni-list.vue'
import uniListItem from '@/components/ui/uni-list-item/uni-list-item.vue'
import searchInput from '@/components/app/search-input.vue'
import { useEmployeeStore } from '@/stores/employee'

/**
 * Ported from vegetable.mobile.vue/pages/employee/employees.nvue.
 *
 * Changes:
 *  - the separate `list-refresh` component → `<scroll-view refresher-enabled>`
 *  - `errorNotification` was imported and registered but never rendered; dropped
 *  - the name filter now guards a missing last name. The original called
 *    `.toLowerCase()` on it unconditionally, so an employee saved without one
 *    threw as soon as anything was typed into the search box.
 */
export default {
  components: { uniNavBar, uniList, uniListItem, searchInput },
  data() {
    return {
      searchText: '',
      refreshing: false
    }
  },
  computed: {
    ...mapState(useEmployeeStore, ['employees']),
    filteredEmployees() {
      const term = this.searchText.toLowerCase()
      return this.employees.filter(
        (employee) =>
          employee.firstName?.toLowerCase().includes(term) ||
          employee.lastName?.toLowerCase().includes(term)
      )
    }
  },
  onLoad() {
    if (this.employees.length === 0) this.refresh()
  },
  methods: {
    onSearchInput(text) {
      this.searchText = text
    },

    navigate(employee) {
      const url = employee ? `/pages/employee/edit?id=${employee.id}` : '/pages/employee/edit'
      uni.navigateTo({ url })
    },

    async refresh() {
      this.refreshing = true
      await useEmployeeStore().fetchEmployees()
      this.refreshing = false
    }
  }
}
</script>
