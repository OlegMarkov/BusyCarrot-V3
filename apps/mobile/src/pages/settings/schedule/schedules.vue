<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar
      :fixed="true"
      status-bar="true"
      right-icon="plus"
      :title="$t('general-settings.schedules')"
      @clickRight="navigate()"
    />

    <scroll-view
      class="flex overflow-hidden"
      scroll-y
      :scroll-top="scrollTop"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="refresh"
      @scroll="onScroll"
    >
      <!--
        The design opens this screen with the week read as a bar chart rather
        than as a list row. It only draws for a weekly schedule — a rotating one
        indexes its days by cycle position, not by weekday — so the general
        group below still renders whatever the pattern cannot show.
      -->
      <week-pattern
        v-if="weeklySchedule"
        :schedule="weeklySchedule"
        @click="navigate(weeklySchedule)"
      />

      <uni-list>
        <template v-for="group in groups" :key="group.key">
          <template v-if="group.schedules.length > 0">
            <text class="sch-group">{{ $t(group.title) }}</text>
            <schedule-list-item
              v-for="schedule in group.schedules"
              :key="schedule.id"
              :schedule="schedule"
              @click="navigate(schedule)"
            />
          </template>
        </template>
      </uni-list>
    </scroll-view>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniList from '@/components/ui/uni-list/uni-list.vue'
import uniSection from '@/components/ui/uni-section/uni-section.vue'
import scheduleListItem from '@/components/app/schedule-list-item.vue'
import weekPattern from '@/components/app/week-pattern.vue'
import { useScheduleStore } from '@/stores/schedule'
import { useEmployeeStore } from '@/stores/employee'
import { useAppStore } from '@/stores/app'
import { SCHEDULE_TYPES } from '@/constants/schedule-types'

/**
 * Ported from vegetable.mobile.vue/pages/settings/schedule/schedules.nvue.
 *
 * Three sections: the general (weekly or rotating) schedule, upcoming one-off
 * overrides, then past ones newest-first.
 *
 * Changes:
 *  - the three near-identical section + list blocks become a `v-for` over
 *    `groups`, which also fixes `v-for` and `v-if` sitting on the same element
 *    (`v-if="schedule"` — Vue 3 evaluates the condition before the loop binds)
 *  - `list-refresh` → `<scroll-view refresher-enabled>`; `dom.scrollToElement`
 *    → a bound `scroll-top`
 *  - `_.sortBy` → `Array.prototype.sort`; the local `scheduleTypes` copy →
 *    `@/constants/schedule-types`
 *  - `getSwipeActions` and the `searchInput` import were never used; dropped
 */
export default {
  components: { uniNavBar, uniList, uniSection, scheduleListItem, weekPattern },
  data() {
    return {
      refreshing: false,
      scrollTop: 0,
      currentScrollTop: 0
    }
  },
  computed: {
    ...mapState(useScheduleStore, ['schedules']),
    ...mapState(useEmployeeStore, ['employees']),
    ...mapState(useAppStore, ['tabIndex']),

    /** The weekly schedule, if the general one is of that kind. */
    weeklySchedule() {
      return this.generalSchedules.find(
        (schedule) => schedule.scheduleType === SCHEDULE_TYPES.Week
      )
    },

    generalSchedules() {
      return this.schedules.filter(
        (schedule) =>
          schedule.scheduleType === SCHEDULE_TYPES.Week ||
          schedule.scheduleType === SCHEDULE_TYPES.Switch
      )
    },

    upcomingCustomSchedules() {
      return this.customSchedulesFrom((startDate) =>
        startDate.isSameOrAfter(moment().startOf('date'))
      )
    },

    pastCustomSchedules() {
      return this.customSchedulesFrom((startDate) =>
        startDate.isBefore(moment().startOf('date'))
      ).reverse()
    },

    groups() {
      return [
        {
          key: 'general',
          title: 'general-settings.general-schedule',
          // The weekly one is drawn as the pattern above; only a rotating
          // schedule still needs its summary row here.
          schedules: this.generalSchedules.filter(
            (schedule) => schedule.scheduleType !== SCHEDULE_TYPES.Week
          )
        },
        {
          key: 'upcoming',
          title: 'general-settings.custom-overrides',
          schedules: this.upcomingCustomSchedules
        },
        {
          key: 'past',
          title: 'general-settings.past-schedules',
          schedules: this.pastCustomSchedules
        }
      ]
    }
  },
  async onLoad() {
    // Schedules are per-employee, so the employee list has to land first.
    if (this.employees.length === 0) {
      this.refreshing = true
      await useEmployeeStore().fetchEmployees()
      this.refreshing = false
    }
    if (this.schedules.length === 0) await this.refresh()
  },
  onTabItemTap(item) {
    if (this.tabIndex === item.index) this.gotoTop()
    useAppStore().setTabIndex(item.index)
  },
  methods: {
    customSchedulesFrom(predicate) {
      return this.schedules
        .filter(
          (schedule) =>
            schedule.scheduleType === SCHEDULE_TYPES.Custom &&
            predicate(moment(schedule.scheduleStartDate))
        )
        .sort((a, b) => (a.scheduleStartDate < b.scheduleStartDate ? -1 : 1))
    },

    navigate(schedule) {
      const url = schedule
        ? `/pages/settings/schedule/edit?id=${schedule.id}`
        : '/pages/settings/schedule/edit'
      uni.navigateTo({ url })
    },

    async refresh() {
      this.refreshing = true
      await useScheduleStore().fetchSchedules()
      this.refreshing = false
    },

    onScroll(event) {
      this.currentScrollTop = event.detail.scrollTop
    },

    gotoTop() {
      this.scrollTop = this.currentScrollTop || 1
      this.$nextTick(() => {
        this.scrollTop = 0
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.sch-group {
  font-family: var(--font-body);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin: 20px 8px 9px;
}
</style>
