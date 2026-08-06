<template>
  <view class="nv">
    <uni-nav-bar
      left-icon="arrowleft"
      right-icon="checkmarkempty"
      status-bar="true"
      fixed="true"
      :title="navText"
      @clickLeft="navigateBack"
      @clickRight="checkAndSave"
    />

    <is-busy-indicator v-if="!loaded" :loading="true" />

    <form v-else class="form">
      <!-- Customer -->
      <view class="form-item" @click="$refs.customersPopUp.open()">
        <text class="input-label">{{ $t('common.customer') }}</text>
        <text :class="['uni-input', 'input-text', validation.customerId ? 'input-error' : '']">
          {{ customerName }}
        </text>
        <text
          v-for="(message, index) in validation.customerId || []"
          :key="index"
          class="validation-message"
          >{{ $t(message) }}</text
        >
        <uni-popup ref="customersPopUp" type="bottom">
          <selector-with-filter
            :list-of-objects="activeCustomers"
            :filter-fields="['firstName', 'lastName']"
            :row-title-display-fields="['firstName', 'lastName']"
            :row-note-display-fields="['phone', 'email']"
            type="customers"
            @onSelect="customerSelected"
          />
        </uni-popup>
      </view>

      <!-- Services -->
      <view class="form-item">
        <text class="input-label">{{ $t('common.service') }}</text>

        <view v-for="(service, index) in services" :key="index" class="flex-row row-with-button">
          <text class="uni-input input-text input-with-button">{{ service ? service.title || '' : '' }}</text>
          <uni-icons
            class="button-with-input"
            type="trash-filled"
            color="#dd524d"
            size="32"
            @click="removeService(index)"
          />
        </view>

        <button class="add-button" @click="$refs.servicesPopUp.open()">
          <text style="font-size: 30rpx">{{ $t('reservation.addMoreServices') }}</text>
        </button>

        <text
          v-for="(message, index) in validation.reservationServices || []"
          :key="index"
          class="validation-message"
          >{{ $t(message) }}</text
        >

        <uni-popup ref="servicesPopUp" type="bottom">
          <selector-with-filter
            :list-of-objects="activeServices"
            :filter-fields="['title', 'description']"
            :row-title-display-fields="['title']"
            :row-note-display-fields="['description']"
            type="services"
            exclude-field="id"
            :exclude-values="serviceIds"
            @onSelect="serviceSelected"
          />
        </uni-popup>
      </view>

      <!-- Date -->
      <view class="form-item flex">
        <picker mode="date" :value="date" @change="onDateChange">
          <text class="input-label">{{ $t('common.date') }}</text>
          <text class="uni-input input-text">{{ formatDate(date) }}</text>
        </picker>
      </view>

      <!-- Free slots for that day -->
      <view class="form-item flex">
        <text class="input-label">{{ $t('common.free-time') }}</text>
        <text v-if="freeTimes.length === 0" class="form-base-text">
          {{ $t('common.no-free-time') }}
        </text>
        <scroll-view scroll-x class="flex flex-row" :show-scrollbar="false">
          <view
            v-for="(slot, index) in freeTimes"
            :key="index"
            :class="['pill', slot.outOfSchedule ? '' : 'pill-active']"
            @click="applyFreeSlot(slot)"
          >
            <text class="form-base-text pill-text">
              {{ formatTime(slot.startTime) }}-{{ formatTime(slot.endTime) }}
            </text>
          </view>
        </scroll-view>
        <view v-if="hasOutOfScheduleSlots" class="flex flex-row" style="align-items: center">
          <text class="form-base-text">* </text>
          <view class="pill-dot pill-active" />
          <text class="form-base-text"> - {{ $t('common.in-schedule') }} </text>
          <view class="pill-dot" />
          <text class="form-base-text"> - {{ $t('common.out-of-schedule') }}</text>
        </view>
      </view>

      <!-- Times -->
      <view class="flex-row">
        <view class="form-item flex">
          <picker mode="time" :value="startTime" @change="onStartTimeChange">
            <text class="input-label">{{ $t('reservation.startTime') }}</text>
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
        <view class="form-item flex">
          <picker mode="time" :value="endTime" @change="onEndTimeChange">
            <text class="input-label">{{ $t('reservation.endTime') }}</text>
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
      </view>

      <!-- Cost -->
      <view class="form-item" @click="$refs.cost.focus()">
        <text class="input-label">{{ $t('reservation.cost') }}</text>
        <input
          ref="cost"
          v-model.number="reservation.cost"
          type="number"
          :class="['input-text', validation.cost ? 'input-error' : '']"
          :placeholder="$t('reservation.cost')"
          @input="validation.cost = null"
        />
        <text
          v-for="(message, index) in validation.cost || []"
          :key="index"
          class="validation-message"
          >{{ $t(message) }}</text
        >
      </view>

      <!-- Reminder -->
      <view v-if="displayReminder" class="form-item" @click="$refs.reminder.open()">
        <text class="input-label">{{ $t('reservation.reminder') }}</text>
        <text class="uni-input input-text">{{ timeConvert(reservation.remindInMin) }}</text>
      </view>

      <button v-if="existing" class="delete-button" type="warn" @click="deleteReservation">
        {{ $t('reservation.delete') }}
      </button>

      <uni-popup ref="reminder" type="bottom">
        <view :style="reminderPanelStyle">
          <uni-list>
            <uni-list-item
              v-for="interval in reminderOptions"
              :key="interval"
              :title="timeConvert(interval)"
              @click="selectInterval(interval)"
            />
          </uni-list>
        </view>
      </uni-popup>
    </form>

    <uni-popup ref="sendSmsPopup" type="center" :mask-click="false">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ sendSmsText }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="doSendSms">{{ $t('common.yes') }}</text>
          <text class="modal-dialog-button" @click="doCancelSendSms">{{ $t('common.no') }}</text>
        </view>
        <view class="flex-container form-item top-30">
          <view class="flex-checkbox">
            <checkbox :checked="customerNotSendSms" color="#118C3C" @click="toggleCustomerSendSms" />
          </view>
          <view class="flex-checkbox-label" @click="toggleCustomerSendSms">
            <text class="form-list-title">
              {{ $t('reservation.customer-not-send-confirmation-sms') }}
            </text>
          </view>
        </view>
      </view>
    </uni-popup>

    <uni-popup ref="deleteReservationPopup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ $t('reservation.areyousurefordelete') }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="doDelete">{{ $t('reservation.delete') }}</text>
          <text class="modal-dialog-button" @click="doCancelDelete">{{ $t('common.cancel') }}</text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import validate from 'validate.js'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import uniList from '@/components/ui/uni-list/uni-list.vue'
