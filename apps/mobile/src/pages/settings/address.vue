<template>
  <view class="nv view">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.address')"
      @clickLeft="navigateBack"
    />

    <form v-if="address" class="form">
      <view v-for="field in addressFields" :key="field.key" class="form-item">
        <text class="input-label">{{ $t(field.label) }}</text>
        <input v-model="address[field.key]" class="input-text" type="text" />
      </view>

      <view v-if="phoneNumber" class="form-item">
        <text class="input-label">{{ $t('general-settings.address-phonenumber') }}</text>
        <input v-model="phoneNumber.number" class="input-text" type="text" />
      </view>
    </form>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import { useOwnerStore } from '@/stores/owner'

const ADDRESS_FIELDS = [
  { key: 'description', label: 'general-settings.address-description' },
  { key: 'state', label: 'general-settings.address-state' },
  { key: 'city', label: 'general-settings.address-city' },
  { key: 'postalCode', label: 'general-settings.address-postalcode' },
  { key: 'street', label: 'general-settings.address-street' },
  { key: 'unit', label: 'general-settings.address-unit' }
]

/**
 * Ported from vegetable.mobile.vue/pages/settings/address.nvue.
 *
 * Edits the owner's first address in place — the original bound every field
 * directly to `owner.addresses[0]`, and there is no save button; the store
 * object is the form model, persisted from wherever the owner is next updated.
 *
 * Changes: the six repeated `form-item` blocks are a `v-for`, and both
 * `addresses[0]` and `phoneNumbers[0]` are guarded. The original indexed into
 * them unconditionally, so opening this page for an owner with no address (or
 * before the owner loaded) threw while rendering.
 */
export default {
  components: { uniNavBar },
  data() {
    return {
      addressFields: ADDRESS_FIELDS
    }
  },
  computed: {
    ...mapState(useOwnerStore, ['owner']),
    address() {
      return this.owner?.addresses?.[0]
    },
    phoneNumber() {
      return this.owner?.phoneNumbers?.[0]
    }
  },
  methods: {
    navigateBack() {
      uni.navigateBack()
    }
  }
}
</script>
