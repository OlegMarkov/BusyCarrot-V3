<template>
  <view v-if="modelValue" class="sheet-scrim" @click="close">
    <!-- @click.stop so a tap inside the panel does not dismiss it -->
    <view class="sheet" @click.stop>
      <view class="sheet__head">
        <text class="sheet__title">{{ title }}</text>
        <view class="sheet__close" @click="close">
          <uni-icons type="close" :size="14" color="#1d1f20" />
        </view>
      </view>

      <scroll-view scroll-y class="sheet__body" :show-scrollbar="false">
        <slot />
      </scroll-view>

      <view v-if="$slots.actions" class="sheet__actions">
        <slot name="actions" />
      </view>
    </view>
  </view>
</template>

<script>
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'

/**
 * The design's bottom sheet: square, a hairline top border, parked on the
 * bottom edge over a dimmed ground.
 *
 * Deliberately not uni-popup. uni-popup animates a rounded panel with its own
 * chrome and mask, and its `type="bottom"` markup does not carry the head/body/
 * actions split every sheet in this design has. The two sheets that use this
 * are the mobile counterpart of the desktop rail's three states, so the
 * container has to be the same shape as that.
 */
export default {
  name: 'BottomSheet',
  components: { uniIcons },
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' }
  },
  emits: ['update:modelValue'],
  methods: {
    close() {
      this.$emit('update:modelValue', false)
    }
  }
}
</script>

<style lang="scss" scoped>
.sheet-scrim {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 900;
  background-color: rgba(29, 31, 32, 0.42);
  flex-direction: column;
  justify-content: flex-end;
}

.sheet {
  width: 100%;
  max-height: 78%;
  flex-direction: column;
  background-color: var(--color-bg);
  border-top: 1px solid var(--color-divider);
}

.sheet__head {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--color-rule);
}

.sheet__title {
  flex: 1;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 17px;
  line-height: 1.2;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text);
}

.sheet__close {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
}

.sheet__body {
  flex: 1;
  padding: 14px 16px 0;
}

.sheet__actions {
  padding: 12px 16px 18px;
  border-top: 1px solid var(--color-rule);
}
</style>
