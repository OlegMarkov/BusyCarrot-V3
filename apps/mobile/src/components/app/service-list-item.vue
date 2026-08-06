<template>
  <!--
    A price-list line. The design draws services as a spec-sheet table — an
    index number, the service over its description, then minutes and price
    reading down the right edge in condensed figures.
  -->
  <view class="svc-row" @longpress="longpress" @click="$emit('click')">
    <text class="svc-row__n">{{ indexText }}</text>

    <view class="svc-row__main">
      <text class="svc-row__title">{{ title }}</text>
      <text v-if="description" class="svc-row__desc">{{ description }}</text>
    </view>

    <text class="svc-row__min">{{ minutesText }}</text>
    <text class="svc-row__price">{{ priceText }}</text>

    <uni-popup ref="deletePopup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ modalMessageText }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="doDelete">{{ $t('service.delete') }}</text>
          <text class="modal-dialog-button" @click="doCancelDelete">{{ $t('common.cancel') }}</text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import { useServiceStore } from '@/stores/service'
import { useReservationStore } from '@/stores/reservation'
import { timeConvert } from '@/plugins/helpers'

/**
 * Ported from vegetable.mobile.vue/components/app/service-list-item.vue.
 *
 * One row of the service list: title, description + duration, price badge, and
 * a long-press delete that warns about upcoming bookings using this service.
 *
 * FIXED WHILE PORTING — the original template contained a stray, unmatched
 * `</uni-popup-options>` closing tag with no opening tag (line 8). Vue 2's
 * parser discarded it; Vue 3's compiler treats it as an error, so the file could
 * not have compiled as-is. The three popup-options imports that went with it
 * were unused — `longpress` goes through `uni.showActionSheet` — so the tag and
 * the imports are both gone rather than being reconstructed into a sheet that
 * never existed at runtime.
 *
 * Also: `modalMessageText` was declared twice in `computed`, so the first
 * definition was silently discarded. Only the second (the one that mentions the
 * active reservation count) is kept.
 */
export default {
  name: 'ServiceListItem',
  components: { uniPopup },
  emits: ['click'],
  props: {
    service: {
      type: Object,
      required: true
    },
    /** 1-based position in the price list; rendered as the table's # column. */
    index: {
      type: Number,
      default: 0
    }
  },
  computed: {
    ...mapState(useReservationStore, ['getActiveReservationsByService']),
    title() {
      return this.service.title
    },
    note() {
      const description = this.service.description ? `${this.service.description}, ` : ''
      return description + timeConvert(this.service.durationInMinutes)
    },
    badgeText() {
      return this.service.cost.toString()
    },

    /* — the price-list columns — */
    indexText() {
      return this.index ? String(this.index).padStart(2, '0') : ''
    },
    description() {
      return this.service.description || ''
    },
    /** Minutes as a bare figure; the column head already says "min". */
    minutesText() {
      return String(this.service.durationInMinutes ?? '')
    },
    priceText() {
      return String(this.service.cost ?? '')
    },
    activeReservationCount() {
      return this.getActiveReservationsByService(this.service.id).length
    },
    modalMessageText() {
      if (!this.activeReservationCount) return this.$t('service.areyousurefordelete')
      return `${this.$t('service.areyousurefordelete')}\n${this.$t(
        'service.activereservationalert'
      )}${this.activeReservationCount}`
    }
  },
  methods: {
    longpress() {
      uni.showActionSheet({
        itemList: [this.$t('common.delete')],
        success: (res) => {
          if (res.tapIndex === 0) this.deleteService()
        }
      })
    },

    deleteService() {
      this.$refs.deletePopup.open()
    },

    async doDelete() {
      if (!this.service?.id) return
      await useServiceStore().deleteService(this.service.id)
      useReservationStore().fetchReservations()
      this.$refs.deletePopup.close()
    },

    doCancelDelete() {
      this.$refs.deletePopup.close()
    }
  }
}
</script>

<style lang="scss" scoped>
.svc-row {
  flex-direction: row;
  align-items: center;
  padding: 11px 2px;
  border-bottom: 1px solid var(--color-rule);
}

/* The index sits in monospace — it is a reference, not prose. */
.svc-row__n {
  width: 26px;
  flex-shrink: 0;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 11px;
  color: var(--color-neutral-600);
}

.svc-row__main {
  flex: 1;
  overflow: hidden;
}

.svc-row__title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
  color: var(--color-text);
}

.svc-row__desc {
  font-family: var(--font-body);
  font-size: 11px;
  line-height: 1.4;
  color: var(--color-neutral-600);
}

.svc-row__min,
.svc-row__price {
  flex-shrink: 0;
  text-align: right;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text);
}

.svc-row__min {
  width: 52px;
}

.svc-row__price {
  width: 54px;
}
</style>
