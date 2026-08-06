<template>
  <view class="nv view">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.account')"
      @clickLeft="navigateBack"
    />
    <user />
  </view>
</template>

<script>
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import user from '@/components/app/user.vue'

/**
 * Ported from vegetable.mobile.vue/pages/settings/account.nvue.
 * A nav bar around components/app/user.
 *
 * The original declared `data: function(){}` with no return — Vue 2 warned and
 * carried on, Vue 3 throws. There is no local state, so the option is dropped.
 */
export default {
  components: { uniNavBar, user },
  methods: {
    navigateBack() {
      uni.navigateBack()
    }
  }
}
</script>
