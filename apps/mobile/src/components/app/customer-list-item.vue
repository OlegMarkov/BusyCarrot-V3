<template>
  <!--
    The client row as Industry draws it: a framed initials square instead of an
    avatar, the name in condensed over the number, and the right edge carrying
    when they are next in and how many visits they have had.
  -->
  <view class="client-row" @longpress="longpress" @click="$emit('click')">
    <view class="ind-initials client-row__initials">
      <text class="client-row__initials-text">{{ initials }}</text>
    </view>

    <view class="client-row__main">
      <text class="client-row__name">{{ title }}</text>
      <text class="client-row__phone">{{ note }}</text>
    </view>

    <view class="client-row__meta">
      <text class="client-row__next">{{ nextVisit }}</text>
      <text class="client-row__visits">{{ visitsText }}</text>
    </view>

    <uni-popup ref="deletePopup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ modalMessageText }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="doDelete">{{ $t('customer.delete') }}</text>
          <text class="modal-dialog-button" @click="doCancelDelete">{{ $t('common.cancel') }}</text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import { useCustomerStore } from '@/stores/customer'
import { useReservationStore } from '@/stores/reservation'
import { tArray } from '@/plugins/i18n'

/**
 * Ported from vegetable.mobile.vue/components/app/customer-list-item.vue.
 *
 * One row of the customer list, with a long-press action sheet for call/delete
 * and a confirmation dialog that warns when the customer still has upcoming
 * bookings.
 *
 * Changes:
 *  - the `<uni-popup-options>` sheet is gone. Its only opener was commented out
 *    (`//this.$refs['popup_customer_'+...].open()`) — `longpress` uses the
 *    native `uni.showActionSheet` instead — so the markup and the three
 *    popup-options imports were unreachable.
 *  - the action sheet's index handling was a three-branch `if` chain over
 *    `tapIndex` and `isPhoneExist`; it is now a list of actions with their own
 *    handlers, which is the same thing without the off-by-one risk.
 *  - `:ref="'deleteCustomerPopup_' + customer.id"` → a static ref; the id
 *    suffix was there to stay unique across a v-for, but the popup lives inside
 *    this component so each instance has its own `$refs`.
 *  - `<cell>` wrapper → `<view>`; vuex → Pinia; `getApp().globalData.$t` → `$t`
 */
export default {
  name: 'CustomerListItem',
  components: { uniPopup },
  emits: ['click'],
  props: {
    customer: {
      type: Object,
      required: true
    }
  },
  computed: {
    ...mapState(useReservationStore, [
      'getActiveReservationsByCustomer',
      'getReservationsByCustomer'
    ]),

    /** Two letters for the framed square; falls back to one, then to a dash. */
    initials() {
      const letters = [this.customer.firstName, this.customer.lastName]
        .filter(Boolean)
        .map((part) => part.trim().charAt(0).toUpperCase())
        .join('')
      return letters || '—'
    },

    /** The soonest upcoming booking: "TODAY" if it is today, else "16 AUG". */
    nextVisit() {
      const upcoming = [...this.getActiveReservationsByCustomer(this.customer.id)].sort((a, b) =>
        a.startTime < b.startTime ? -1 : 1
      )
      const next = upcoming[0]
      if (!next) return '—'

      const when = moment(next.startTime)
      if (when.isSame(moment(), 'day')) return this.$t('common.today')
      return `${when.format('DD')} ${tArray('calendar.monthsShort')[when.month()]}`
    },

    visitsText() {
      return String(this.getReservationsByCustomer(this.customer.id).length)
    },
    title() {
      return [this.customer.firstName, this.customer.lastName].filter(Boolean).join(' ')
    },
    note() {
      return this.customer.phone
    },
    isPhoneExist() {
      return Boolean(this.customer.phone?.length)
    },
    activeReservationCount() {
      return this.getActiveReservationsByCustomer(this.customer.id).length
    },
    modalMessageText() {
      if (!this.activeReservationCount) return this.$t('customer.areyousurefordelete')
      return `${this.$t('customer.areyousurefordelete')}\n${this.$t(
        'customer.activereservationalert'
      )}${this.activeReservationCount}`
    }
  },
  methods: {
    longpress() {
      const actions = []
      if (this.isPhoneExist) {
        actions.push({ label: this.$t('customer.call'), run: () => this.callCustomer() })
      }
      actions.push({ label: this.$t('reservation.delete'), run: () => this.deleteCustomer() })

      uni.showActionSheet({
        itemList: actions.map((action) => action.label),
        success: (res) => actions[res.tapIndex]?.run()
      })
    },

    callCustomer() {
      uni.makePhoneCall({ phoneNumber: this.customer.phone })
    },

    deleteCustomer() {
      this.$refs.deletePopup.open()
    },

    async doDelete() {
      if (!this.customer?.id) return
      await useCustomerStore().deleteCustomer(this.customer.id)
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
.client-row {
  flex-direction: row;
  align-items: center;
  padding: 11px 2px;
  border-bottom: 1px solid var(--color-rule);
}

.client-row__initials {
  margin-right: 12px;
}

.client-row__initials-text {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--color-accent-700);
}

.client-row__main {
  flex: 1;
  overflow: hidden;
}

.client-row__name {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 15px;
  line-height: 1.25;
  color: var(--color-text);
}

.client-row__phone {
  font-family: var(--font-body);
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--color-neutral-700);
}

.client-row__meta {
  align-items: flex-end;
  margin-left: 8px;
}

.client-row__next {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent-700);
}

.client-row__visits {
  font-family: var(--font-body);
  font-size: 10.5px;
  line-height: 1.4;
  color: var(--color-neutral-600);
  margin-top: 3px;
}
</style>