import uniListItem from '@/components/ui/uni-list-item/uni-list-item.vue'
import selectorWithFilter from '@/components/app/selector-with-filter.vue'
import isBusyIndicator from '@/components/app/is-busy-indicator.vue'
import Constants from '@/config'
import { useServiceStore } from '@/stores/service'
import { useCustomerStore } from '@/stores/customer'
import { useEmployeeStore } from '@/stores/employee'
import { useReservationStore } from '@/stores/reservation'
import { useSettingsStore } from '@/stores/settings'
import { timeConvert } from '@/plugins/helpers'
import { publishDate } from '@/plugins/date-bus'
import { sendSms, shareText } from '@/plugins/native'
import { constraints } from '@/validation/reservation.js'
import { dateTimeCompare, arrayContainsElemetns } from '@/validation/validators.js'

validate.validators.dateTimeCompare = dateTimeCompare
validate.validators.arrayContainsElemetns = arrayContainsElemetns

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'
const REMINDER_INTERVALS = [0, 30, 60, 120, 180]
const REMINDER_ITEM_HEIGHT = 50

/**
 * Ported from vegetable.mobile.vue/pages/reservation/edit.nvue — the largest
 * page in the app.
 *
 * Create or edit a booking: pick a customer and one or more services, choose a
 * day and a slot (the free-time pills come from the schedule minus existing
 * bookings), set a reminder, then optionally text the customer a confirmation.
 *
 * Changes:
 *  - `BroadcastChannel('dateBC')` → plugins/date-bus.js
 *  - `plus.messaging` / `plus.share` → `sendSms()` / `shareText()`
 *  - `displayReminder` was a computed that *wrote* to `reminderOptions` and
 *    `calculateHeight` as a side effect. Computeds are cached on their
 *    dependencies, so the write ran at unpredictable times; `reminderOptions` is
 *    a proper computed now and the panel height derives from it.
 *  - `calculateHeight` was never declared in `data` (only a misspelled
 *    `rcalculateHeight` was), so it was a non-reactive instance property
 *  - FIXED: the cost field's `@input` cleared `validation.title` — a key this
 *    form has no field for — so a cost validation error could never be dismissed
 *  - FIXED: `setOptions` read `this.freeTimes[i].start`, but free-time slots
 *    carry `startTime`. It passed `undefined` into the time setter, so opening
 *    the form from a day with free slots (rather than from a specific slot) set
 *    an Invalid Date instead of the first open slot.
 *  - `uni.$off('customer:created')` removed *every* listener on that channel,
 *    including other pages'; it now removes only this page's handler
 *  - validation messages: `v-if` + `v-for` on one element → `v-for … || []`
 *  - `<div>` → `<view>`; vuex → Pinia; `getApp().globalData.$t` → `$t`
 */
