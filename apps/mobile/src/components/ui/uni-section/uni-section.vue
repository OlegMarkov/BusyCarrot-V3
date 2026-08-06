<template>
  <view class="uni-section" :class="'type-' + type">
    <view v-if="type" class="uni-section__head">
      <view :class="type" class="uni-section__head-tag" />
    </view>
    <view class="uni-section__content">
      <text :class="{ distraction: !subTitle }" class="uni-section__content-title">{{ title }}</text>
      <text v-if="desc" class="uni-section__content-desc">{{ desc }}</text>
      <text v-if="subTitle" class="uni-section__content-sub">{{ subTitle }}</text>
    </view>
    <slot />
  </view>
</template>

<script>
/**
 * Ported from vegetable.mobile.vue/components/uni-section/uni-section.vue.
 * Dropped: the `<cell>` wrapper (nvue-only) and the stray `nvue` attribute on
 * the root view. The `uni.report('title')` watcher went too — it was DCloud
 * analytics, which this app does not use.
 */
export default {
  name: 'UniSection',
  props: {
    type: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: ''
    },
    subTitle: {
      type: String,
      default: ''
    },
    desc: {
      type: String,
      default: ''
    }
  }
}
</script>

<style lang="scss" scoped>
.uni-section {
  position: relative;
  display: flex;
  margin-top: 0px;
  flex-direction: row;
  align-items: center;
  padding: 0 2px;
  height: 44px;
  background-color: transparent;
  font-weight: normal;
}

.uni-section:after {
  position: absolute;
  bottom: 0;
  right: 0;
  left: 0;
  height: 1px;
  content: '';
  transform: none;
  background-color: var(--color-divider);
}

.type-day {
  background-color: transparent !important;
  border-bottom-width: 0px !important;
  width: 120rpx;
}

.uni-section__head {
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
}

.line {
  height: 12px;
  background-color: var(--color-accent);
  border-radius: 0;
  width: 2px;
}

.circle {
  width: 6px;
  height: 6px;
  border-radius: 0;
  background-color: var(--color-accent);
}

.uni-section__content {
  flex: 1;
  color: $uni-text-color;
}

/* Industry: a group head is a small tracked all-caps label, not body text. */
.uni-section__content-title {
  font-family: var(--font-body);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.distraction {
  flex-direction: row;
  align-items: center;
}

.uni-section__content-sub {
  font-family: var(--font-body);
  font-size: 11.5px;
  color: var(--color-neutral-600);
}
</style>
