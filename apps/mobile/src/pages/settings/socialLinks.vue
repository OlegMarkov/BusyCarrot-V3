<template>
  <view class="nv view">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.socialLinks')"
      @clickLeft="navigateBack"
    />

    <form class="form">
      <view v-for="socialLink in socialNetworks" :key="socialLink.type" class="form-item">
        <text class="input-label">
          {{ $t('general-settings.social-link-title-' + socialLink.type) }}
        </text>
        <input v-model="socialLink.url" class="input-text" type="text" />
      </view>
    </form>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import { useOwnerStore } from '@/stores/owner'

/**
 * Ported from vegetable.mobile.vue/pages/settings/socialLinks.nvue.
 * Edits `owner.socialNetworks` in place, like the address page.
 *
 * The `v-for` had no `:key`; it keys on `type` now, which is unique per row.
 */
export default {
  components: { uniNavBar },
  computed: {
    ...mapState(useOwnerStore, ['owner']),
    socialNetworks() {
      return this.owner?.socialNetworks || []
    }
  },
  methods: {
    navigateBack() {
      uni.navigateBack()
    }
  }
}
</script>
