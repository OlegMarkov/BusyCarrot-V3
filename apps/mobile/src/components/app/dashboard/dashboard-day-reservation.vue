<template>
  <!--
    A booking, drawn the way Industry draws every object: a left time column
    against a transparent hairline-framed block carrying the registration marks.
    The white rounded card with its drop shadow is gone.
  -->
  <view class="res-row">
    <view class="res-rail">
      <text class="res-rail__start">{{ startTimeFormat }}</text>
      <text class="res-rail__len">{{ durationText }}</text>
    </view>

    <view class="blueprint res-block" @longpress="longpress" @click="edit">
      <text class="corner tl" />
      <text class="corner tr" />
      <text class="corner bl" />
      <text class="corner br" />

      <view class="res-block__head">
        <text class="res-block__name">{{ title }}</text>
        <text class="res-block__cost">{{ price }}</text>
      </view>
      <text class="res-block__note">{{ note }}</text>
      <text v-if="!inSchedule" class="res-block__warn">{{ $t('common.out-of-schedule') }}</text>

      <view v-if="isPhoneExist" class="res-block__actions">
        <view class="res-action" @click.stop="smsCustomer">
          <uni-icons type="message" :size="15" color="#416180" />
        </view>
        <view class="res-action" @click.stop="callCustomer">
          <uni-icons type="phone" :size="15" color="#416180" />
        </view>
      </view>
    </view>

    <uni-popup ref="deletePopup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ $t('reservation.areyousurefordelete') }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="doDelete">{{ $t('reservation.delete') }}</text>
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
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import { useServiceStore } from '@/stores/service'
import { useCustomerStore } from '@/stores/customer'
import { useOwnerStore } from '@/stores/owner'
import { useReservationStore } from '@/stores/reservation'
import { sendSms } from '@/plugins/native'
import { openSheet } from '@/plugins/sheet-bus'

/**
 * Ported from
 * vegetable.mobile.vue/components/app/dashboard/dashboard-day-reservation.nvue.
 *
 * One booking card on the dashboard: customer name, first service and price,
 * time range, call/SMS shortcuts, and a long-press action sheet for call/delete.
 *
 * Changes:
 *  - `:ref="'popup_delete_' + reservation.id'` → a static `deletePopup` ref.
 *    The id suffix existed to keep refs unique across a v-for, but the popup is
 *    inside this component, so each instance already has its own `$refs`.
 *  - `plus.messaging` → `sendSms()` from plugins/native.js
 *  - `"...".format(...)` → the `format()` helper (the String.prototype patch is gone)
 *  - `helpers` was imported as a default export that helpers.js never had; dropped
 *  - popup-options components were imported and registered but never rendered; dropped
 *  - `@click.stop` on the call/SMS buttons replaces the manual
 *    `e.stopPropagation()`, which did nothing on the nvue event object and let a
 *    tap fall through to `edit()`
 *  - `customer` may legitimately be missing (deleted customer, or the store not
 *    loaded yet); the original dereferenced it unguarded in `title` and threw
 */
