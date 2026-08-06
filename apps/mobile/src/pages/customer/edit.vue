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
      <view class="form-item" @click="$refs.firstName.focus()">
        <text class="input-label">{{ $t('customer.firstname') }}</text>
        <input
          ref="firstName"
          v-model="customer.firstName"
          type="text"
          :class="['input-text', validation.firstName ? 'input-error' : '']"
          @input="validation.firstName = null"
        />
        <text
          v-for="(message, index) in validation.firstName || []"
          :key="index"
          class="validation-message"
          >{{ $t(message) }}</text
        >
      </view>

      <view class="form-item" @click="$refs.lastName.focus()">
        <text class="input-label">{{ $t('customer.lastname') }}</text>
        <input
          ref="lastName"
          v-model="customer.lastName"
          type="text"
          :class="['input-text', validation.lastName ? 'input-error' : '']"
          @input="validation.lastName = null"
        />
        <text
          v-for="(message, index) in validation.lastName || []"
          :key="index"
          class="validation-message"
          >{{ $t(message) }}</text
        >
      </view>

      <view class="form-item" @click="$refs.phone.focus()">
        <text class="input-label">{{ $t('customer.phone') }}</text>
        <view class="input-view">
          <input
            ref="phone"
            v-model="customer.phone"
            type="digit"
            :class="['input-text', validation.phone ? 'input-error' : '']"
            @input="validation.phone = null"
          />
        </view>
        <text
          v-for="(message, index) in validation.phone || []"
          :key="index"
          class="validation-message"
          >{{ $t(message) }}</text
        >
        <view v-if="isPhoneExist" class="call-small" @click.stop="call">
          <uni-icons type="phone-filled" color="#118C3C" size="32" />
        </view>
      </view>

      <view class="form-item" @click="$refs.email.focus()">
        <text class="input-label">{{ $t('customer.email') }}</text>
        <input
          ref="email"
          v-model="customer.email"
          type="text"
          :class="['input-text', validation.email ? 'input-error' : '']"
          @input="validation.email = null"
        />
        <text
          v-for="(message, index) in validation.email || []"
          :key="index"
          class="validation-message"
          >{{ $t(message) }}</text
        >
      </view>

      <view class="form-item" @click="$refs.notes.focus()">
        <text class="input-label">{{ $t('customer.notes') }}</text>
        <textarea ref="notes" v-model="customer.notes" class="input-textarea" />
      </view>

      <view v-if="existingCustomer">
        <view v-if="customer.chatId" class="form-item">
          <text class="input-label">{{ $t('customer.share-tlg-text-subscribed') }}</text>
          <button class="share-button" @click="shareTlgLink">
            <text style="font-size: 30rpx">{{ $t('customer.reshare-tlg-link') }}</text>
          </button>
        </view>
        <view v-else class="form-item">
          <button class="share-button" @click="shareTlgLink">
            <text style="font-size: 30rpx">{{ $t('customer.share-tlg-link') }}</text>
          </button>
          <text class="input-label">{{ $t('customer.share-tlg-text') }}</text>
        </view>
      </view>

      <view class="flex-row">
        <view>
          <checkbox :checked="customer.sendConfirmationSms" color="#118C3C" @click="toggleSendSms" />
        </view>
        <view class="flex-one margin-left-sm" @click="toggleSendSms">
          <text class="form-list-title">{{ $t('customer.send-confirmation-sms') }}</text>
        </view>
      </view>
      <view><text class="input-label">{{ sendSmsDescription }}</text></view>

      <button v-if="existingCustomer" class="delete-button" type="warn" @click.stop="deleteCustomer">
        {{ $t('common.delete') }}
      </button>
    </form>

    <uni-popup ref="deleteCustomerPopup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ modalMessageText }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="doDelete">{{ $t('customer.delete') }}</text>
          <text class="modal-dialog-button" @click="doCancelDelete">{{ $t('common.cancel') }}</text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import validate from 'validate.js'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import { useCustomerStore } from '@/stores/customer'
import { useReservationStore } from '@/stores/reservation'
import { sendSms, shareText } from '@/plugins/native'
import { constraints } from '@/validation/customer.js'

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'

