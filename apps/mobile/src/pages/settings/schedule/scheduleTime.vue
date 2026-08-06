<template>
  <view class="nv">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.schedule-time')"
      @clickLeft="navigateBack"
    />

    <form class="form">
      <view class="form-item">
        <picker mode="time" :value="startTime" @change="bindStartTimeChange">
          <text class="input-label">{{ $t('general-settings.schedule-start-time') }}</text>
          <text :class="['uni-input', 'input-text', validation.startTime ? 'input-error' : '']">
            {{ startTime }}
          </text>
          <text
            v-for="(message, index) in validation.startTime || []"
            :key="index"
            class="validation-message"
            >{{ $t(message) }}</text
          >
        </picker>
      </view>

      <view class="form-item">
        <picker mode="time" :value="endTime" @change="bindEndTimeChange">
          <text class="input-label">{{ $t('general-settings.schedule-end-time') }}</text>
          <text :class="['uni-input', 'input-text', validation.endTime ? 'input-error' : '']">
            {{ endTime }}
          </text>
          <text
            v-for="(message, index) in validation.endTime || []"
            :key="index"
            class="validation-message"
            >{{ $t(message) }}</text
          >
        </picker>
      </view>

      <view class="flex-row form-item">
        <view>
          <checkbox :checked="enableBreakTime" color="#118C3C" @click="toggleBreakTime" />
        </view>
        <view class="flex-one margin-left-sm" @click="toggleBreakTime">
          <text class="form-list-title">{{ $t('general-settings.enable-breaktime') }}</text>
        </view>
      </view>

      <view class="form-item">
        <picker
          mode="time"
          :value="breakStartTime"
          :disabled="!enableBreakTime"
          @change="bindBreakStartTimeChange"
        >
          <text class="input-label">{{ $t('general-settings.schedule-break-start') }}</text>
          <text
            :class="[
              'uni-input',
              'input-text',
              !enableBreakTime ? 'text-disabled' : '',
              validation.breakStartTime ? 'input-error' : ''
            ]"
          >
            {{ breakStartTime }}
          </text>
          <text
            v-for="(message, index) in validation.breakStartTime || []"
            :key="index"
            class="validation-message"
            >{{ $t(message) }}</text
          >
        </picker>
      </view>

      <view class="form-item">
        <picker
          mode="time"
          :value="breakEndTime"
          :disabled="!enableBreakTime"
          @change="bindBreakEndTimeChange"
        >
          <text class="input-label">{{ $t('general-settings.schedule-break-end') }}</text>
          <text
            :class="[
              'uni-input',
              'input-text',
              !enableBreakTime ? 'text-disabled' : '',
              validation.breakEndTime ? 'input-error' : ''
            ]"
          >
            {{ breakEndTime }}
          </text>
          <text
            v-for="(message, index) in validation.breakEndTime || []"
            :key="index"
            class="validation-message"
            >{{ $t(message) }}</text
          >
        </picker>
      </view>
    </form>
  </view>
</template>

<script>
import validate from 'validate.js'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import { scheduleConstraints } from '@/validation/schedule.js'
import { timeCompare, timeInRangeCompare } from '@/validation/validators.js'

validate.validators.timeCompare = timeCompare
validate.validators.timeInRangeCompare = timeInRangeCompare

/**
 * Ported from vegetable.mobile.vue/pages/settings/schedule/scheduleTime.nvue.
 *
 * Working hours and optional break for one day of a schedule. Validates that
 * the break sits inside the working window, then reports back over `uni.$emit`;
 * the back arrow is the only way out, and it refuses to leave while invalid.
 *
 * Changes:
 *  - the `timePicker` import was registered but never rendered — this screen
 *    uses uni's native `<picker mode="time">`. Dropped, and
 *    `components/app/time-picker` is not ported at all (nothing renders it).
 *  - validation messages: `v-if` + `v-for` on one element → `v-for … || []`
 *  - `bindEnableBreakTimeChange` was dead (the checkbox calls an inline toggle);
 *    it is now the named `toggleBreakTime` used by both the box and its label
 *  - `enableBreakTime` is stringified for validate.js, which compares
 *    `validateIfFields` against the string `'true'`
 */
export default {
  components: { uniNavBar },
  data() {
    return {
      sequence: '',
      startTime: '',
      endTime: '',
      enableBreakTime: false,
      breakStartTime: '',
      breakEndTime: '',
      validation: {}
    }
  },
  onLoad(option) {
    this.sequence = option.sequence
    this.startTime = option.startTime
    this.endTime = option.endTime
    this.enableBreakTime = option.enableBreakTime === 'true'
    this.breakStartTime = option.breakStartTime
    this.breakEndTime = option.breakEndTime
  },
  methods: {
    bindStartTimeChange(event) {
      this.clearWorkValidation()
      this.startTime = event.detail.value
    },

    bindEndTimeChange(event) {
      this.clearWorkValidation()
      this.endTime = event.detail.value
    },

    bindBreakStartTimeChange(event) {
      this.clearBreakValidation()
      this.breakStartTime = event.detail.value
    },

    bindBreakEndTimeChange(event) {
      this.clearBreakValidation()
      this.breakEndTime = event.detail.value
    },

    toggleBreakTime() {
      this.validation.enableBreakTime = null
      this.enableBreakTime = !this.enableBreakTime
    },

    clearWorkValidation() {
      this.validation.startTime = null
      this.validation.endTime = null
    },

    clearBreakValidation() {
      this.validation.breakStartTime = null
      this.validation.breakEndTime = null
    },

    navigateBack() {
      if (!this.validate()) return

      uni.$emit('update:scheduleTime', {
        sequence: this.sequence,
        startTime: this.startTime,
        endTime: this.endTime,
        enableBreakTime: this.enableBreakTime,
        breakStartTime: this.breakStartTime,
        breakEndTime: this.breakEndTime
      })
      uni.navigateBack()
    },

    validate() {
      const candidate = {
        sequence: this.sequence,
        startTime: this.startTime,
        endTime: this.endTime,
        enableBreakTime: this.enableBreakTime,
        breakStartTime: this.breakStartTime,
        breakEndTime: this.breakEndTime
      }

      // Drop null/undefined but keep `false` and `0` — the constraints compare
      // `enableBreakTime` against the *string* 'true'.
      const populated = Object.entries(candidate).reduce((accumulator, [key, value]) => {
        if (value != null) accumulator[key] = value
        return accumulator
      }, {})

      const result = validate(populated, scheduleConstraints)
      if (result) {
        this.validation = result
        return false
      }
      return true
    }
  }
}
</script>
