<template>
  <bottom-sheet
    :model-value="modelValue"
    :title="$t('reservation.new')"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- client -->
    <text class="sheet-label">{{ $t('common.customer') }}</text>

    <view class="search">
      <uni-icons type="search" :size="14" color="#7a7a7d" />
      <input
        v-model="search"
        class="search__input"
        :placeholder="$t('common.search')"
        confirm-type="search"
      />
    </view>

    <view class="clients">
      <view
        v-for="client in clientsShown"
        :key="client.id"
        class="client"
        :class="{ 'client--on': draft.customerId === client.id }"
        @click="draft.customerId = client.id"
      >
        <view class="client__initials">
          <text class="client__initials-text">{{ client.initials }}</text>
        </view>
        <view class="client__main">
          <text class="client__name">{{ client.name }}</text>
          <text v-if="client.phone" class="client__phone">{{ client.phone }}</text>
        </view>
        <uni-icons v-if="draft.customerId === client.id" type="checkmarkempty" :size="15" color="#416180" />
      </view>

      <text v-if="!clientsShown.length" class="empty">{{ $t('customer.no-customers') }}</text>
    </view>

    <!-- services -->
    <text class="sheet-label">{{ $t('common.services') }}</text>

    <view
      v-for="service in servicesShown"
      :key="service.id"
      class="opt"
      @click="toggleService(service.id)"
    >
      <view class="opt__box" :class="{ 'opt__box--on': isPicked(service.id) }">
        <uni-icons v-if="isPicked(service.id)" type="checkmarkempty" :size="11" color="#f2f2f3" />
      </view>
      <view class="opt__main">
        <text class="opt__title">{{ service.title }}</text>
        <text class="opt__min">{{ service.minutesLabel }}</text>
      </view>
      <text class="opt__price">{{ service.priceLabel }}</text>
    </view>

    <!-- the computed reading -->
    <view class="plate draft-plate">
      <view class="draft-plate__left">
        <text class="plate-kicker">{{ $t('common.time') }}</text>
        <text class="draft-plate__range">{{ rangeLabel }}</text>
        <text class="draft-plate__len">{{ durationLabel }}</text>
      </view>
      <view class="draft-plate__right">
        <text class="plate-kicker">{{ $t('reservation.cost') }}</text>
        <text class="draft-plate__total">{{ totalLabel }}</text>
      </view>
    </view>

    <template #actions>
      <button class="sheet-btn sheet-btn--primary" :disabled="!ready || saving" @click="confirm">
        {{ $t('reservation.confirm') }}
      </button>
      <!--
        The sheet is the quick path. Everything the full form carries that this
        does not — employee, images, reminders, the confirmation SMS — stays one
        tap away rather than being lost.
      -->
      <button class="sheet-btn sheet-btn--secondary" @click="openFullEditor">
        {{ $t('reservation.more-options') }}
      </button>
    </template>
  </bottom-sheet>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import bottomSheet from '@/components/app/bottom-sheet.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import { useCustomerStore } from '@/stores/customer'
import { useServiceStore } from '@/stores/service'
import { useEmployeeStore } from '@/stores/employee'
import { useOwnerStore } from '@/stores/owner'
import { useReservationStore } from '@/stores/reservation'

/**
 * The design's "new reservation" sheet: pick a client, tick services, watch the
 * end time and the total compute themselves, confirm.
 *
 * It does not replace pages/reservation/edit — it is the fast path in front of
 * it. The payload is built from `getEmptyReservation()`, the same server-issued
 * template the full form starts from, so what reaches the API is the same shape
 * from either route.
 */
