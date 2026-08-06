<template>
  <uni-popup ref="popup" :type="type" :animation="animation" :mask-click="maskClick" @change="onChange">
    <view class="nv options-sheet">
      <view v-if="title !== ''" class="options-sheet__title">
        <text class="options-sheet__title-text">{{ title }}</text>
      </view>

      <slot />

      <uni-list-options>
        <uni-list-option-item
          :title="$t('common.cancel')"
          :show-arrow="false"
          show-extra-icon="true"
          :extra-icon="{ size: '23', type: 'undo' }"
          @click="close()"
        />
      </uni-list-options>
    </view>
  </uni-popup>
</template>

<script>
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import uniListOptions from './uni-list-options.vue'
import uniListOptionItem from './uni-list-option-item.vue'

/**
 * Ported from
 * vegetable.mobile.vue/components/app/popup-options/uni-popup-options.vue.
 *
 * A bottom action sheet: a title, whatever rows the caller slots in, and a
 * built-in Cancel row.
 *
 * The original was a fork of uni-popup with ~150 lines of the same show/hide,
 * transition and positioning logic copy-pasted, differing only in the wrapper
 * markup and in hiding the tab bar while open. This wraps ui/uni-popup instead,
 * so there is one implementation of that logic. `open()` / `close()` keep their
 * signatures — every call site drives this through a template ref.
 */
export default {
  name: 'UniPopupOptions',
  components: { uniPopup, uniListOptions, uniListOptionItem },
  emits: ['change'],
  props: {
    animation: { type: Boolean, default: true },
    type: { type: String, default: 'bottom' },
    title: { type: String, default: '' },
    maskClick: { type: Boolean, default: true }
  },
  methods: {
    open() {
      uni.hideTabBar()
      this.$refs.popup.open()
    },

    close() {
      uni.showTabBar()
      this.$refs.popup.close()
    },

    onChange(event) {
      // Dismissing via the mask goes straight through uni-popup, so the tab bar
      // has to be restored here rather than only in close().
      if (!event.show) uni.showTabBar()
      this.$emit('change', event)
    }
  }
}
</script>

<style lang="scss" scoped>
.options-sheet {
  position: relative;
  background-color: white;
  border-radius: 25px;
  padding-top: 25px;
  margin-bottom: 30px;
  padding-bottom: 30px;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.options-sheet__title {
  display: flex;
  flex-direction: row;
  justify-content: center;
  padding-bottom: 10px;
}

.options-sheet__title-text {
  font-size: 35rpx;
  font-weight: 600;
}
</style>
