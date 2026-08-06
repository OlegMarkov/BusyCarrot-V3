<template>
  <view class="nv total-cost-body total-cost-border">
    <view class="flex-column">
      <view class="flex-row total-cost-container">
        <view class="flex-row info-row">
          <text class="total-cost-text">{{ thisDayText }}: </text>
          <text class="total-cost-value" style="margin-right: 5rpx">{{ totalCostDay }}</text>
        </view>
        <view class="flex-row info-row">
          <text class="total-cost-text" style="margin-right: 5rpx">{{ $t('common.month') }}: </text>
          <text class="total-cost-value" style="color: #f2a007">{{ totalCostMonth }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import { useOwnerStore } from '@/stores/owner'
import { useReservationStore } from '@/stores/reservation'

/**
 * Ported from vegetable.mobile.vue/components/app/total-cost-info.nvue.
 * Takings for the shown day and for its month, above the dashboard's day list.
 *
 * Changes:
 *  - the `currency` data field, kept in sync by a watcher on `owner`, is a
 *    computed. The watcher never fired for the common case: `owner` is usually
 *    already loaded when this mounts, so `currency` stayed '' and both figures
 *    rendered without a symbol until the owner happened to change.
 *  - `"...".format(...)` used a String.prototype monkey-patch; it is now the
 *    `format()` helper.
 */
export default {
  name: 'TotalCostInfo',
  props: {
    date: {
      type: String,
      default: ''
    }
  },
  computed: {
    ...mapState(useOwnerStore, ['owner']),
    ...mapState(useReservationStore, [
      'getReservationsTotalCostByDate',
      'getReservationsTotalCostByMonth'
    ]),
    mDate() {
      return moment(this.date)
    },
    currency() {
      return this.owner?.currency?.symbol || ''
    },
    totalCostDay() {
      return this.$t('common.price-format', [
        this.currency,
        this.getReservationsTotalCostByDate(this.date)
      ])
    },
    totalCostMonth() {
      return this.$t('common.price-format', [
        this.currency,
        this.getReservationsTotalCostByMonth(this.mDate.month())
      ])
    },
    thisDayText() {
      return moment().isSame(this.mDate, 'day') ? this.$t('common.today') : this.$t('common.thisDay')
    }
  }
}
</script>

<style lang="scss" scoped>
.total-cost-body {
  position: relative;
  margin: 10rpx;
}

.total-cost-border {
  border-radius: 18rpx;
  background-color: white;
  box-shadow: 0 0 10rpx #ccc;
}

.total-cost-container {
  justify-content: space-between;
  padding: 0px 30rpx;
}

.total-cost-text {
  font-size: $uni-font-size-sm;
}

.total-cost-value {
  font-size: 46rpx;
  color: $uni-color;
}

.info-row {
  align-items: center;
  justify-content: center;
}
</style>
