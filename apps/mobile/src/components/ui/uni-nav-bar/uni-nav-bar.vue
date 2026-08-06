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
          <view
            v-if="leftText.length"
            class="uni-navbar-btn-text uni-navbar__content_view"
            :class="{ 'uni-navbar-btn-icon-left': !leftIcon.length }"
          >
            <text :style="{ color: color, fontSize: '14px' }">{{ leftText }}</text>
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
          <view
            v-if="rightText.length && !rightIcon.length"
            class="uni-navbar-btn-text uni-navbar__content_view"
          >
            <text class="uni-nav-bar-right-text">{{ rightText }}</text>
          </view>
          <slot name="right" />
        </view>
      </view>
    </view>

    <view v-if="fixed" class="uni-navbar__placeholder">
      <view v-if="statusBar" :style="{ height: statusBarHeight }" />
      <view class="uni-navbar__placeholder-view" />
    </view>
  </view>
</template>

<script>
import uniIcons from '../uni-icons/uni-icons.vue'

/**
 * Ported from vegetable.mobile.vue/components/uni-nav-bar/uni-nav-bar.vue.
 *
 * The separate uni-status-bar component was a four-line wrapper around
 * `uni.getSystemInfoSync().statusBarHeight`; it is inlined here, which is the
 * only place it was ever used. The `uni.report('title')` analytics hook is gone.
 * Props, both slots and the clickLeft / clickRight events are unchanged.
 */
export default {
  name: 'UniNavBar',
  components: { uniIcons },
  emits: ['clickLeft', 'clickRight'],
  props: {
    title: { type: String, default: '' },
    leftText: { type: String, default: '' },
    rightText: { type: String, default: '' },
    leftIcon: { type: String, default: '' },
    rightIcon: { type: String, default: '' },
    fixed: { type: [Boolean, String], default: false },
    color: { type: String, default: '#000000' },
    backgroundColor: { type: String, default: '#FFFFFF' },
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
$nav-height: 44px;

.uni-nav-bar-text {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 17px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
}

.uni-nav-bar-right-text {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-accent-700);
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

/* Industry: the bar is separated by a hairline divider, not a 0.5px iOS rule. */
.uni-navbar--border:after {
  background-color: var(--color-divider) !important;
  transform: none !important;
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
  border-bottom-width: 1rpx;
  border-bottom-style: solid;
  border-bottom-color: $uni-border-color;
}
</style>