/**
 * Ported from vegetable.mobile.vue/pages/customer/edit.nvue.
 *
 * Changes:
 *  - `plus.messaging` / `plus.share` in `shareTlgLink` → `sendSms()` /
 *    `shareText()` from plugins/native.js
 *  - the validation messages no longer carry `v-if` and `v-for` on one element
 *    (Vue 3 reverses their precedence) — see the same note in service/edit
 *  - `sendSms()` the method is renamed `toggleSendSms`; it toggles the
 *    "send a confirmation SMS" flag and has nothing to do with sending one,
 *    and the old name now collides with the native helper
 *  - the lastName field's error class read `validation.lastname` (lowercase n)
 *    while its handler cleared `validation.lastName`, so that field never
 *    turned red; corrected to `lastName`
 *  - `bubble="true"`, `<div>`, and the unused `moment` / `renderNullableDate`
 *    methods are gone
 *  - `activeReservationCount` is guarded for the new-customer case, where
 *    `customer.id` is undefined
 */
export default {
  components: { uniNavBar, uniIcons, uniPopup },
  data() {
    return {
      customer: {},
      backup: {},
      validation: {}
    }
  },
  computed: {
    ...mapState(useCustomerStore, ['getCustomerById']),
    ...mapState(useReservationStore, ['getActiveReservationsByCustomer']),

    navText() {
      if (!this.customer) return this.$t('common.loading')
      if (!this.customer.firstName && !this.customer.lastName) return this.$t('customer.new')
      const full = `${this.customer.firstName || ''} ${this.customer.lastName || ''}`
      return full.replace(/(.{20})..+/, '$1…')
    },
    sendSmsDescription() {
      return this.customer?.chatId
        ? this.$t('customer.send-confirmation-sms-description')
        : this.$t('customer.send-confirmation-sms-description-no-chatId')
    },
    existingCustomer() {
      return Boolean(this.customer.id) && this.customer.id !== EMPTY_GUID
    },
    isPhoneExist() {
      return this.existingCustomer && Boolean(this.customer.phone?.length)
    },
    activeReservationCount() {
      return this.existingCustomer
        ? this.getActiveReservationsByCustomer(this.customer.id).length
        : 0
    },
    modalMessageText() {
      if (!this.activeReservationCount) return this.$t('customer.areyousurefordelete')
      return `${this.$t('customer.areyousurefordelete')}\n${this.$t(
        'customer.activereservationalert'
      )}${this.activeReservationCount}`
    }
  },
  onLoad(option) {
    const customers = useCustomerStore()
    if (option.id) {
      this.customer = { ...customers.getCustomerById(option.id) }
      this.backup = { ...this.customer }
    } else {
      customers.getEmptyCustomer().then((result) => {
        this.customer = result || {}
        this.customer.sendConfirmationSms = true
      })
    }
  },
  methods: {
    navigateBack() {
      if (this.existingCustomer && JSON.stringify(this.backup) !== JSON.stringify(this.customer)) {
        useCustomerStore().fetchCustomers()
      }
      uni.navigateBack()
    },

    save() {
      if (!this.validate()) return

      const customers = useCustomerStore()
      if (this.existingCustomer) {
        customers.updateCustomer({ customerId: this.customer.id, customer: this.customer })
      } else {
        customers.createCustomer(this.customer).then((result) => uni.$emit('customer:created', result))
      }
      uni.navigateBack()
    },

    /** Sends the Telegram invite by SMS, or via the share sheet if no number. */
    async shareTlgLink() {
      const link = await useCustomerStore().getShareLink(this.customer.id)
      if (!link) return

      const message = this.$t('customer.share-tlg-invite-message')
      if (this.customer.phone) {
        sendSms({ to: this.customer.phone, body: message + link })
      } else {
        shareText({ content: message, href: link })
      }
    },

    deleteCustomer() {
      this.$refs.deleteCustomerPopup.open()
    },

    async doDelete() {
      await useCustomerStore().deleteCustomer(this.customer.id)
      useReservationStore().fetchReservations()
      this.$refs.deleteCustomerPopup.close()
      uni.navigateBack()
    },

    doCancelDelete() {
      this.$refs.deleteCustomerPopup.close()
    },

    call() {
      uni.makePhoneCall({ phoneNumber: this.customer.phone })
    },

    /** validate.js treats empty strings as values, so blanks are stripped first. */
    validate() {
      const populated = Object.entries(this.customer).reduce((accumulator, [key, value]) => {
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

    toggleSendSms() {
      this.customer.sendConfirmationSms = !this.customer.sendConfirmationSms
    }
  }
}
</script>

<style lang="scss" scoped>
.delete-button {
  background-color: $uni-color-error;
  border-radius: 18rpx;
}

.share-button {
  background-color: $theme-blue;
  height: 90rpx;
}

.call-small {
  width: 100rpx;
  height: 75rpx;
  border-radius: $uni-border-radius-circle;
  color: white;
  text-align: center;
  position: absolute;
  top: 15rpx;
  right: 0;
}
</style>