export default {
  name: 'DashboardDayReservation',
  components: { uniPopup, uniIcons },
  props: {
    reservation: {
      type: Object,
      required: true
    }
  },
  computed: {
    startTimeFormat() {
      return moment(this.reservation.startTime).format('HH:mm')
    },
    durationMinutes() {
      return moment(this.reservation.endTime).diff(moment(this.reservation.startTime), 'minutes')
    },
    /** "45m" / "1h" / "1h 20m" — the duration the time column carries. */
    durationText() {
      const minutes = Math.max(0, Math.round(this.durationMinutes))
      if (minutes < 60) return `${minutes}m`
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      return rest ? `${hours}h ${rest}m` : `${hours}h`
    },
    ...mapState(useServiceStore, ['getServiceById']),
    ...mapState(useCustomerStore, ['getCustomerById']),
    ...mapState(useOwnerStore, ['owner']),
    ...mapState(useReservationStore, ['ifInSchedule']),

    services() {
      return (this.reservation.reservationServices || []).map((item) =>
        this.getServiceById(item.serviceId)
      )
    },
    customer() {
      return this.getCustomerById(this.reservation.customerId)
    },
    price() {
      return this.$t('common.price-format', [
        this.owner?.currency?.symbol || '',
        this.reservation.cost
      ])
    },
    title() {
      if (!this.customer) return ''
      return [this.customer.firstName, this.customer.lastName].filter(Boolean).join(' ')
    },
    note() {
      const [first] = this.services
      if (!first) return ''
      const more =
        this.services.length > 1
          ? ` (${this.$t('reservation.more', [this.services.length - 1])})`
          : ''
      return `${first.title}${more} · ${this.badgeText}`
    },
    badgeText() {
      return `${moment(this.reservation.startTime).format('HH:mm')} - ${moment(
        this.reservation.endTime
      ).format('HH:mm')}`
    },
    isPhoneExist() {
      return Boolean(this.customer?.phone?.length)
    },
    inSchedule() {
      return this.ifInSchedule(this.reservation)
    }
  },
  methods: {
    /** Tapping a booking opens its sheet; the sheet's Edit reaches the form. */
    edit() {
      openSheet('detail', { reservationId: this.reservation.id })
    },

    longpress() {
      const sheetTitle = [
        this.title,
        this.services[0]?.title,
        moment(this.reservation.startTime).format('HH:mm')
      ]
        .filter(Boolean)
        .join(' - ')

      const actions = this.isPhoneExist
        ? [
            { label: this.$t('customer.call'), run: () => this.callCustomer() },
            { label: this.$t('reservation.delete'), run: () => this.deleteReservation() }
          ]
        : [{ label: this.$t('reservation.delete'), run: () => this.deleteReservation() }]

      uni.showActionSheet({
        title: sheetTitle,
        cancel: this.$t('common.cancel'),
        itemList: actions.map((action) => action.label),
        success: (res) => actions[res.tapIndex]?.run()
      })
    },

    callCustomer() {
      uni.makePhoneCall({ phoneNumber: this.customer.phone })
    },

    smsCustomer() {
      sendSms({ to: this.customer.phone, body: '' })
    },

    deleteReservation() {
      this.$refs.deletePopup.open()
    },

    doDelete() {
      useReservationStore().deleteReservation(this.reservation.id)
      this.$refs.deletePopup.close()
    },

    doCancelDelete() {
      this.$refs.deletePopup.close()
    }
  }
}
</script>

<style lang="scss" scoped>
.res-row {
  flex-direction: row;
  margin-bottom: 13px;
}

/* The time column: start time over duration, right-aligned against the block. */
.res-rail {
  width: 42px;
  flex-shrink: 0;
  align-items: flex-end;
  padding-top: 3px;
}

.res-rail__start {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--color-text);
}

.res-rail__len {
  font-family: var(--font-body);
  font-size: 10px;
  line-height: 1.5;
  color: var(--color-neutral-600);
}

.res-block {
  flex: 1;
  min-height: 52px;
  margin-left: 11px;
  padding: 11px 12px;
  justify-content: center;
  background-color: transparent;
}

.res-block__head {
  flex-direction: row;
  align-items: baseline;
  justify-content: space-between;
}

.res-block__name {
  flex: 1;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 16px;
  line-height: 1.15;
  letter-spacing: 0.01em;
  color: var(--color-text);
}

.res-block__cost {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  color: var(--color-accent-700);
  margin-left: 8px;
}

.res-block__note {
  font-family: var(--font-body);
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--color-neutral-600);
  margin-top: 5px;
}

/* The one warm tone in the system, used here and nowhere else on this screen. */
.res-block__warn {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-warn);
  margin-top: 2px;
}

.res-block__actions {
  flex-direction: row;
  margin-top: 9px;
}

.res-action {
  width: 34px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
  margin-right: 6px;
}
</style>
