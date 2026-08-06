<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="pageTitle"
      @clickLeft="navigateBack"
    />
    <form class="form">
      <view class="form-item" @click="navigateLanguages">
        <text class="input-label">{{ $t('general-settings.language') }}</text>
        <view class="flex-row form-list">
          <view><text class="form-list-title">{{ language }}</text></view>
          <view>
            <uni-icons :size="20" class="uni-icon-wrapper" color="#333" type="arrowright" />
          </view>
        </view>
      </view>
    </form>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import { useSettingsStore } from '@/stores/settings'

/**
 * Ported from vegetable.mobile.vue/pages/settings/general.nvue.
 *
 * Changes beyond the renderer swap:
 *  - the `t()` computed wrapping `getApp().globalData.$t` is gone; templates
 *    call `$t` directly (vue-i18n v9 legacy mode)
 *  - vuex mapGetters(['owner','language']) → pinia mapState; `owner` was mapped
 *    but never used, so it is dropped
 *  - `uniList` / `uniListItem` were imported and registered but never rendered;
 *    `uniIcons` was rendered without being imported, resolving only because the
 *    original relied on global component registration
 *  - the `computed` block was declared twice (the second silently replaced the
 *    first); it is one block now
 *  - empty `@submit=""` / `@reset=""` handlers on the form removed
 */
export default {
  components: { uniNavBar, uniIcons },
  computed: {
    ...mapState(useSettingsStore, ['language']),
    pageTitle() {
      return this.$t('general-settings.general')
    }
  },
  methods: {
    navigateLanguages() {
      uni.navigateTo({ url: '/pages/settings/languages' })
    },
    navigateBack() {
      uni.navigateBack()
    }
  }
}
</script>
