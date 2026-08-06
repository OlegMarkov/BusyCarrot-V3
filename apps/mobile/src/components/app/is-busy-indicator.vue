<template>
  <view>
    <view v-if="loadall" class="loading">
      <text>{{ loadallTips }}</text>
    </view>
    <view v-else-if="loading" class="loading">
      <text>{{ loadingTips }}</text>
      <image
        src="@/static/loading.gif"
        mode="widthFix"
        :style="`width: ${iconSize}rpx; height: ${iconSize}rpx;`"
      />
    </view>
    <view v-else class="loading">
      <text>{{ defaultTips }}</text>
    </view>
  </view>
</template>

<script>
/**
 * Ported from vegetable.mobile.vue/components/app/is-busy-indicator.vue.
 * Unchanged apart from the legacy `upx` unit, which is the old alias for `rpx`.
 */
export default {
  name: 'IsBusyIndicator',
  props: {
    loading: { type: Boolean, default: false },
    loadall: { type: Boolean, default: false },
    defaultTips: { type: String, default: '' },
    loadingTips: { type: String, default: '' },
    loadallTips: { type: String, default: '' },
    iconSize: { type: Number, default: 60 }
  }
}
</script>

<style lang="scss" scoped>
.loading {
  align-items: center;
  justify-content: center;
  height: 80rpx;
  color: #050505;
  font-size: 26rpx;
}
</style>
