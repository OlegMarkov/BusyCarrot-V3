<template>
  <view class="nv options-list">
    <slot />
  </view>
</template>

<script>
/**
 * Ported from
 * vegetable.mobile.vue/components/app/popup-options/uni-list-options.vue.
 *
 * Container for the rows of an action sheet. Identical to ui/uni-list except
 * that this one is never scrollable, so the nvue `<list>` branch and its
 * `enableBackToTop` / `scrollY` / `scrolltolower` plumbing are gone.
 */
export default {
  name: 'UniListOptions',
  provide() {
    return {
      list: this
    }
  },
  created() {
    this.firstChildAppend = false
  }
}
</script>

<style lang="scss" scoped>
.options-list {
  display: flex;
  background-color: $uni-bg-color;
  position: relative;
  flex-direction: column;
}
</style>
