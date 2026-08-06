<template>
  <view class="nv" @click="focus">
    <view class="input-view">
      <uni-icons class="input-uni-icon" type="search" size="22" color="#666666" />
      <input
        v-model="searchText"
        class="nav-bar-input"
        confirm-type="done"
        :placeholder="$t('common.search')"
        :focus="isFocus"
        @confirm="onConfirm"
        @input="inputChange"
      />
      <uni-icons
        v-if="searchText !== ''"
        class="clear-uni-icon"
        type="clear"
        size="22"
        color="#666666"
        @click="clearSearchInput"
      />
    </view>
  </view>
</template>

<script>
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'

/**
 * Ported from vegetable.mobile.vue/components/app/search-input.nvue.
 * The search field that sits inside the nav bar on the customer list.
 *
 * Changes: `<div>` → `<view>`, `getApp().globalData.$t` → `$t`, and the stray
 * `:v-model="inputVal"` attribute on the input is gone — `inputVal` was never
 * declared, and a colon-prefixed `v-model` is a plain attribute binding, not a
 * directive, so it bound `undefined` to an attribute literally named "v-model".
 */
export default {
  name: 'SearchInput',
  components: { uniIcons },
  emits: ['input'],
  data() {
    return {
      searchText: '',
      isFocus: false
    }
  },
  methods: {
    inputChange(event) {
      this.$emit('input', event.detail.value)
    },

    focus() {
      this.isFocus = true
    },

    onConfirm() {
      uni.hideKeyboard()
    },

    clearSearchInput() {
      uni.hideKeyboard()
      this.isFocus = false
      this.searchText = ''
      this.$emit('input', '')
    }
  }
}
</script>

<style lang="scss" scoped>
/* A search field is just the system's .input surface: square, hairline, on the
   surface tone rather than the old rounded grey pill. */
.input-view {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: 1;
  background-color: var(--color-surface);
  min-height: 36px;
  border: 1px solid var(--color-divider);
  border-radius: 0;
  padding: 0 10px;
  flex-wrap: nowrap;
  margin: 6px 0;
}

.input-uni-icon {
  margin-right: 8px;
}

.clear-uni-icon {
  position: absolute;
  right: 10px;
}

.nav-bar-input {
  flex: 1;
  min-height: 34px;
  padding: 0;
  font-family: var(--font-body);
  font-size: 13px;
  background-color: transparent;
  color: var(--color-text);
}
</style>
