<template>
  <view
    class="nv subscription-item subscription-item--radius"
    :class="{
      'subscription-item--disabled': disabled,
      'subscription-item--border-selected': isChecked
    }"
    :hover-class="disabled ? '' : 'subscription-item--hover'"
    @click="$emit('click')"
  >
    <view class="subscription-item__container">
      <view class="subscription-item__content">
        <view class="subscription-item__content-title">
          <view style="flex-direction: row">
            <text class="subscription-item__title">{{ title }}</text>
            <uni-badge v-if="status === 'active'" type="success" :text="$t('subscription.active')" />
            <uni-badge
              v-if="status === 'expired'"
              type="warning"
              :text="$t('subscription.expired')"
            />
          </view>
          <uni-icons :type="isChecked ? 'checkbox' : 'circle'" size="25" />
        </view>

        <text class="subscription-item__subtitle">{{ subtitle }}</text>
        <text v-if="note" class="subscription-item__content-note">{{ note }}</text>

        <view v-if="isChecked" class="subscription-item__delimiter" />
        <view v-if="isChecked" class="subscr-show">
          <slot name="description" />
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import uniBadge from '@/components/ui/uni-badge/uni-badge.vue'

/**
 * Ported from vegetable.mobile.vue/components/app/subscription-item.vue.
 *
 * One selectable plan card, expanding to show its feature list when picked.
 *
 * Changes:
 *  - `:type="[isChecked ? 'checkbox' : 'circle']"` passed a one-element *array*
 *    to a `String` prop. Vue 2 coerced it via toString (`"checkbox"` happens to
 *    survive that); Vue 3 logs a prop type warning. It is a plain string now.
 *  - the expand/collapse used `v-show` plus a fixed `height: 300rpx` for the
 *    open state and a `subscr-hide` class for the closed one, alongside a `v-if`
 *    on the same content. Only the `v-if` branch is kept — the hidden state was
 *    unreachable, since the wrapper was already conditionally rendered.
 *  - `uniBadge` was used in the template but never imported or registered; it
 *    resolved only through easycom
 *  - the `description` prop and the `isFirstChild` data field were never read
 */
export default {
  name: 'SubscriptionItem',
  components: { uniIcons, uniBadge },
  emits: ['click'],
  props: {
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    note: { type: String, default: '' },
    disabled: { type: [Boolean, String], default: false },
    isChecked: { type: [Boolean, String], default: false },
    status: { type: String, default: 'none' }
  }
}
</script>

<style lang="scss" scoped>
$list-item-pd: $uni-spacing-col-lg $uni-spacing-row-lg;

.subscr-show {
  transition: height 0.25s ease-in;
}

.subscription-item {
  font-size: $uni-font-size-lg;
  position: relative;
  flex-direction: column;
  justify-content: space-between;
  padding-left: $uni-spacing-row-lg;
}

.subscription-item--border-selected {
  border-color: $theme-blue;
  border-style: solid;
  border-width: 2px;
}

.subscription-item--radius {
  margin: 10rpx 10rpx;
  border-radius: 28rpx;
  background-color: white;
  box-shadow: 0 0 10rpx #ccc;
}

.subscription-item--disabled {
  opacity: 0.3;
}

.subscription-item--hover {
  background-color: $uni-bg-color-hover;
}

.subscription-item__container {
  position: relative;
  display: flex;
  flex-direction: row;
  padding: $list-item-pd;
  padding-left: 0;
  flex: 1;
  justify-content: space-between;
  align-items: center;
}

.subscription-item__content {
  display: flex;
  flex: 1;
  overflow: hidden;
  flex-direction: column;
  color: #3b4144;
  padding-top: $uni-spacing-col-base;
  padding-bottom: $uni-spacing-col-base;
}

.subscription-item__content-title {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.subscription-item__title {
  font-size: $uni-font-size-xlg;
  color: #333;
  font-weight: bold;
  overflow: hidden;
  margin-right: 20rpx;
}

.subscription-item__subtitle {
  font-size: $uni-font-size-lg;
  color: #333;
  overflow: hidden;
}

.subscription-item__content-note {
  margin-top: 6rpx;
  color: $uni-text-color-grey;
  font-size: $uni-font-size-sm;
  overflow: hidden;
}

.subscription-item__delimiter {
  border-bottom-color: $uni-border-color;
  border-bottom-style: solid;
  border-bottom-width: 0.5px;
  margin-top: 20rpx;
  margin-bottom: 20rpx;
}
</style>
