<template>
  <view v-if="schedule" class="nv">
    <uni-nav-bar
      left-icon="arrowleft"
      right-icon="checkmarkempty"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.schedule')"
      @clickLeft="navigateBack"
      @clickRight="save"
    />

    <view class="form">
      <!-- Schedule type: tappable only while a general schedule is still allowed -->
      <view v-if="allowRegularSchedule" class="form-item" @click="navigateScheduleType">
        <text class="input-label">{{ $t('general-settings.schedule-type-title') }}</text>
        <view class="flex-row form-list">
          <view>
            <text class="form-list-title">
              {{ $t('general-settings.schedule-type-' + schedule.scheduleType) }}
            </text>
          </view>
          <view><uni-icons :size="20" class="uni-icon-wrapper" color="#333" type="arrowright" /></view>
        </view>
      </view>

      <view v-else class="form-item">
        <text class="input-label">{{ $t('general-settings.schedule-type-title') }}</text>
        <text class="form-list-title" @click="explainTypeLocked">
          {{ $t('general-settings.schedule-type-' + schedule.scheduleType) }}
        </text>
      </view>

      <view class="form-item">
        <picker mode="date" :value="schedule.scheduleStartDate" @change="bindStartDateChange">
          <text class="input-label">{{ $t('general-settings.schedule-start-date') }}</text>
          <text :class="['uni-input', 'input-text', validation.startDate ? 'input-error' : '']">
            {{ formatDate(schedule.scheduleStartDate) }}
          </text>
          <text
            v-for="(message, index) in validation.startDate || []"
            :key="index"
            class="validation-message"
            >{{ $t(message) }}</text
          >
        </picker>
      </view>

      <view class="form-item">
        <picker mode="date" :value="schedule.scheduleEndDate" @change="bindEndDateChange">
          <text class="input-label">{{ $t('general-settings.schedule-end-date') }}</text>
          <text :class="['uni-input', 'input-text', validation.endDate ? 'input-error' : '']">
            {{ formatDate(schedule.scheduleEndDate) }}
          </text>
          <text
            v-for="(message, index) in validation.endDate || []"
            :key="index"
            class="validation-message"
            >{{ $t(message) }}</text
          >
        </picker>
      </view>

      <!-- Weekly: one row per weekday, each toggleable -->
      <view v-if="schedule.scheduleType === scheduleTypes.Week">
        <view v-for="day in schedule.scheduleOnDays" :key="day.sequence" class="form-item">
          <text v-if="day.sequence === 1" class="input-label">
            {{ $t('general-settings.schedule') }}
          </text>
          <view class="flex-row">
            <view>
              <checkbox value="1" :checked="day.isEnabled" color="#118C3C" @click="toggleDay(day)" />
            </view>
            <view class="flex-one margin-left-sm" @click="toggleDay(day)">
              <text class="form-list-title">
                {{ $t('general-settings.day-' + day.sequence) }}
              </text>
            </view>
            <view class="flex-one" @click="navigateScheduleTime(day)">
              <text class="form-list-title">{{ dayHours(day) }}</text>
            </view>
            <view class="margin-left-lg" @click="navigateScheduleTime(day)">
              <uni-icons :size="20" class="uni-icon-wrapper" color="#333" type="arrowright" />
            </view>
          </view>
        </view>
      </view>

      <!-- Rotating: an N-on/M-off cycle, one row per working day -->
      <view v-if="schedule.scheduleType === scheduleTypes.Switch">
        <days-picker v-model:on-days="schedule.onDays" v-model:off-days="schedule.offDays" />
        <view v-for="day in schedule.scheduleOnDays" :key="day.sequence" class="form-item">
          <text v-if="day.sequence === 1" class="input-label">
            {{ $t('general-settings.schedule') }}
          </text>
          <view class="flex-row">
            <view class="flex-one margin-left-sm">
              <text class="form-list-title">
                {{ $t('general-settings.day') + day.sequence }}
              </text>
            </view>
            <view class="flex-one" @click="navigateScheduleTime(day)">
              <text class="form-list-title">{{ dayHours(day) }}</text>
            </view>
            <view class="margin-left-lg" @click="navigateScheduleTime(day)">
              <uni-icons :size="20" class="uni-icon-wrapper" color="#333" type="arrowright" />
            </view>
          </view>
        </view>
      </view>

      <!-- Custom: a one-off override for the chosen date range -->
      <view v-if="schedule.scheduleType === scheduleTypes.Custom && customDay">
        <view class="flex-row form-item">
          <view>
            <checkbox :checked="isOffDay" color="#118C3C" @click="markOffDay" />
          </view>
          <view class="flex-one margin-left-sm" @click="markOffDay">
            <text class="form-list-title">{{ $t('general-settings.mark-as-off-day') }}</text>
          </view>
        </view>

        <view class="form-item">
          <picker
            mode="time"
            :value="getTime(customDay.workStartTime)"
            :disabled="isOffDay"
            @change="bindStartTimeChange"
          >
            <text class="input-label">{{ $t('general-settings.schedule-start-time') }}</text>
            <text
              :class="[
                'input-text',
                isOffDay ? 'text-disabled' : '',
                validation.customWorkStartTime ? 'input-error' : ''
              ]"
              >{{ getTime(customDay.workStartTime) }}</text
            >
            <text
              v-for="(message, index) in validation.customWorkStartTime || []"
              :key="index"
              class="validation-message"
              >{{ $t(message) }}</text
            >
          </picker>
        </view>

        <view class="form-item">
          <picker
            mode="time"
            :value="getTime(customDay.workEndTime)"
            :disabled="isOffDay"
            @change="bindEndTimeChange"
          >
            <text class="input-label">{{ $t('general-settings.schedule-end-time') }}</text>
            <text
              :class="[
                'input-text',
                isOffDay ? 'text-disabled' : '',
                validation.customWorkEndTime ? 'input-error' : ''
              ]"
              >{{ getTime(customDay.workEndTime) }}</text
            >
            <text
              v-for="(message, index) in validation.customWorkEndTime || []"
              :key="index"
              class="validation-message"
              >{{ $t(message) }}</text
            >
          </picker>
        </view>

        <view class="flex-row form-item">
          <view>
            <checkbox
              :checked="customDay.enableBreakTime"
              :disabled="isOffDay"
              color="#118C3C"
              @click="bindEnableBreakChange"
            />
          </view>
          <view class="flex-one margin-left-sm">
            <text
              :class="[isOffDay ? 'text-disabled' : '', 'form-list-title']"
              @click="bindEnableBreakChange"
              >{{ $t('general-settings.enable-breaktime') }}</text
            >
          </view>
        </view>

        <view class="form-item">
          <picker
            mode="time"
            :value="getTime(customDay.breakStartTime)"
            :disabled="breakDisabled"
            @change="bindBreakStartTimeChange"
          >
            <text class="input-label">{{ $t('general-settings.schedule-break-start') }}</text>
            <text
              :class="[
                'input-text',
                validation.customBreakStartTime ? 'input-error' : '',
                breakDisabled ? 'text-disabled' : ''
              ]"
              >{{ getTime(customDay.breakStartTime) }}</text
            >
            <text
              v-for="(message, index) in validation.customBreakStartTime || []"
              :key="index"
              class="validation-message"
              >{{ $t(message) }}</text
            >
          </picker>
        </view>

        <view class="form-item">
          <picker
            mode="time"
            :value="getTime(customDay.breakEndTime)"
            :disabled="breakDisabled"
            @change="bindBreakEndTimeChange"
          >
            <text class="input-label">{{ $t('general-settings.schedule-break-end') }}</text>
            <text
              :class="[
                'input-text',
                validation.customBreakEndTime ? 'input-error' : '',
                breakDisabled ? 'text-disabled' : ''
              ]"
              >{{ getTime(customDay.breakEndTime) }}</text
            >
            <text
              v-for="(message, index) in validation.customBreakEndTime || []"
              :key="index"
              class="validation-message"
              >{{ $t(message) }}</text
            >
          </picker>
        </view>

        <button v-if="existingSchedule" class="delete-button" type="warn" @click="deleteSchedule">
          {{ $t('common.delete') }}
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import validate from 'validate.js'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import daysPicker from '@/components/app/days-picker.vue'
import { useScheduleStore } from '@/stores/schedule'
import { useEmployeeStore } from '@/stores/employee'
import { useSettingsStore } from '@/stores/settings'
import { SCHEDULE_TYPES } from '@/constants/schedule-types'
import { toast } from '@/plugins/native'
import { commonScheduleConstraints } from '@/validation/common-schedule.js'
import { customScheduleConstraints } from '@/validation/custom-schedule.js'
import { dateTimeCompare, timeCompare, timeInRangeCompare } from '@/validation/validators.js'

