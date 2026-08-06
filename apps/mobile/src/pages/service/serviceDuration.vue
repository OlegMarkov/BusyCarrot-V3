<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar
      left-icon="arrowleft"
      status-bar="true"
      fixed="true"
      :title="$t('service.durationInMinutes')"
      @clickLeft="navigateBack(selectedValue)"
    />
    <items>
      <items-item
        v-for="duration in serviceDurations"
        :key="duration"
        :selected="Number(selectedValue) === duration"
        @click="navigateBack(duration)"
      >
        <view><text class="form-list-title">{{ timeConvert(duration) }}</text></view>
      </items-item>
    </items>
  </view>
</template>

<script>
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import items from '@/components/app/items.vue'
import itemsItem from '@/components/app/items-item.vue'
import { timeConvert } from '@/plugins/helpers'

/** 15 minutes to 10 hours, in quarter-hour steps. */
const SERVICE_DURATIONS = Array.from({ length: 40 }, (_, index) => (index + 1) * 15)

/**
 * Ported from vegetable.mobile.vue/pages/service/serviceDuration.nvue.
 * Reports the pick back to the service form over `uni.$emit`.
 *
 * The 40 durations were written out as a literal array; they are generated here.
 * `selected` now coerces before comparing — `option.value` arrives from the
 * query string as a string, so the original's `==` was doing the coercion
 * implicitly and would have broken under a strict comparison.
 */
export default {
  components: { uniNavBar, items, itemsItem },
  data() {
    return {
      selectedValue: 0,
      serviceDurations: SERVICE_DURATIONS
    }
  },
  onLoad(option) {
    this.selectedValue = option.value
  },
  methods: {
    navigateBack(value) {
      uni.$emit('update:serviceDuration', { durationValue: value })
      uni.navigateBack()
    },
    timeConvert
  }
}
</script>
