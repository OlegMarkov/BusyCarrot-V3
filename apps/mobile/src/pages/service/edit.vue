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
      <view class="form-item" @click="$refs.title.focus()">
        <text class="input-label">{{ $t('service.title') }}</text>
        <input
          ref="title"
          v-model="service.title"
          type="text"
          :class="['input-text', validation.title ? 'input-error' : '']"
          @input="validation.title = null"
        />
        <text v-for="(message, index) in validation.title || []" :key="index" class="validation-message">
          {{ $t(message) }}
        </text>
      </view>

      <view class="form-item" @click="$refs.description.focus()">
        <text class="input-label">{{ $t('service.description') }}</text>
        <input
          ref="description"
          v-model="service.description"
          type="text"
          :class="['input-text', validation.description ? 'input-error' : '']"
          @input="validation.description = null"
        />
        <text
          v-for="(message, index) in validation.description || []"
          :key="index"
          class="validation-message"
        >
          {{ $t(message) }}
        </text>
      </view>

      <view class="form-item" @click="navigateServiceDuration">
        <text class="input-label">{{ $t('service.durationInMinutes') }}</text>
        <view class="flex-row form-list">
          <view><text class="form-list-title">{{ durationText }}</text></view>
          <view><uni-icons :size="20" class="uni-icon-wrapper" color="#333" type="arrowright" /></view>
        </view>
        <text
          v-for="(message, index) in validation.durationInMinutes || []"
          :key="index"
          class="validation-message"
        >
          {{ $t(message) }}
        </text>
      </view>

      <view class="form-item" @click="$refs.cost.focus()">
        <text class="input-label">{{ $t('service.cost') }}</text>
        <input
          ref="cost"
          v-model.number="service.cost"
          type="number"
          :class="['input-text', validation.cost ? 'input-error' : '']"
          @input="validation.cost = null"
        />
        <text v-for="(message, index) in validation.cost || []" :key="index" class="validation-message">
          {{ $t(message) }}
        </text>
      </view>

      <button v-if="existingService" class="delete-button" type="warn" @click="deleteService">
        {{ $t('common.delete') }}
      </button>
    </form>

    <uni-popup ref="deleteServicePopup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ modalMessageText }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="doDelete">{{ $t('service.delete') }}</text>
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
import { useServiceStore } from '@/stores/service'
import { useReservationStore } from '@/stores/reservation'
import { timeConvert } from '@/plugins/helpers'
import { constraints } from '@/validation/services.js'

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'

/**
 * Ported from vegetable.mobile.vue/pages/service/edit.nvue.
 *
 * Duration is picked on a separate page which reports back over `uni.$on`.
 *
 * Changes:
 *  - the validation messages had `v-if` and `v-for` on the same element. Vue 2
 *    ran `v-for` first; Vue 3 reverses the precedence, and having both is a
 *    warning either way. `v-for="… in validation.x || []"` covers both cases.
 *  - `deleteService()` was defined twice in `methods`. The first (delete
 *    immediately, no confirmation) was silently discarded by the second (open
 *    the confirm dialog); only the latter is kept.
 *  - `:placeholder="t.title"` and friends are gone — `t` was a function, so
 *    those bindings were always `undefined`
 *  - `uni.$off('update:serviceDuration')` now removes only this page's handler
 *    rather than every listener on that channel
 */
export default {
  components: { uniNavBar, uniIcons, uniPopup },
  data() {
    return {
      service: {},
      backup: {},
      validation: {}
    }
  },
  computed: {
    ...mapState(useServiceStore, ['getServiceById']),
    ...mapState(useReservationStore, ['getActiveReservationsByService']),

    navText() {
      if (!this.service) return this.$t('common.loading')
      if (!this.service.title) return this.$t('service.new')
      return this.service.title.replace(/(.{20})..+/, '$1…')
    },
    existingService() {
      return Boolean(this.service.id) && this.service.id !== EMPTY_GUID
    },
    durationText() {
      return timeConvert(this.service.durationInMinutes)
    },
    activeReservationCount() {
      return this.existingService
        ? this.getActiveReservationsByService(this.service.id).length
        : 0
    },
    modalMessageText() {
      if (!this.activeReservationCount) return this.$t('service.areyousurefordelete')
      return `${this.$t('service.areyousurefordelete')}\n${this.$t(
        'service.activereservationalert'
      )}${this.activeReservationCount}`
    }
  },
  onLoad(option) {
    const services = useServiceStore()

    if (option.id) {
      this.service = { ...services.getServiceById(option.id) }
      this.backup = { ...this.service }
    } else {
      services.getEmptyService().then((result) => {
        this.service = result || {}
      })
    }

    this.onDurationPicked = (data) => {
      this.service.durationInMinutes = parseInt(data.durationValue, 10)
    }
    uni.$on('update:serviceDuration', this.onDurationPicked)
  },
  onUnload() {
    uni.$off('update:serviceDuration', this.onDurationPicked)
  },
  methods: {
    navigateBack() {
      if (this.existingService && JSON.stringify(this.backup) !== JSON.stringify(this.service)) {
        useServiceStore().fetchServices()
      }
      uni.navigateBack()
    },

    save() {
      if (!this.validate()) return

      const services = useServiceStore()
      if (this.existingService) {
        services.updateService({ serviceId: this.service.id, service: this.service })
      } else {
        services.createService(this.service).then((result) => uni.$emit('service:created', result))
      }
      uni.navigateBack()
    },

    navigateServiceDuration() {
      uni.navigateTo({
        url: `/pages/service/serviceDuration?value=${this.service.durationInMinutes}`
      })
    },

    /** validate.js treats empty strings as values, so blanks are stripped first. */
    validate() {
      const populated = Object.entries(this.service).reduce((accumulator, [key, value]) => {
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

    deleteService() {
      this.$refs.deleteServicePopup.open()
    },

    async doDelete() {
      await useServiceStore().deleteService(this.service.id)
      useReservationStore().fetchReservations()
      this.$refs.deleteServicePopup.close()
      uni.navigateBack()
    },

    doCancelDelete() {
      this.$refs.deleteServicePopup.close()
    }
  }
}
</script>

<style lang="scss" scoped>
.delete-button {
  background-color: $uni-color-error;
  border-radius: 18rpx;
  position: fixed;
  bottom: $uni-spacing-row-base;
  left: $uni-spacing-col-xxlg;
  right: $uni-spacing-col-xxlg;
}
</style>
