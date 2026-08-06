<template>
  <view class="uni-navbar">
    <view
      class="uni-navbar__content"
      :class="{
        'uni-navbar--fixed': fixed,
        'uni-navbar--shadow': shadow,
        'uni-navbar--border': border
      }"
      :style="{ 'background-color': backgroundColor }"
    >
      <view v-if="statusBar" class="uni-navbar__status-bar" :style="{ height: statusBarHeight }" />
      <view
        class="uni-navbar__header uni-navbar__content_view"
        :style="{ color: color, backgroundColor: backgroundColor }"
      >
        <view
          class="uni-navbar__header-btns uni-navbar__header-btns-left uni-navbar__content_view"
          @tap="$emit('clickLeft')"
        >
          <view v-if="leftIcon.length" class="uni-navbar__content_view">
            <uni-icons :color="color" :type="leftIcon" size="24" />
          </view>
          <slot name="left" />
        </view>

        <view class="uni-navbar__header-container uni-navbar__content_view">
          <view v-if="title.length" class="uni-navbar__header-container-inner uni-navbar__content_view">
            <text class="uni-nav-bar-text" :style="{ color: color }">{{ title }}</text>
          </view>
          <slot />
        </view>

        <view
          class="uni-navbar__header-btns uni-navbar__content_view"
          :class="title.length ? 'uni-navbar__header-btns-right' : ''"
          @tap="$emit('clickRight')"
        >
          <view v-if="rightIcon.length" class="uni-navbar__content_view">
            <uni-icons :color="color" :type="rightIcon" size="24" />
          </view>
          <slot name="right" />
        </view>
      </view>

      <!-- The reason this exists separately from ui/uni-nav-bar: the dashboard
           drops the swipeable month calendar in below the header row. -->
      <slot name="expandable" />
    </view>

    <view v-if="fixed" class="uni-navbar__placeholder">
      <view v-if="statusBar" :style="{ height: statusBarHeight }" />
      <view class="uni-navbar__placeholder-view" />
    </view>
  </view>
</template>

<script>
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'

/**
 * Ported from vegetable.mobile.vue/components/app/custom-nav-bar/custom-nav-bar.vue,
 * which was a copy of uni-nav-bar with one addition: the `expandable` slot.
 *
 * The `leftText` / `rightText` props are dropped — this component's only consumer
 * (pages/index) fills the left and right areas through slots, and the text
 * branches were never rendered. Inlined uni-status-bar as in ui/uni-nav-bar.
 */
export default {
  name: 'CustomNavBar',
  components: { uniIcons },
  emits: ['clickLeft', 'clickRight'],
  props: {
    title: { type: String, default: '' },
    leftIcon: { type: String, default: '' },
    rightIcon: { type: String, default: '' },
    fixed: { type: [Boolean, String], default: false },
    color: { type: String, default: 'var(--color-text)' },
    // The bar sits on the page ground, not on white: Industry has no raised
    // chrome. Tokens rather than literals so a re-theme carries.
    backgroundColor: { type: String, default: 'var(--color-bg)' },
    statusBar: { type: [Boolean, String], default: false },
    shadow: { type: [Boolean, String], default: false },
    border: { type: [Boolean, String], default: true }
  },
  data() {
    return {
      statusBarHeight: `${uni.getSystemInfoSync().statusBarHeight}px`
    }
  }
}
</script>

<style lang="scss" scoped>
// 48px is the design's nav height.
$nav-height: 48px;

.uni-nav-bar-text {
  font-size: 34rpx;
}

.uni-navbar__content {
  position: relative;
  background-color: var(--color-bg);
  overflow: hidden;
}

.uni-navbar__status-bar {
  width: 750rpx;
}

.uni-navbar__content_view {
  display: flex;
  align-items: center;
  flex-direction: row;
}

.uni-navbar__header {
  display: flex;
  flex-direction: row;
  height: $nav-height;
  line-height: $nav-height;
  font-size: 16px;
}

.uni-navbar__header-btns {
  display: flex;
  flex-wrap: nowrap;
  width: 120rpx;
  padding: 0 6px;
  justify-content: center;
  align-items: center;
}

.uni-navbar__header-btns-left {
  display: flex;
  width: 150rpx;
  padding-left: 30rpx;
  justify-content: flex-start;
}

.uni-navbar__header-btns-right {
  display: flex;
  width: 150rpx;
  padding-right: 30rpx;
  justify-content: flex-end;
}

.uni-navbar__header-container {
  flex: 1;
}

.uni-navbar__header-container-inner {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  font-size: $uni-font-size-base;
}

.uni-navbar__placeholder-view {
  height: $nav-height;
}

.uni-navbar--fixed {
  position: fixed;
  z-index: 998;
}

.uni-navbar--shadow {
  box-shadow: 0 1px 6px #ccc;
}

.uni-navbar--border {
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: var(--color-divider);
}
</style>
