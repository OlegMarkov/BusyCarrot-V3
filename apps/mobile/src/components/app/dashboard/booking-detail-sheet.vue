<template>
  <bottom-sheet
    :model-value="modelValue"
    :title="detail.name"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <view class="plate detail-plate">
      <text class="detail-plate__range">{{ detail.range }}</text>
      <text v-if="detail.services" class="detail-plate__meta">{{ detail.services }}</text>
      <text class="detail-plate__meta">{{ detail.meta }}</text>
    </view>

    <view v-for="row in detail.rows" :key="row.k" class="kv">
      <text class="kv__k">{{ row.k }}</text>
      <text class="kv__v">{{ row.v }}</text>
    </view>

    <template #actions>
      <view class="row-actions">
        <button class="sheet-btn sheet-btn--secondary row-actions__btn" :disabled="!detail.phone" @click="call">
          {{ $t('customer.call') }}
        </button>
        <button class="sheet-btn sheet-btn--secondary row-actions__btn" :disabled="!detail.phone" @click="message">
          {{ $t('common.message') }}
        </button>
      </view>
      <button class="sheet-btn sheet-btn--secondary" @click="openFullEditor">
        {{ $t('reservation.edit') }}
      </button>
      <button class="sheet-btn sheet-btn--danger" @click="askDelete">
        {{ $t('reservation.delete') }}
      </button>
    </template>
  </bottom-sheet>

  <uni-popup ref="deletePopup" type="center" :mask-click="true">
    <view class="modal-dialog">
      <text class="modal-dialog-content">{{ $t('reservation.areyousurefordelete') }}</text>
      <view class="modal-dialog-group-button">
        <text class="modal-dialog-button" @click="doDelete">{{ $t('reservation.delete') }}</text>
        <text class="modal-dialog-button" @click="$refs.deletePopup.close()">
          {{ $t('common.cancel') }}
        </text>
      </view>
    </view>
  </uni-popup>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import bottomSheet from '@/components/app/bottom-sheet.vue'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import { useReservationStore } from '@/stores/reservation'
import { useCustomerStore } from '@/stores/customer'
import { useServiceStore } from '@/stores/service'
import { useEmployeeStore } from '@/stores/employee'
import { useOwnerStore } from '@/stores/owner'
import { sendSms } from '@/plugins/native'

/**
 * The design's booking sheet: the client as the title, what and when, then
 * Call / Message / Delete.
 *
 * It reads rather than edits — "Edit" hands over to pages/reservation/edit,
 * which is still the only place a booking's services, images or reminders can
 * be changed.
 */
export default {
  name: 'BookingDetailSheet',
  components: { bottomSheet, uniPopup },
  props: {
    modelValue: { type: Boolean, default: false },
    reservationId: { type: String, default: '' }
  },
  emits: ['update:modelValue', 'deleted'],
  computed: {
    ...mapState(useOwnerStore, ['owner']),

    detail() {
      const empty = { name: '', range: '', services: '', meta: '', phone: '', rows: [] }
      if (!this.reservationId) return empty

      const reservation = useReservationStore().getReservationById(this.reservationId)
      if (!reservation) return empty

      const customers = useCustomerStore()
      const services = useServiceStore()
      const employees = useEmployeeStore()

      const customer = customers.getCustomerById(reservation.customerId) || reservation.customer
      const employee = employees.getEmployeeById?.(reservation.employeeId)
      const start = moment(reservation.startTime)
      const end = moment(reservation.endTime)
      const currency = this.owner?.currency?.symbol ?? ''

      const titles = (reservation.reservationServices || [])
        .map((link) => services.getServiceById(link.serviceId)?.title || link.service?.title)
        .filter(Boolean)

      return {
        name: [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || '—',
        range: `${start.format('HH:mm')} – ${end.format('HH:mm')}`,
        services: titles.join(', '),
        meta: [`${end.diff(start, 'minutes')} ${this.$t('common.minute')}`, `${currency}${reservation.cost ?? 0}`]
          .filter(Boolean)
          .join(' · '),
        phone: customer?.phone || '',
        rows: [
          { k: this.$t('common.date'), v: start.format('DD.MM.YYYY') },
          {
            k: this.$t('employee.title'),
            v: [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || '—'
          }
        ]
      }
    }
  },
  methods: {
    call() {
      if (this.detail.phone) uni.makePhoneCall({ phoneNumber: this.detail.phone })
    },

    message() {
      if (this.detail.phone) sendSms({ to: this.detail.phone, body: '' })
    },

    openFullEditor() {
      const id = this.reservationId
      this.$emit('update:modelValue', false)
      uni.navigateTo({ url: `/pages/reservation/edit?id=${id}` })
    },

    askDelete() {
      this.$refs.deletePopup.open()
    },

    async doDelete() {
      this.$refs.deletePopup.close()
      await useReservationStore().deleteReservation(this.reservationId)
      this.$emit('deleted', this.reservationId)
      this.$emit('update:modelValue', false)
    }
  }
}
</script>

<style lang="scss" scoped>
.detail-plate {
  padding: 13px 14px 14px;
  margin-bottom: 6px;
}

.detail-plate__range {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 24px;
  line-height: 1.05;
}

.detail-plate__meta {
  font-family: var(--font-body);
  font-size: 11.5px;
  line-height: 1.4;
  opacity: 0.72;
  margin-top: 5px;
}

.kv {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 2px;
  border-bottom: 1px solid var(--color-rule);
}

.kv__k {
  font-family: var(--font-body);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.kv__v {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text);
}

.row-actions {
  flex-direction: row;
}

.row-actions__btn {
  flex: 1;
}

.row-actions__btn + .row-actions__btn {
  margin-left: 9px;
}

.sheet-btn {
  min-height: 46px;
  border-radius: 0;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
}

.sheet-btn::after {
  border: none;
}

.sheet-btn--secondary {
  background-color: transparent;
  border: 1px solid var(--color-divider);
  color: var(--color-text);
  margin-top: 9px;
}

.row-actions .sheet-btn--secondary {
  margin-top: 0;
}

.sheet-btn--danger {
  background-color: transparent;
  border: 1px solid rgba(143, 71, 65, 0.4);
  color: var(--color-danger);
  margin-top: 9px;
}
</style>
