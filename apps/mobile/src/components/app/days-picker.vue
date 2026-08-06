<template>
  <view class="nv days-picker">
    <view class="days">
      <text class="days-text">{{ selectedDays }}</text>
    </view>
    <picker-view
      class="picker-view"
      :indicator-style="indicatorStyle"
      :value="value"
      @change="bindChange"
    >
      <picker-view-column>
        <view v-for="day in dayOptions" :key="`on-${day}`"><text class="item">{{ day }}</text></view>
      </picker-view-column>
      <picker-view-column>
        <view v-for="day in dayOptions" :key="`off-${day}`"><text class="item">{{ day }}</text></view>
      </picker-view-column>
    </picker-view>
  </view>
</template>

<script>
/** A rotating schedule cycles between 1 and 20 days on, and 1 to 20 off. */
const DAY_OPTIONS = Array.from({ length: 20 }, (_, index) => index + 1)

/**
 * Ported from vegetable.mobile.vue/components/app/days-picker.nvue.
 *
 * Two wheels choosing the "N days on, M days off" cycle of a rotating schedule.
 * Its one consumer is settings/schedule/edit.
 *
 * Changes:
 *  - `bindChange` assigned to `this.onDays` and `this.offDays`, which are
 *    **props**. Vue 2 let that through (the write went nowhere useful because
 *    the parent re-rendered over it); Vue 3 warns and the write is lost. The
 *    component now only emits, and `value` derives from the props, so the parent
 *    stays the single source of truth.
 *  - the parent bound these with `.sync`, which Vue 3 removed; it is
 *    `v-model:on-days` / `v-model:off-days` there now, which is what the
 *    existing `update:onDays` / `update:offDays` events already match.
 *  - the two identical 1..20 arrays are one shared constant
 *  - the unused `visible` flag, the `moment` import and the empty `mounted` are gone
 */
export default {
  name: 'DaysPicker',
  emits: ['update:onDays', 'update:offDays'],
  props: {
    onDays: { type: Number, default: 1 },
    offDays: { type: Number, default: 1 }
  },
  data() {
    return {
      dayOptions: DAY_OPTIONS,
      // Match the row height to the rpx-based item height, minus a half-pixel
      // on Android where the indicator otherwise straddles two rows.
      indicatorStyle: `height: ${
        uni.getSystemInfoSync().screenWidth / (750 / 80) -
        (uni.getSystemInfoSync().platform === 'android' ? 0.5 : 0)
      }px;`
    }
  },
  computed: {
    value() {
      return [this.onDays - 1, this.offDays - 1]
    },
    selectedDays() {
      return (
        this.onDays +
        this.$t('general-settings.working-days') +
        this.offDays +
        this.$t('general-settings.off-days')
      )
    }
  },
  methods: {
    bindChange(event) {
      const [onIndex, offIndex] = event.detail.value
      this.$emit('update:onDays', this.dayOptions[onIndex])
      this.$emit('update:offDays', this.dayOptions[offIndex])
    }
  }
}
</script>

<style lang="scss" scoped>
.picker-view {
  height: 200rpx;
  margin-top: 60rpx;
  margin-bottom: 60rpx;
}

.item {
  font-size: $uni-font-size-lg;
  line-height: 80rpx;
  text-align: center;
}

.days {
  justify-content: center;
  flex-direction: row;
}

.days-text {
  font-size: $uni-font-size-lg;
}
</style>