export default {
  components: {
    uniNavBar,
    uniIcons,
    uniPopup,
    uniList,
    uniListItem,
    selectorWithFilter,
    isBusyIndicator
  },
  data() {
    return {
      reservation: {
        reservationServices: [],
        customerId: '',
        startTime: '',
        endTime: '',
        cost: 0,
        remindInMin: 0
      },
      backup: {},
      loaded: false,
      validation: {},
      customerNotSendSms: false,
      keyboardHeight: 0
    }
  },
  computed: {
    ...mapState(useServiceStore, ['activeServices', 'getServiceById']),
    ...mapState(useCustomerStore, ['activeCustomers', 'getCustomerById']),
    ...mapState(useEmployeeStore, ['getCurrentEmployeeId']),
    ...mapState(useSettingsStore, ['language']),
    ...mapState(useReservationStore, [
      'getReservationById',
      'getFreeTimeByDate',
      'getReservationsByDate'
    ]),

    navText() {
      if (!this.loaded) return this.$t('common.loading')
      return this.existing ? this.$t('reservation.edit') : this.$t('reservation.new')
    },

    sendSmsText() {
      return this.reservation.customer?.chatId
        ? this.$t('reservation.send-confirmation-sms')
        : this.$t('reservation.send-confirmation-sms-no-chatId')
    },

    freeTimes() {
      return this.getFreeTimeByDate(this.date, true)
    },

    hasOutOfScheduleSlots() {
      return this.freeTimes.some((slot) => slot.outOfSchedule)
    },

    date: {
      get() {
        return moment(this.reservation.startTime).format('YYYY-MM-DD')
      },
      set(date) {
        const mdate = moment(date)
        const apply = (value) =>
          moment(value).year(mdate.year()).month(mdate.month()).date(mdate.date()).format()
        this.reservation.startTime = apply(this.reservation.startTime)
        this.reservation.endTime = apply(this.reservation.endTime)
      }
    },

    startTime: {
      get() {
        return moment(this.reservation.startTime).format('HH:mm')
      },
      set(time) {
        const mtime = moment(time, 'HH:mm')
        this.reservation.startTime = moment(this.reservation.startTime)
          .hour(mtime.hour())
          .minute(mtime.minute())
          .utc()
          .format()
      }
    },

    endTime: {
      get() {
        return moment(this.reservation.endTime).format('HH:mm')
      },
      set(time) {
        const mtime = moment(time, 'HH:mm')
        this.reservation.endTime = moment(this.reservation.endTime)
          .hour(mtime.hour())
          .minute(mtime.minute())
          .utc()
          .format()
      }
    },

    mStartTime() {
      return moment(this.reservation.startTime)
    },
    mEndTime() {
      return moment(this.reservation.endTime)
    },

    services() {
      return (this.reservation.reservationServices || []).map((item) =>
        this.getServiceById(item.serviceId)
      )
    },
    servicesTitle() {
      return this.services
        .filter(Boolean)
        .map((service) => service.title)
        .join()
    },
    serviceIds() {
      return (this.reservation.reservationServices || []).map((item) => item.serviceId)
    },

    customer() {
      if (!this.reservation.customerId || this.reservation.customerId === EMPTY_GUID) return undefined
      return this.getCustomerById(this.reservation.customerId)
    },
    customerName() {
      if (!this.customer) return ''
      return `${this.customer.firstName || ''} ${this.customer.lastName || ''}`
    },

    existing() {
      return Boolean(this.reservation.id) && this.reservation.id !== EMPTY_GUID
    },

    /** Only offer reminders that would still fire before the booking starts. */
    reminderOptions() {
      if (!this.reservation.startTime) return REMINDER_INTERVALS
      const minutesAway = moment.utc(this.reservation.startTime).diff(moment.utc(), 'minutes')
      return REMINDER_INTERVALS.filter((interval) => minutesAway > interval)
    },

    displayReminder() {
      return this.reminderOptions.length > 1
    },

    reminderPanelStyle() {
      return {
        transitionProperty: 'height',
        height: `${this.reminderOptions.length * REMINDER_ITEM_HEIGHT + this.keyboardHeight}px`,
        transitionDuration: '100ms'
      }
    },

    reservationMessage() {
      return (
        this.$t('reservation.share-reservation-message') +
        moment(this.reservation.startTime).format('LLLL') +
        ' - ' +
        moment(this.reservation.endTime).format('LT') +
        ', ' +
        this.servicesTitle +
        '.\n' +
        this.$t('reservation.share-reservation-message-details') +
        Constants.getValue('ReservationBaseUrl') +
        this.reservation.id
      )
    }
  },

  onLoad(option) {
    // The customer/service edit pages report newly created records back here.
    this.onCustomerCreated = (data) => this.customerSelected(data)
    this.onServiceCreated = (data) => this.serviceSelected(data)
    uni.$on('customer:created', this.onCustomerCreated)
    uni.$on('service:created', this.onServiceCreated)

    const reservations = useReservationStore()

    if (option.id) {
      const known = reservations.getReservationById(option.id)
      if (known) {
        this.applyReservation(known)
      } else {
        reservations.fetchReservationById(option.id).then((result) => {
          if (result) this.applyReservation(result)
        })
      }
      return
    }

    reservations.getEmptyReservation().then((data) => {
      this.reservation = { ...this.reservation, ...(data || {}) }
      this.setOptions(option)
      this.loaded = true
    })
  },

  onUnload() {
    uni.$off('customer:created', this.onCustomerCreated)
    uni.$off('service:created', this.onServiceCreated)
    uni.offKeyboardHeightChange?.(this.keyboardCallback)
  },

  mounted() {
    this.keyboardCallback = (res) => {
      this.keyboardHeight = res.height
    }
    uni.onKeyboardHeightChange(this.keyboardCallback)
  },

  methods: {
    applyReservation(record) {
      this.reservation = { ...this.reservation, ...record }
      this.backup = { ...this.reservation }
      this.loaded = true
    },

    navigateBack() {
      if (this.existing && JSON.stringify(this.backup) !== JSON.stringify(this.reservation)) {
        useReservationStore().fetchReservations()
      }
      // Reached directly from a push notification there is no page to go back to.
      if (getCurrentPages().length > 1) {
        uni.navigateBack()
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    },

    /** Warn about overlapping bookings before saving. */
    checkAndSave() {
      this.reservation.employeeId = this.getCurrentEmployeeId
      if (!this.validate()) return

      const intersections = this.reservationIntersections()
      if (intersections.length === 0) {
        this.save()
        return
      }

      const lines = intersections.map((rsv) => {
        const other = this.getCustomerById(rsv.customerId)
        const who = other ? `${other.firstName} ${other.lastName}` : ''
        return `${moment(rsv.startTime).format('HH:mm')}-${moment(rsv.endTime).format('HH:mm')} ${who}`
      })

      const content = [
        this.$t('reservation.intersection-description'),
        ...lines,
        this.$t('reservation.intersection-question')
      ].join('\n')

      uni.showModal({
        title: this.$t('reservation.intersection-title'),
        content,
        confirmText: this.$t('common.yes'),
        cancelText: this.$t('common.no'),
        success: (res) => {
          if (res.confirm) this.save()
        }
      })
    },

    save() {
      const reservations = useReservationStore()

      if (this.existing) {
        reservations
          .updateReservation({ reservationId: this.reservation.id, reservation: this.reservation })
          .then((result) => uni.$emit('reservation:updated', result))
      } else {
        reservations.createReservation(this.reservation).then((result) => {
          if (result) this.reservation = result
        })
      }

      if (this.reservation.customer?.sendConfirmationSms) {
        this.$refs.sendSmsPopup.open()
      } else {
        uni.navigateBack()
      }
    },

    /** Seeds a new reservation from the ?date= and ?time= query parameters. */
    setOptions(option) {
      this.reservation.startTime = moment(option.date ?? this.reservation.startTime).format()
      this.reservation.endTime = moment(option.date ?? this.reservation.endTime).format()

      if (option.time) {
        this.startTime = option.time
        this.reCalculateEndTime()
        return
      }

      if (this.freeTimes.length > 0) {
        const inScheduleIndex = this.freeTimes.findIndex((slot) => slot.outOfSchedule === false)
        const slot = this.freeTimes[inScheduleIndex > -1 ? inScheduleIndex : 0]
        this.applyFreeSlot(slot)
      }
    },

    applyFreeSlot(slot) {
      this.clearTimeValidation()
      this.startTime = moment(slot.startTime).format('HH:mm')
      this.reCalculateEndTime()
    },

    serviceSelected(service) {
      if (!service.id || service.id === EMPTY_GUID) {
        uni.navigateTo({ url: '/pages/service/edit' })
        return
      }
      this.validation.reservationServices = null
      this.reservation.reservationServices.push({ service, serviceId: service.id })
      this.reservation.cost += service.cost
      this.reCalculateEndTime()
      this.$refs.servicesPopUp.close()
    },

    removeService(index) {
      this.reservation.cost -= this.services[index].cost
      this.reservation.reservationServices.splice(index, 1)
      this.reCalculateEndTime()
    },

    customerSelected(customer) {
      if (!customer.id || customer.id === EMPTY_GUID) {
        uni.navigateTo({ url: '/pages/customer/edit' })
        return
      }
      this.validation.customerId = null
      this.reservation.customer = customer
      this.reservation.customerId = customer.id
      this.$refs.customersPopUp.close()
    },

    onDateChange(event) {
      this.date = event.detail.value
      publishDate(this.date, 'reservation-edit')
    },

    onStartTimeChange(event) {
      this.clearTimeValidation()
      this.startTime = event.detail.value
      this.reCalculateEndTime()
    },

    onEndTimeChange(event) {
      this.clearTimeValidation()
      this.endTime = event.detail.value
    },

    /** End time always follows from the start plus the services' total duration. */
    reCalculateEndTime() {
      this.clearTimeValidation()
      const totalMinutes = this.services
        .filter(Boolean)
        .reduce((total, service) => total + service.durationInMinutes, 0)
      this.endTime = moment(this.reservation.startTime).add(totalMinutes, 'm').format('HH:mm')
    },

    clearTimeValidation() {
      this.validation.startTime = null
      this.validation.endTime = null
    },

    deleteReservation() {
      this.$refs.deleteReservationPopup.open()
    },

    doDelete() {
      useReservationStore().deleteReservation(this.reservation.id)
      uni.navigateBack()
    },

    doCancelDelete() {
      this.$refs.deleteReservationPopup.close()
    },

    doSendSms() {
      this.$refs.sendSmsPopup.close()
      this.persistSmsPreference()

      if (this.reservation.customer.phone) {
        sendSms({ to: this.reservation.customer.phone, body: this.reservationMessage })
      } else {
        shareText({ content: this.reservationMessage })
      }
      uni.navigateBack()
    },

    doCancelSendSms() {
      this.$refs.sendSmsPopup.close()
      this.persistSmsPreference()
      uni.navigateBack()
    },

    /** "Don't ask again for this customer" — saved against the customer record. */
    persistSmsPreference() {
      if (!this.customerNotSendSms) return
      this.reservation.customer.sendConfirmationSms = false
      useCustomerStore().updateCustomer({
        customerId: this.reservation.customer.id,
        customer: this.reservation.customer
      })
    },

    toggleCustomerSendSms() {
      this.customerNotSendSms = !this.customerNotSendSms
    },

    /** validate.js treats empty strings as values, so blanks are stripped first. */
    validate() {
      const populated = Object.entries(this.reservation).reduce((accumulator, [key, value]) => {
        if (value) accumulator[key] = value
        return accumulator
      }, {})

      const result = validate(populated, constraints)
      if (result) {
        this.validation = result
        return false
      }
      return true
    },

    /** Other bookings that day whose time range overlaps this one. */
    reservationIntersections() {
      return this.getReservationsByDate(this.date)
        .filter((other) => other.id !== this.reservation.id)
        .filter(
          (other) =>
            this.mStartTime.isBetween(other.startTime, other.endTime) ||
            this.mEndTime.isBetween(other.startTime, other.endTime) ||
            moment(other.startTime).isBetween(this.mStartTime, this.mEndTime) ||
            moment(other.endTime).isBetween(this.mStartTime, this.mEndTime) ||
            (this.mStartTime.isSame(other.startTime) && this.mEndTime.isSame(other.endTime))
        )
    },

    formatDate(date) {
      moment.locale(this.language)
      const mDate = moment(date)
      return `${mDate.format('dddd')} ${mDate.format('ll')}`
    },

    formatTime(value) {
      return moment(value).format('HH:mm')
    },

    selectInterval(interval) {
      this.reservation.remindInMin = interval
      this.$refs.reminder.close()
    },

    timeConvert
  }
}
</script>

<style lang="scss" scoped>
.delete-button {
  background-color: $uni-color-error;
  border-radius: 18rpx;
}

.input-with-button {
  flex: 9;
}

.button-with-input {
  flex: 1;
}

.row-with-button {
  padding-bottom: 20rpx;
}

.top-30 {
  padding-top: 30px;
}

.flex-container {
  display: flex;
  flex-direction: row;
}

.flex-checkbox-label {
  margin-left: 5px;
  width: 200px;
}
</style>