export default {
  name: 'NewReservationSheet',
  components: { bottomSheet, uniIcons },
  props: {
    modelValue: { type: Boolean, default: false },
    /** 'YYYY-MM-DD' */
    date: { type: String, default: '' },
    /** ISO datetime of the tapped gap, or '' to start at the day's opening */
    startTime: { type: String, default: '' }
  },
  emits: ['update:modelValue', 'created'],
  data() {
    return {
      search: '',
      saving: false,
      draft: { customerId: null, serviceIds: [] }
    }
  },
  computed: {
    ...mapState(useCustomerStore, ['activeCustomers']),
    ...mapState(useServiceStore, ['activeServices']),
    ...mapState(useOwnerStore, ['owner']),

    currency() {
      return this.owner?.currency?.symbol ?? ''
    },

    clientsShown() {
      const terms = this.search.trim().toLowerCase().split(' ').filter(Boolean)
      return (this.activeCustomers || [])
        .filter((customer) => {
          if (!terms.length) return true
          const haystack = [customer.firstName, customer.lastName, customer.phone]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          return terms.every((term) => haystack.includes(term))
        })
        .slice(0, 40)
        .map((customer) => ({
          id: customer.id,
          name: [customer.firstName, customer.lastName].filter(Boolean).join(' '),
          phone: customer.phone,
          initials:
            [customer.firstName, customer.lastName]
              .filter(Boolean)
              .map((part) => part.trim().charAt(0).toUpperCase())
              .join('') || '—'
        }))
    },

    servicesShown() {
      return (this.activeServices || []).map((service) => ({
        id: service.id,
        title: service.title,
        durationInMinutes: service.durationInMinutes,
        cost: service.cost,
        minutesLabel: `${service.durationInMinutes} ${this.$t('common.minute')}`,
        priceLabel: `${this.currency}${service.cost}`
      }))
    },

    picked() {
      return this.servicesShown.filter((service) => this.draft.serviceIds.includes(service.id))
    },

    minutes() {
      return this.picked.reduce((sum, service) => sum + (service.durationInMinutes || 0), 0)
    },

    total() {
      return this.picked.reduce((sum, service) => sum + (service.cost || 0), 0)
    },

    start() {
      if (this.startTime) return moment(this.startTime)
      return moment(`${this.date} 09:00`, 'YYYY-MM-DD HH:mm')
    },

    rangeLabel() {
      if (!this.minutes) return `${this.start.format('HH:mm')} – —`
      return `${this.start.format('HH:mm')} – ${this.start
        .clone()
        .add(this.minutes, 'minutes')
        .format('HH:mm')}`
    },

    /** "45 min" / "1 h 20 min", using the same short units the day rows do. */
    durationLabel() {
      if (!this.minutes) return '—'
      const h = this.$t('common.hour')
      const m = this.$t('common.minute')
      const hours = Math.floor(this.minutes / 60)
      const rest = this.minutes % 60
      if (!hours) return `${rest} ${m}`
      return rest ? `${hours} ${h} ${rest} ${m}` : `${hours} ${h}`
    },

    totalLabel() {
      return `${this.currency}${this.total}`
    },

    ready() {
      return Boolean(this.draft.customerId) && this.draft.serviceIds.length > 0
    }
  },
  watch: {
    // Re-seed each time it opens, so a sheet opened on a different gap does not
    // show the previous draft.
    modelValue(open) {
      if (!open) return
      this.search = ''
      this.draft.customerId = null
      this.draft.serviceIds = []
    }
  },
  methods: {
    isPicked(id) {
      return this.draft.serviceIds.includes(id)
    },

    toggleService(id) {
      const index = this.draft.serviceIds.indexOf(id)
      if (index > -1) this.draft.serviceIds.splice(index, 1)
      else this.draft.serviceIds.push(id)
    },

    openFullEditor() {
      const time = this.startTime ? `&time=${encodeURIComponent(this.startTime)}` : ''
      this.$emit('update:modelValue', false)
      uni.navigateTo({ url: `/pages/reservation/edit?date=${this.date}${time}` })
    },

    async confirm() {
      if (!this.ready || this.saving) return
      this.saving = true

      const reservations = useReservationStore()
      const customers = useCustomerStore()
      const employees = useEmployeeStore()

      try {
        // Start from the server's own template so every field the API expects is
        // present — the full form does the same.
        const template = (await reservations.getEmptyReservation()) || {}
        const end = this.start.clone().add(this.minutes, 'minutes')

        const reservation = {
          ...template,
          // The template is a blank record, but it is fetched through the same
          // endpoint that serves real ones (`owner/reservation/r/{guid}` with an
          // empty guid). If anything ever answers that with a populated record,
          // inheriting its id would turn this create into an update of someone
          // else's booking. This path only ever creates, so the id is cleared.
          id: undefined,
          startTime: this.start.toISOString(),
          endTime: end.toISOString(),
          cost: this.total,
          customerId: this.draft.customerId,
          customer: customers.getCustomerById(this.draft.customerId),
          employeeId: employees.currentEmployeeId ?? employees.employees?.[0]?.id ?? null,
          reservationServices: this.draft.serviceIds.map((serviceId) => ({ serviceId }))
        }

        const result = await reservations.createReservation(reservation)
        if (result) {
          this.$emit('created', result)
          this.$emit('update:modelValue', false)
        }
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.sheet-label {
  font-family: var(--font-body);
  font-size: 9.5px;
  line-height: 1;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin-top: 4px;
  margin-bottom: 8px;
}

/* — client picker — */

.search {
  flex-direction: row;
  align-items: center;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--color-divider);
  background-color: var(--color-surface);
  margin-bottom: 8px;
}

.search__input {
  flex: 1;
  margin-left: 8px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--color-text);
}

/* Capped so the services below stay reachable without scrolling past a long
   client list. */
.clients {
  max-height: 168px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.client {
  flex-direction: row;
  align-items: center;
  padding: 8px 2px;
  border-bottom: 1px solid var(--color-rule);
}

.client--on {
  background-color: rgba(89, 128, 166, 0.08);
}

.client__initials {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
  margin-right: 10px;
}

.client__initials-text {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 12px;
  color: var(--color-accent-700);
}

.client__main {
  flex: 1;
}

.client__name {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  line-height: 1.25;
  color: var(--color-text);
}

.client__phone {
  font-family: var(--font-body);
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--color-neutral-700);
}

/* — services — */

.opt {
  flex-direction: row;
  align-items: center;
  padding: 9px 2px;
  border-bottom: 1px solid var(--color-rule);
}

.opt__box {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
  margin-right: 11px;
}

.opt__box--on {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
}

.opt__main {
  flex: 1;
}

.opt__title {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  line-height: 1.25;
  color: var(--color-text);
}

.opt__min {
  font-family: var(--font-body);
  font-size: 11px;
  line-height: 1.35;
  color: var(--color-neutral-600);
}

.opt__price {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text);
}

/* — the computed reading — */

.draft-plate {
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  padding: 13px 14px 14px;
  margin-top: 16px;
  margin-bottom: 4px;
}

.draft-plate__left {
  flex: 1;
}

.draft-plate__right {
  align-items: flex-end;
}

.draft-plate__range {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 21px;
  line-height: 1.05;
  margin-top: 6px;
}

.draft-plate__len {
  font-family: var(--font-body);
  font-size: 11.5px;
  line-height: 1.3;
  opacity: 0.72;
  margin-top: 5px;
}

.draft-plate__total {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 21px;
  line-height: 1.05;
  margin-top: 6px;
}

/* — actions — */

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

.sheet-btn--primary {
  background-color: var(--color-accent);
  border: 1px solid var(--color-accent);
  color: var(--color-bg);
}

/* uni-app ships `uni-button[disabled]:not([type])` at (0,2,1), which outranks a
   plain scoped class, so the disabled state has to restate the fill. */
.sheet-btn--primary[disabled] {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg);
  opacity: 0.45;
}

.sheet-btn--secondary {
  background-color: transparent;
  border: 1px solid var(--color-divider);
  color: var(--color-text);
  margin-top: 9px;
}

.empty {
  padding: 18px 0;
  text-align: center;
  font-family: var(--font-body);
  font-size: 12px;
  color: var(--color-neutral-600);
}
</style>
