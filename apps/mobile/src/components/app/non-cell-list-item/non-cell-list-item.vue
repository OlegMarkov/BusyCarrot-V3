<template>
  <view
    class="nv uni-list-item"
    :class="disabled ? 'uni-list-item--disabled' : ''"
    :hover-class="disabled || showSwitch ? '' : 'uni-list-item--hover'"
  >
    <view
      class="uni-list-item__container"
      :class="hideSeparator ? '' : 'uni-list-item__container_border'"
      @click="$emit('click')"
      @longpress="$emit('longpress')"
    >
      <view v-if="thumb" class="uni-list-item__icon">
        <image :src="thumb" class="uni-list-item__icon-img" />
      </view>
      <view v-else-if="showExtraIcon" class="uni-list-item__icon">
        <uni-icons
          :color="extraIcon.color"
          :size="extraIcon.size"
          :type="extraIcon.type"
          class="uni-icon-wrapper"
        />
      </view>
      <view v-else-if="showSpecialIcon" class="uni-list-item__icon">
        <uni-icons
          :color="specialIcon.color"
          :size="specialIcon.size"
          :type="specialIcon.type"
          class="uni-icon-wrapper"
        />
      </view>

      <view class="uni-list-item__content">
        <slot />
        <text class="uni-list-item__content-title">{{ title }}</text>
        <text v-if="showExtraNote" class="uni-list-item__content-extra-note">{{ extraNote }}</text>
        <text v-if="note" class="uni-list-item__content-note">{{ note }}</text>
      </view>

      <view v-if="showBadge || showRightIcon || showSwitch" class="uni-list-item__extra">
        <text v-if="rightText" class="uni-list-item__extra-text">{{ rightText }}</text>
        <uni-badge v-if="showBadge" :type="badgeType" :text="badgeText" />
        <switch
          v-if="showSwitch"
          :disabled="disabled"
          :checked="switchChecked"
          @change="$emit('switchChange', $event.detail)"
        />
        <uni-icons
          v-if="showRightIcon"
          :size="rightIcon.size"
          class="uni-icon-wrapper"
          :color="rightIcon.color"
          :type="rightIcon.type"
        />
      </view>
    </view>
  </view>
</template>

<script>
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import uniBadge from '@/components/ui/uni-badge/uni-badge.vue'

/**
 * Ported from
 * vegetable.mobile.vue/components/app/non-cell-list-item/non-cell-list-item.vue.
 *
 * The list row used by the customer / service / schedule / notification lists.
 * Compared with ui/uni-list-item it adds `longpress`, a struck-through
 * `extraNote` (for a service's pre-discount price), a configurable right icon
 * and `hideSeparator`, and it drops the `<cell>` wrapper — hence the name.
 *
 * Changes: `inject: ['list']` and the `isFirstChild` data field are gone. This
 * component has no `mounted` hook, so `isFirstChild` was never set to anything
 * but false, and the injection had no matching provider at several call sites —
 * which Vue 2 ignored silently but Vue 3 warns about.
 */
export default {
  name: 'NonCellListItem',
  components: { uniIcons, uniBadge },
  emits: ['click', 'longpress', 'switchChange'],
  props: {
    title: { type: String, default: '' },
    note: { type: String, default: '' },
    extraNote: { type: String, default: '' },
    showExtraNote: { type: [Boolean, String], default: false },
    disabled: { type: [Boolean, String], default: false },
    showRightIcon: { type: [Boolean, String], default: true },
    showBadge: { type: [Boolean, String], default: false },
    showSwitch: { type: [Boolean, String], default: false },
    switchChecked: { type: [Boolean, String], default: false },
    badgeText: { type: String, default: '' },
    badgeType: { type: String, default: 'success' },
    rightText: { type: String, default: '' },
    thumb: { type: String, default: '' },
    showExtraIcon: { type: [Boolean, String], default: false },
    showSpecialIcon: { type: [Boolean, String], default: false },
    hideSeparator: { type: [Boolean, String], default: false },
    rightIcon: {
      type: Object,
      default() {
        return { type: 'arrowright', color: '#333', size: 20 }
      }
    },
    extraIcon: {
      type: Object,
      default() {
        return { type: 'contact', color: '#000000', size: 20 }
      }
    },
    specialIcon: {
      type: Object,
      default() {
        return { type: 'contact', color: '#000000', size: 20 }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
$list-item-pd: $uni-spacing-col-lg $uni-spacing-row-lg;

.uni-list-item {
  font-size: $uni-font-size-lg;
  position: relative;
  flex-direction: column;
  justify-content: space-between;
  padding-left: $uni-spacing-row-lg;
}

.uni-list-item--disabled {
  opacity: 0.3;
}

.uni-list-item--hover {
  background-color: $uni-bg-color-hover;
}

.uni-list-item__container {
  position: relative;
  display: flex;
  flex-direction: row;
  padding: $list-item-pd;
  padding-left: 0;
  flex: 1;
  justify-content: space-between;
  align-items: center;
}

.uni-list-item__container_border {
  border-bottom-color: $uni-border-color;
  border-bottom-style: solid;
  border-bottom-width: 0.5px;
}

.uni-list-item__content {
  display: flex;
  flex: 1;
  overflow: hidden;
  flex-direction: column;
  color: #3b4144;
  padding-top: $uni-spacing-col-base;
  padding-bottom: $uni-spacing-col-base;
}

.uni-list-item__content-title {
  font-size: $uni-font-size-base;
  color: #333;
  overflow: hidden;
}

.uni-list-item__content-note {
  margin-top: 6rpx;
  color: $uni-text-color-grey;
  font-size: $uni-font-size-sm;
  overflow: hidden;
}

.uni-list-item__content-extra-note {
  text-decoration: line-through;
  font-size: $uni-font-size-sm;
  color: #333;
  overflow: hidden;
}

.uni-list-item__extra {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
}

.uni-list-item__extra-text {
  color: $uni-text-color-grey;
  font-size: $uni-font-size-sm;
}

.uni-list-item__icon {
  margin-right: 18rpx;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

.uni-list-item__icon-img {
  height: $uni-img-size-base;
  width: $uni-img-size-base;
}
</style>
