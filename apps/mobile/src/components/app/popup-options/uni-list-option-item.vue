<template>
  <view
    class="nv uni-list-item"
    :class="disabled ? 'uni-list-item--disabled' : ''"
    :hover-class="disabled ? '' : 'uni-list-item--hover'"
    @click="onClick"
  >
    <view class="uni-list-item__container" :class="{ 'uni-list-item--first': isFirstChild }">
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
      <view class="uni-list-item__content">
        <slot />
        <text class="uni-list-item__content-title">{{ title }}</text>
        <text v-if="note" class="uni-list-item__content-note">{{ note }}</text>
      </view>
      <view v-if="showArrow" class="uni-list-item__extra">
        <uni-icons :size="20" class="uni-icon-wrapper" color="#333" type="arrowright" />
      </view>
    </view>
  </view>
</template>

<script>
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'

/**
 * Ported from
 * vegetable.mobile.vue/components/app/popup-options/uni-list-option-item.vue.
 *
 * One row of an action sheet. Trimmed to what the call sites actually pass:
 * the badge, switch and rightText branches were never used on an options row,
 * so `showBadge` / `showSwitch` / `switchChecked` / `badgeText` / `badgeType` /
 * `rightText` and the `switchChange` event are gone. `ui/uni-list-item` still
 * has all of them for the screens that do use them.
 *
 * `uni.showTabBar()` stays in the click handler: the sheet hides the tab bar
 * while open, and picking a row dismisses it without going through the mask.
 */
export default {
  name: 'UniListOptionItem',
  components: { uniIcons },
  emits: ['click'],
  props: {
    title: { type: String, default: '' },
    note: { type: String, default: '' },
    disabled: { type: [Boolean, String], default: false },
    showArrow: { type: [Boolean, String], default: true },
    thumb: { type: String, default: '' },
    showExtraIcon: { type: [Boolean, String], default: false },
    extraIcon: {
      type: Object,
      default() {
        return { type: 'contact', color: '#000000', size: 20 }
      }
    }
  },
  inject: ['list'],
  data() {
    return {
      isFirstChild: false
    }
  },
  mounted() {
    if (!this.list.firstChildAppend) {
      this.list.firstChildAppend = true
      this.isFirstChild = true
    }
  },
  methods: {
    onClick() {
      uni.showTabBar()
      this.$emit('click')
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
  border-bottom-color: $uni-border-color;
  border-bottom-style: solid;
  border-bottom-width: 0.5px;
}

.uni-list-item--first {
  border-top-width: 0px;
}

.uni-list-item--first:after {
  height: 0px;
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

.uni-list-item__extra {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
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
