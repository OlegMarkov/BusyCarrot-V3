<template>
  <view
    class="uni-list-item"
    :class="{ 'uni-list-item--disabled': disabled, 'uni-list-item--radius': radiusView }"
    :hover-class="disabled || showSwitch ? '' : 'uni-list-item--hover'"
    @click="$emit('click')"
  >
    <view
      class="uni-list-item__container"
      :class="{ 'uni-list-item--first': isFirstChild, 'uni-list-item--no-border': radiusView }"
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
      <view class="uni-list-item__content">
        <slot />
        <text :class="'uni-list-item__content-title-' + titleSize">{{ title }}</text>
        <text v-if="note" class="uni-list-item__content-note">{{ note }}</text>
      </view>
      <view v-if="showBadge || showArrow || showSwitch" class="uni-list-item__extra">
        <text v-if="rightText" class="uni-list-item__extra-text">{{ rightText }}</text>
        <uni-badge v-if="showBadge" :type="badgeType" :text="badgeText" />
        <switch
          v-if="showSwitch"
          :disabled="disabled"
          :checked="switchChecked"
          @change="$emit('switchChange', $event.detail)"
        />
        <uni-icons
          v-if="showArrow"
          :size="20"
          class="uni-icon-wrapper"
          color="#333"
          type="arrowright"
        />
      </view>
    </view>
  </view>
</template>

<script>
import uniIcons from '../uni-icons/uni-icons.vue'
import uniBadge from '../uni-badge/uni-badge.vue'

/**
 * Ported from vegetable.mobile.vue/components/uni-list-item/uni-list-item.vue.
 * Props, slots and the `click` / `switchChange` events are unchanged; only the
 * nvue `<cell>` wrapper is gone.
 */
export default {
  name: 'UniListItem',
  components: { uniIcons, uniBadge },
  emits: ['click', 'switchChange'],
  props: {
    title: { type: String, default: '' },
    note: { type: String, default: '' },
    titleSize: { type: String, default: 'base' },
    disabled: { type: [Boolean, String], default: false },
    radiusView: { type: [Boolean, String], default: false },
    showArrow: { type: [Boolean, String], default: true },
    showBadge: { type: [Boolean, String], default: false },
    showSwitch: { type: [Boolean, String], default: false },
    switchChecked: { type: [Boolean, String], default: false },
    badgeText: { type: String, default: '' },
    badgeType: { type: String, default: 'success' },
    rightText: { type: String, default: '' },
    thumb: { type: String, default: '' },
    showExtraIcon: { type: [Boolean, String], default: false },
    extraIcon: {
      type: Object,
      default() {
        return { type: 'contact', color: '#000000', size: 20 }
      }
    }
  },
  // Provided by uni-list; used to suppress the top border on the first item.
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

/*
 * `radiusView` used to mean a white rounded card with a soft shadow. Under
 * Industry a raised surface is exactly what a card is not: it is a transparent
 * line drawing. The prop name is kept so the ~20 call sites don't churn, but it
 * now draws the blueprint frame. Registration marks are added by the pages that
 * want them — putting four pseudo-elements on every list row would be noise.
 */
.uni-list-item--radius {
  margin: 6px;
  border-radius: 0;
  background-color: transparent;
  border: 1px solid var(--color-divider);
}

.uni-list-item--disabled {
  opacity: 0.3;
}

.uni-list-item--hover {
  background-color: rgba(29, 31, 32, 0.05);
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
  border-bottom-color: var(--color-rule);
  border-bottom-style: solid;
  border-bottom-width: 1px;
}

.uni-list-item--first {
  border-top-width: 0px;
}

.uni-list-item--no-border {
  border-bottom-width: 0px;
}

.uni-list-item__container:after {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 1px;
  content: '';
  transform: scaleY(0.5);
  background-color: var(--color-rule);
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

.uni-list-item__content-title-base {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 15px;
  line-height: 1.25;
  color: var(--color-text);
  overflow: hidden;
}

.uni-list-item__content-title-sm {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text);
  overflow: hidden;
}

.uni-list-item__content-title-lg {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 16px;
  color: var(--color-text);
  overflow: hidden;
}

.uni-list-item__content-title-xlg {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 18px;
  color: var(--color-text);
  overflow: hidden;
}

.uni-list-item__content-note {
  margin-top: 2px;
  color: var(--color-neutral-600);
  font-family: var(--font-body);
  font-size: 11.5px;
  line-height: 1.4;
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

.uni-list-item__extra-text {
  color: $uni-text-color-grey;
  font-size: $uni-font-size-sm;
}
</style>
