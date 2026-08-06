<template>
  <view class="nv select-list-item" hover-class="select-list-item--hover" @click="$emit('click')">
    <view class="select-list-item__container">
      <view class="select-list-item__content">
        <slot />
        <text class="select-list-item__content-title">{{ title }}</text>
        <text v-if="note" class="select-list-item__content-note">{{ note }}</text>
      </view>
      <view class="select-list-item__extra">
        <uni-icons
          v-if="selected"
          :size="20"
          class="uni-icon-wrapper"
          color="#333"
          type="checkmarkempty"
        />
      </view>
    </view>
  </view>
</template>

<script>
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'

/**
 * Ported from vegetable.mobile.vue/components/app/items-item.nvue.
 * One row of a pick list, with a checkmark when selected. The nvue `<cell>`
 * wrapper is gone; props and the `click` event are unchanged.
 */
export default {
  name: 'AppItemsItem',
  components: { uniIcons },
  emits: ['click'],
  props: {
    title: {
      type: String,
      default: ''
    },
    note: {
      type: String,
      default: ''
    },
    selected: {
      type: [Boolean, String],
      default: false
    }
  }
}
</script>

<style lang="scss" scoped>
$list-item-pd: $uni-spacing-col-lg $uni-spacing-row-lg;

.select-list-item {
  font-size: $uni-font-size-lg;
  position: relative;
  flex-direction: column;
  justify-content: space-between;
  padding-left: $uni-spacing-row-lg;
}

.select-list-item--hover {
  background-color: $uni-bg-color-hover;
}

.select-list-item__container {
  position: relative;
  flex-direction: row;
  padding: $list-item-pd;
  padding-left: 0;
  flex: 1;
  justify-content: space-between;
  align-items: center;
  border-bottom-color: $uni-border-color;
  border-bottom-style: solid;
  border-bottom-width: 0.5px;
}

.select-list-item__content {
  flex: 1;
  overflow: hidden;
  flex-direction: column;
  color: #3b4144;
  padding-top: $uni-spacing-col-base;
  padding-bottom: $uni-spacing-col-base;
}

.select-list-item__content-title {
  font-size: $uni-font-size-base;
  color: #333;
  overflow: hidden;
}

.select-list-item__content-note {
  margin-top: 6rpx;
  color: $uni-text-color-grey;
  font-size: $uni-font-size-sm;
  overflow: hidden;
}

.select-list-item__extra {
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
}
</style>