validate.validators.timeCompare = timeCompare
validate.validators.timeInRangeCompare = timeInRangeCompare
validate.validators.dateTimeCompare = dateTimeCompare

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'

/**
 * Ported from vegetable.mobile.vue/pages/settings/schedule/edit.nvue.
 *
 * Creates or edits a schedule in one of three shapes — weekly, a rotating
 * on/off cycle, or a one-off override for a date range. Only one general
 * (weekly or rotating) schedule may exist, so once one does, this page forces
 * the Custom shape and locks the type selector.
 *
 * THE STRUCTURAL CHANGE: `allowRegularSchedule` was a *computed* that, on top of
 * returning a boolean, reassigned `schedule.scheduleType`, rebuilt
 * `scheduleOnDays`, wrote both dates and invoked two `bind*Change` handlers.
 * Vue 3 evaluates computeds during render and warns loudly about state mutated
 * there — and because computeds cache on their dependencies, those writes fired
 * at unpredictable moments even under Vue 2. The computed is pure now, and the
 * coercion happens once in `enforceCustomWhenGeneralExists()`, called from
 * `onLoad` after the schedule is in hand.
 *
 * Other changes:
 *  - `:onDays.sync` / `:offDays.sync` → `v-model:on-days` / `v-model:off-days`;
 *    Vue 3 removed the `.sync` modifier
 *  - `uni.$off('update:scheduleTime')` removed *every* listener on that channel,
 *    not just this page's; both handlers are now removed by reference
 *  - `deleteSchedule` called `dispatch(DELETE_SCHEDULE, id, employeeId)`; Vuex
 *    only ever passes one payload, so `employeeId` was silently dropped and the
 *    refetch reloaded the wrong employee. It travels in an object now.
 *  - `this.schedule.onDays === 0` in the template (the `this.` prefix) → the
 *    `isOffDay` computed; `scheduleOnDays[0]` → the guarded `customDay`
 *  - validation messages: `v-if` + `v-for` on one element → `v-for … || []`
 *  - `selectDay()` toggled a `checked` flag nothing read; dropped with the flag
 *  - the local `scheduleTypes` copy → `@/constants/schedule-types`
 *  - `plus.nativeUI.toast` → `toast()`; three `console.log`s removed
 */
