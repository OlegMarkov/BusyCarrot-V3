<template>
  <view class="nv select-list">
    <slot />
  </view>
</template>

<script>
/**
 * Ported from vegetable.mobile.vue/components/app/items.nvue.
 *
 * A plain container for a short, non-scrolling pick list (languages,
 * currencies, schedule type, service duration). The nvue original used a native
 * `<list>` with `scroll-y="false"` — i.e. explicitly not scrolling — so a
 * `<view>` is an exact equivalent here.
 *
 * `provide({ list: this })` is retained because items-item's ancestor lookup
 * mirrors uni-list/uni-list-item, and dropping it would break that contract if
 * an item is ever swapped for a uni-list-item.
 */
export default {
  name: 'AppItems',
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
.select-list {
  background-color: $uni-bg-color;
  position: relative;
  flex-direction: column;
}
</style>
