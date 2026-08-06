<template>
  <view class="uni-list">
    <slot />
  </view>
</template>

<script>
/**
 * Ported from vegetable.mobile.vue/components/uni-list/uni-list.vue.
 *
 * The APP-NVUE branch rendered a native `<list>` with `loadmoreoffset` and a
 * `@loadmore` handler re-emitted as `scrolltolower`; on the webview renderer
 * this was always a plain `<view>`, so the `enableBackToTop` / `scrollY` props
 * and the `scrolltolower` event had no effect and are gone. No call site used
 * them — pull-to-refresh is handled by components/app/list-refresh.vue.
 *
 * `provide({ list: this })` is kept: uni-list-item injects it to work out which
 * item is first, so it can drop that item's top border.
 */
export default {
  name: 'UniList',
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
.uni-list {
  display: flex;
  background-color: $uni-bg-color;
  position: relative;
  flex-direction: column;
}

.uni-list:before {
  height: 0;
}

.uni-list:after {
  height: 0;
}
</style>