export default {
  components: { uniNavBar, uniIcons, daysPicker },
  data() {
    return {
      scheduleTypes: SCHEDULE_TYPES,
      schedule: null,
      emptyScheduleOnDay: {},
      option: null,
      validation: {},
      backup: {}
    }
  },
  computed: {
    ...mapState(useScheduleStore, ['getScheduleById', 'schedules']),
    ...mapState(useEmployeeStore, ['employees']),
    ...mapState(useSettingsStore, ['language']),

    existingSchedule() {
      return Boolean(this.schedule?.id) && this.schedule.id !== EMPTY_GUID
    },

    /** A general schedule may only be created while no other one exists. */
    allowRegularSchedule() {
      return !this.otherGeneralSchedule
    },

    otherGeneralSchedule() {
      if (!this.schedule) return undefined
      return this.schedules.find(
        (item) =>
          this.schedule.id !== item.id &&
          (item.scheduleType === SCHEDULE_TYPES.Week || item.scheduleType === SCHEDULE_TYPES.Switch)
      )
    },

    /** Custom schedules have exactly one day entry. */
    customDay() {
      return this.schedule?.scheduleOnDays?.[0]
    },

    isOffDay() {
      return this.schedule?.onDays === 0
    },

    breakDisabled() {
      return this.isOffDay || !this.customDay?.enableBreakTime
    }
  },

  async onLoad(option) {
    this.option = option
    const schedules = useScheduleStore()

    // Needed before any type switch can rebuild the day rows.
    this.emptyScheduleOnDay = (await schedules.getEmptyScheduleOnDay()) || {}

    if (option.id) {
      this.schedule = { ...schedules.getScheduleById(option.id) }
      this.backup = JSON.parse(JSON.stringify(this.schedule))
    } else {
      const empty = await schedules.getEmptySchedule()
      this.schedule = { ...(empty || {}) }
      this.schedule.employeeId = this.employees[0]?.id
    }

    this.enforceCustomWhenGeneralExists()

    this.onScheduleTimeUpdated = (data) => {
      const day = this.schedule.scheduleOnDays[data.sequence - 1]
      if (!day) return
      day.workStartTime = data.startTime
      day.workEndTime = data.endTime
      day.enableBreakTime = data.enableBreakTime
      day.breakStartTime = data.breakStartTime
      day.breakEndTime = data.breakEndTime
    }

    this.onScheduleTypeUpdated = (data) => {
      const type = Number(data.selectedType)
      this.applyDefaultScheduleOnDays(type)
      this.schedule.scheduleType = type
    }

    uni.$on('update:scheduleTime', this.onScheduleTimeUpdated)
    uni.$on('update:scheduleType', this.onScheduleTypeUpdated)

    // A rotating cycle's working-day rows follow the "days on" count.
    this.$watch(
      () => this.schedule?.onDays,
      (onDays) => {
        if (this.schedule?.scheduleType !== SCHEDULE_TYPES.Switch) return
        this.schedule.scheduleOnDays = this.buildScheduleOnDays(onDays)
      }
    )
  },

  onUnload() {
    uni.$off('update:scheduleTime', this.onScheduleTimeUpdated)
    uni.$off('update:scheduleType', this.onScheduleTypeUpdated)
  },

  methods: {
    /**
     * With a general schedule already on file this page can only produce a
     * custom one, so coerce the type and seed the dates from the query string
     * (the dashboard links here with ?date= and the day's working hours).
     */
    enforceCustomWhenGeneralExists() {
      if (!this.otherGeneralSchedule) return
      if (this.schedule.scheduleType === SCHEDULE_TYPES.Custom) return

      this.schedule.scheduleType = SCHEDULE_TYPES.Custom
      this.applyDefaultScheduleOnDays(SCHEDULE_TYPES.Custom)

      const { date, workStartTime, workEndTime } = this.option || {}
      if (date) {
        this.schedule.scheduleStartDate = date
        this.schedule.scheduleEndDate = date
        if (workStartTime) this.customDay.workStartTime = workStartTime
        // NOTE: the original guarded this second assignment on `workStartTime`
        // too, so an end time never arrived without a start time. Guarded on its
        // own parameter here.
        if (workEndTime) this.customDay.workEndTime = workEndTime
      } else {
        const today = moment().format('YYYY-MM-DD')
        this.schedule.scheduleStartDate = today
        this.schedule.scheduleEndDate = today
      }
    },

    buildScheduleOnDays(count, enabledThrough = 0) {
      return Array.from({ length: count }, (_, index) => {
        const day = JSON.parse(JSON.stringify(this.emptyScheduleOnDay))
        day.sequence = index + 1
        if (day.sequence <= enabledThrough) day.isEnabled = true
        return day
      })
    },

    /** Each schedule shape has its own default set of day rows. */
    applyDefaultScheduleOnDays(scheduleType) {
      if (scheduleType === SCHEDULE_TYPES.Week) {
        // Seven rows, Monday–Friday enabled.
        this.schedule.scheduleOnDays = this.buildScheduleOnDays(7, 5)
        this.schedule.onDays = 5
        this.schedule.offDays = 2
        return
      }

      if (scheduleType === SCHEDULE_TYPES.Switch) {
        this.schedule.scheduleOnDays = this.buildScheduleOnDays(2)
        this.schedule.onDays = 2
        this.schedule.offDays = 2
        return
      }

      this.schedule.scheduleOnDays = this.buildScheduleOnDays(1)
      this.schedule.onDays = 1
      this.schedule.offDays = 0
    },

    navigateBack() {
      if (this.existingSchedule && JSON.stringify(this.backup) !== JSON.stringify(this.schedule)) {
        useScheduleStore().fetchSchedules()
      }
      uni.navigateBack()
    },

    async save() {
      const valid =
        this.schedule.scheduleType === SCHEDULE_TYPES.Custom
          ? this.validateCustomSchedule()
          : this.validateSchedule()
      if (!valid) return

      if (this.hasCustomScheduleOverlap()) {
        toast(this.$t('general-settings.custom-schedule-validation'))
        return
      }

      const schedules = useScheduleStore()
      if (this.existingSchedule) {
        await schedules.updateSchedule(this.schedule)
      } else {
        await schedules.createSchedule(this.schedule)
      }

      uni.showLoading({ title: this.$t('general-settings.apply-schedule') })
      await schedules.fetchSchedules()
      uni.hideLoading()
      uni.navigateBack()
    },

    /** Two custom schedules may not cover any of the same days. */
    hasCustomScheduleOverlap() {
      if (this.schedule.scheduleType !== SCHEDULE_TYPES.Custom) return false

      const start = moment(this.schedule.scheduleStartDate)
      const end = moment(this.schedule.scheduleEndDate)

      return this.schedules.some((item) => {
        if (item.id === this.schedule.id || item.scheduleType !== SCHEDULE_TYPES.Custom) return false
        const otherStart = moment(item.scheduleStartDate)
        const otherEnd = moment(item.scheduleEndDate)
        return start <= otherEnd && end >= otherStart
      })
    },

    explainTypeLocked() {
      toast(this.$t('general-settings.regular-schedule-validation'))
    },

    toggleDay(day) {
      day.isEnabled = !day.isEnabled
    },

    dayHours(day) {
      return `${this.getTime(day.workStartTime)} - ${this.getTime(day.workEndTime)}`
    },

    navigateScheduleType() {
      uni.navigateTo({
        url: `/pages/settings/schedule/scheduleType?type=${this.schedule.scheduleType}`
      })
    },

    navigateScheduleTime(day) {
      const params = [
        `sequence=${day.sequence}`,
        `startTime=${this.getTime(day.workStartTime)}`,
        `endTime=${this.getTime(day.workEndTime)}`,
        `enableBreakTime=${day.enableBreakTime}`,
        `breakStartTime=${this.getTime(day.breakStartTime)}`,
        `breakEndTime=${this.getTime(day.breakEndTime)}`
      ].join('&')
      uni.navigateTo({ url: `/pages/settings/schedule/scheduleTime?${params}` })
    },

    bindStartDateChange(event) {
      this.clearDateValidation()
      this.schedule.scheduleStartDate = event.detail.value
      // Keep the range coherent: dragging the start past the end pushes the end.
      if (moment(this.schedule.scheduleStartDate).isAfter(moment(this.schedule.scheduleEndDate))) {
        this.schedule.scheduleEndDate = event.detail.value
      }
    },

    bindEndDateChange(event) {
      this.clearDateValidation()
      this.schedule.scheduleEndDate = event.detail.value
      if (moment(this.schedule.scheduleEndDate).isBefore(moment(this.schedule.scheduleStartDate))) {
        this.schedule.scheduleStartDate = event.detail.value
      }
    },

    bindStartTimeChange(event) {
      this.clearCustomWorkValidation()
      this.customDay.workStartTime = event.detail.value
    },

    bindEndTimeChange(event) {
      this.clearCustomWorkValidation()
      this.customDay.workEndTime = event.detail.value
    },

    bindBreakStartTimeChange(event) {
      this.clearCustomBreakValidation()
      this.customDay.breakStartTime = event.detail.value
    },

    bindBreakEndTimeChange(event) {
      this.clearCustomBreakValidation()
      this.customDay.breakEndTime = event.detail.value
    },

    bindEnableBreakChange() {
      this.validation.customEnableBreakTime = null
      this.customDay.enableBreakTime = !this.customDay.enableBreakTime
    },

    /** "Mark as a day off" — a custom schedule covering zero working days. */
    markOffDay() {
      this.schedule.onDays = this.schedule.onDays === 1 ? 0 : 1
      this.schedule.offDays = this.schedule.offDays === 1 ? 0 : 1
    },

    clearDateValidation() {
      this.validation.startDate = null
      this.validation.endDate = null
    },

    clearCustomWorkValidation() {
      this.validation.customWorkStartTime = null
      this.validation.customWorkEndTime = null
    },

    clearCustomBreakValidation() {
      this.validation.customBreakStartTime = null
      this.validation.customBreakEndTime = null
    },

    deleteSchedule() {
      useScheduleStore().deleteSchedule({
        scheduleId: this.schedule.id,
        employeeId: this.schedule.employeeId
      })
      uni.navigateBack()
    },

    validateSchedule() {
      return this.runValidation(
        {
          startDate: this.schedule.scheduleStartDate,
          endDate: this.schedule.scheduleEndDate
        },
        commonScheduleConstraints
      )
    },

    validateCustomSchedule() {
      return this.runValidation(
        {
          startDate: this.schedule.scheduleStartDate,
          endDate: this.schedule.scheduleEndDate,
          customWorkStartTime: this.customDay.workStartTime,
          customWorkEndTime: this.customDay.workEndTime,
          customEnableBreakTime: this.customDay.enableBreakTime,
          customScheduleEnabled: this.schedule.onDays !== 0,
          customBreakStartTime: this.customDay.breakStartTime,
          customBreakEndTime: this.customDay.breakEndTime
        },
        customScheduleConstraints
      )
    },

    /** Drops null/undefined but keeps `false` — the constraints test for it. */
    runValidation(candidate, constraints) {
      const populated = Object.entries(candidate).reduce((accumulator, [key, value]) => {
        if (value != null) accumulator[key] = value
        return accumulator
      }, {})

      const result = validate(populated, constraints)
      if (result) {
        this.validation = result
        return false
      }
      return true
    },

    /** The API stores working hours as a timespan; show them as HH:mm. */
    getTime(timespan) {
      return moment().startOf('day').add(moment.duration(timespan)).format('HH:mm')
    },

    formatDate(date) {
      moment.locale(this.language)
      return moment(date).format('LL')
    }
  }
}
</script>

<style lang="scss" scoped>
.delete-button {
  background-color: $uni-color-error;
  border-radius: 18rpx;
  margin-top: 80rpx;
}
</style>
