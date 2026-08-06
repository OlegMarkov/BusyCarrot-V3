<template>
  <app-shell :page-title="t('nav.calendar')" :page-sub="pageSub">
    <template #actions>
      <div class="seg">
        <label
          class="seg-opt"
          :class="{ 'seg-opt--active': view === 'week' }"
          @click="view = 'week'"
        >
          <span class="view-opt">{{ t('calendar.week') }}</span>
        </label>
        <label class="seg-opt" :class="{ 'seg-opt--active': view === 'day' }" @click="view = 'day'">
          <span class="view-opt">{{ t('calendar.day') }}</span>
        </label>
      </div>
      <button class="btn btn-secondary topbar-btn" @click="goToday">{{ t('calendar.today') }}</button>
    </template>

    <time-grid
      :columns="columns"
      :active-key="activeKey"
      :selected-id="selectedId"
      :closed-label="t('calendar.closed')"
      @pick-day="pickDay"
      @new-booking="startNew"
      @select="selectBooking"
    />

    <!-- ── right rail ── -->
    <aside class="rail">
      <div class="rail__plate">
        <div>
          <div class="rail__kicker">{{ activeDay.format('dddd') }}</div>
          <div class="rail__date">{{ bigDate }}</div>
          <div class="rail__hours">{{ hoursLine }}</div>
        </div>
        <div class="rail__money">
          <div class="rail__kicker">{{ t('calendar.today') }}</div>
          <div class="rail__total">{{ money(dayTotal) }}</div>
          <div class="rail__month">{{ t('calendar.month') }} {{ money(monthTotal) }}</div>
        </div>
      </div>

      <div class="rail__body">
        <!-- summary -->
        <template v-if="rail === 'summary'">
          <div class="rail__label">{{ t('calendar.dayList') }}</div>
          <div
            v-for="row in dayList"
            :key="row.id"
            class="rail-row"
            @click="selectBooking({ id: row.id, dayKey: activeKey })"
          >
            <div class="rail-row__start">{{ row.start }}</div>
            <div class="rail-row__main">
              <div class="rail-row__name">{{ row.name }}</div>
              <div class="rail-row__services">{{ row.services }}</div>
            </div>
            <div class="rail-row__cost">{{ row.cost }}</div>
          </div>

          <div v-if="!dayList.length" class="rail__empty">{{ t('calendar.noBookings') }}</div>

          <button class="btn btn-primary btn-block rail__cta" @click="startNew()">
            {{ t('calendar.addReservation') }}
          </button>
        </template>

        <!-- new booking -->
        <template v-else-if="rail === 'new'">
          <div class="rail__head">
            <div class="rail__title">{{ t('calendar.newReservation') }}</div>
            <button class="rail__close" @click="closeRail">
              <lucide-icon name="close" :size="14" />
            </button>
          </div>

          <div class="rail__label">{{ t('calendar.client') }}</div>
          <div class="chips">
            <div
              v-for="client in clientChips"
              :key="client.id"
              class="chip"
              :class="{ 'chip--on': draft.customerId === client.id }"
              @click="draft.customerId = client.id"
            >
              {{ client.label }}
            </div>
          </div>

          <div class="rail__label">{{ t('calendar.services') }}</div>
          <div class="opts">
            <div
              v-for="service in serviceOptions"
              :key="service.id"
              class="opt"
              @click="toggleService(service.id)"
            >
              <span class="opt__box" :class="{ 'opt__box--on': draft.serviceIds.includes(service.id) }">
                <lucide-icon
                  v-if="draft.serviceIds.includes(service.id)"
                  name="check"
                  :size="12"
                />
              </span>
              <div class="opt__main">
                <div class="opt__title">{{ service.title }}</div>
                <div class="opt__min">{{ service.minutes }}</div>
              </div>
              <span class="opt__price">{{ service.price }}</span>
            </div>
          </div>

          <div class="rail__plate rail__plate--draft">
            <div>
              <div class="rail__kicker">{{ t('calendar.startsEnds') }}</div>
              <div class="rail__range">{{ draftRange }}</div>
              <div class="rail__hours">{{ t('calendar.duration') }} {{ draftDuration }}</div>
            </div>
            <div class="rail__money">
              <div class="rail__kicker">{{ t('calendar.total') }}</div>
              <div class="rail__total rail__total--sm">{{ money(draftTotal) }}</div>
            </div>
          </div>

          <button
            class="btn btn-primary btn-block rail__confirm"
            :disabled="!draftReady"
            @click="confirmDraft"
          >
            {{ draftReady ? t('calendar.confirm') : t('calendar.pickClient') }}
          </button>
        </template>

        <!-- detail -->
        <template v-else-if="rail === 'detail' && detail">
          <div class="rail__head">
            <div class="rail__title">{{ detail.name }}</div>
            <button class="rail__close" @click="closeRail">
              <lucide-icon name="close" :size="14" />
            </button>
          </div>

          <div class="rail__plate rail__plate--detail">
            <div class="rail__range">{{ detail.range }}</div>
            <div class="rail__detail-meta">{{ detail.services }}</div>
            <div class="rail__detail-meta">{{ detail.meta }}</div>
          </div>

          <div v-for="row in detail.rows" :key="row.k" class="kv">
            <span class="kv__k">{{ row.k }}</span>
            <span class="kv__v">{{ row.v }}</span>
          </div>

          <div class="rail__actions">
            <button class="btn btn-secondary rail__action" :disabled="!detail.phone" @click="call">
              {{ t('calendar.call') }}
            </button>
            <button class="btn btn-secondary rail__action" :disabled="!detail.phone" @click="message">
              {{ t('calendar.message') }}
            </button>
          </div>
          <button class="btn btn-secondary btn-danger btn-block rail__delete" @click="remove">
            {{ t('calendar.delete') }}
          </button>
        </template>
      </div>
    </aside>
  </app-shell>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import moment from 'moment'
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/AppShell.vue'
import TimeGrid from '@/components/calendar/TimeGrid.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { useDayColumns, fromMinutes, formatDuration } from '@/composables/useDayColumns'
import { useReservationStore } from '@/stores/reservation'
import { useScheduleStore } from '@/stores/schedule'
import { useCustomerStore } from '@/stores/customer'
import { useServiceStore } from '@/stores/service'
import { useEmployeeStore } from '@/stores/employee'
import { useOwnerStore } from '@/stores/owner'

const { t } = useI18n()

const reservations = useReservationStore()
const schedules = useScheduleStore()
const customers = useCustomerStore()
const services = useServiceStore()
const employees = useEmployeeStore()
const owner = useOwnerStore()

const view = ref('week')
const activeKey = ref(moment().format('YYYY-MM-DD'))
const rail = ref('summary')
const selectedId = ref(null)
const draft = reactive({ start: null, customerId: null, serviceIds: [] })

const activeDay = computed(() => moment(activeKey.value))

/** Week runs from the locale's own first day, so it is Monday-first in ru. */
const days = computed(() => {
  if (view.value === 'day') return [activeDay.value]
  const start = activeDay.value.clone().startOf('week')
  return Array.from({ length: 7 }, (_, i) => start.clone().add(i, 'days'))
})

const columns = useDayColumns(days, selectedId)
const activeColumn = computed(() => columns.value.find((c) => c.key === activeKey.value))

const currency = computed(() => owner.owner?.currency?.symbol ?? '')
const money = (value) => `${currency.value}${value ?? 0}`

const pageSub = computed(() => {
  const first = days.value[0]
  const last = days.value[days.value.length - 1]
  if (view.value === 'day') return first.format('D MMMM YYYY')
  return `${first.format('D MMM')} – ${last.format('D MMM YYYY')}`
})

const bigDate = computed(() => activeDay.value.format('DD MMM').toUpperCase())

const hoursLine = computed(() => {
  const column = activeColumn.value
  if (!column || column.closed) return t('calendar.dayOff')
  return `${fromMinutes(column.open)} – ${fromMinutes(column.close)}`
})

const dayTotal = computed(() => activeColumn.value?.total ?? 0)

const monthTotal = computed(() =>
  reservations.reservations
    .filter((r) => moment(r.startTime).isSame(activeDay.value, 'month'))
    .reduce((sum, r) => sum + (r.cost ?? 0), 0)
)

const dayList = computed(() =>
  (activeColumn.value?.blocks ?? []).map((block) => ({
    id: block.id,
    start: block.time.split(' – ')[0],
    name: block.name,
    services: block.services,
    cost: block.cost
  }))
)

/* — new booking — */

const clientChips = computed(() =>
  (customers.activeCustomers ?? customers.customers ?? []).slice(0, 12).map((c) => ({
    id: c.id,
    label: [c.firstName, c.lastName].filter(Boolean).join(' ')
  }))
)

const serviceOptions = computed(() =>
  (services.activeServices ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    minutes: `${s.durationInMinutes} ${t('calendar.min')}`,
    price: `${currency.value}${s.cost}`,
    durationInMinutes: s.durationInMinutes,
    cost: s.cost
  }))
)

const draftMinutes = computed(() =>
  draft.serviceIds.reduce((sum, id) => {
    const service = serviceOptions.value.find((s) => s.id === id)
    return sum + (service?.durationInMinutes ?? 0)
  }, 0)
)

const draftTotal = computed(() =>
  draft.serviceIds.reduce((sum, id) => {
    const service = serviceOptions.value.find((s) => s.id === id)
    return sum + (service?.cost ?? 0)
  }, 0)
)

const draftRange = computed(() => {
  if (draft.start === null) return '—'
  return `${fromMinutes(draft.start)} – ${fromMinutes(draft.start + draftMinutes.value)}`
})

const draftDuration = computed(() =>
  draftMinutes.value ? formatDuration(draftMinutes.value) : '—'
)

const draftReady = computed(() => Boolean(draft.customerId) && draft.serviceIds.length > 0)

/* — detail — */

const detail = computed(() => {
  if (!selectedId.value) return null
  const reservation = reservations.getReservationById(selectedId.value)
  if (!reservation) return null

  const block = columns.value.flatMap((c) => c.blocks).find((b) => b.id === selectedId.value)
  const customer = customers.getCustomerById?.(reservation.customerId)
  const employee = employees.getEmployeeById?.(reservation.employeeId)
  const start = moment(reservation.startTime)
  const end = moment(reservation.endTime)

  return {
    name: block?.name ?? '—',
    range: `${start.format('HH:mm')} – ${end.format('HH:mm')}`,
    services: block?.services ?? '',
    meta: [formatDuration(end.diff(start, 'minutes')), money(reservation.cost), customer?.phone]
      .filter(Boolean)
      .join(' · '),
    phone: customer?.phone ?? '',
    rows: [
      { k: t('calendar.date'), v: start.format('DD.MM.YYYY') },
      { k: t('calendar.employee'), v: [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || '—' },
      { k: t('calendar.total'), v: money(reservation.cost) }
    ]
  }
})

/* — actions — */

function pickDay(key) {
  activeKey.value = key
  rail.value = 'summary'
  selectedId.value = null
}

function goToday() {
  activeKey.value = moment().format('YYYY-MM-DD')
  rail.value = 'summary'
  selectedId.value = null
}

function startNew(payload) {
  if (payload) {
    activeKey.value = payload.dayKey
    draft.start = payload.start
  } else {
    // No gap tapped: start at the day's opening, or 09:00 if it is closed.
    draft.start = activeColumn.value?.open ?? 540
  }
  draft.customerId = null
  draft.serviceIds = []
  selectedId.value = null
  rail.value = 'new'
}

function toggleService(id) {
  const index = draft.serviceIds.indexOf(id)
  if (index > -1) draft.serviceIds.splice(index, 1)
  else draft.serviceIds.push(id)
}

function selectBooking({ id, dayKey }) {
  activeKey.value = dayKey
  selectedId.value = id
  rail.value = 'detail'
}

function closeRail() {
  rail.value = 'summary'
  selectedId.value = null
}

async function confirmDraft() {
  if (!draftReady.value) return

  const start = activeDay.value
    .clone()
    .startOf('day')
    .add(draft.start, 'minutes')

  await reservations.createReservation({
    startTime: start.toISOString(),
    endTime: start.clone().add(draftMinutes.value, 'minutes').toISOString(),
    customerId: draft.customerId,
    employeeId: employees.currentEmployeeId ?? employees.employees?.[0]?.id ?? null,
    cost: draftTotal.value,
    reservationServices: draft.serviceIds.map((serviceId) => ({ serviceId }))
  })

  rail.value = 'summary'
}

async function remove() {
  if (!selectedId.value) return
  await reservations.deleteReservation(selectedId.value)
  closeRail()
}

function call() {
  if (detail.value?.phone) window.location.href = `tel:${detail.value.phone}`
}

function message() {
  if (detail.value?.phone) window.location.href = `sms:${detail.value.phone}`
}

/* — data — */

// The shell loads the owner, customers and schedules; the calendar only owns
// the reservation window, which moves with the shown week.
onMounted(() => {
  reservations.fetchReservations(activeKey.value)
})

// Moving the shown week re-centres the loaded window.
watch(activeKey, (key) => reservations.fetchReservations(key))

watch(
  () => employees.currentEmployeeId,
  (id) => {
    if (id) schedules.fetchSchedules(id)
  }
)
</script>

<style scoped>
.view-opt,
.topbar-btn {
  font: 600 11px var(--font-heading);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.topbar-btn {
  min-height: 36px;
}

.seg-opt {
  min-height: 36px;
  padding: 0 16px;
}

/* — the rail — */
.rail {
  width: 334px;
  flex: none;
  border-left: 1px solid var(--color-divider);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.rail__plate {
  flex: none;
  background: var(--color-accent-900);
  color: #f2f2f3;
  padding: 16px 18px 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.rail__plate--draft {
  padding: 13px 14px;
  margin-bottom: 14px;
}

.rail__plate--detail {
  display: block;
  padding: 15px;
  margin-bottom: 16px;
}

.rail__kicker {
  font: 400 9.5px/1 var(--font-body);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.62;
}

.rail__date {
  font: 600 34px/0.95 var(--font-heading);
  margin-top: 6px;
}

.rail__range {
  font: 600 26px/1 var(--font-heading);
}

.rail__hours {
  font: 400 11px/1 var(--font-body);
  opacity: 0.72;
  margin-top: 8px;
}

.rail__detail-meta {
  font: 400 11.5px/1.5 var(--font-body);
  opacity: 0.75;
  margin-top: 4px;
}

.rail__money {
  text-align: right;
}

.rail__total {
  font: 600 25px/1 var(--font-heading);
  margin-top: 5px;
}

.rail__total--sm {
  font-size: 22px;
}

.rail__month {
  font: 400 10px/1 var(--font-body);
  opacity: 0.6;
  margin-top: 8px;
}

.rail__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px 18px 22px;
}

.rail__label {
  font: 400 10px/1 var(--font-body);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin-bottom: 12px;
}

.rail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.rail__title {
  font: 600 15px/1 var(--font-heading);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rail__close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid var(--color-divider);
  background: transparent;
  color: inherit;
}

.rail-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 2px;
  cursor: pointer;
  border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
}

.rail-row:hover {
  background: color-mix(in srgb, var(--color-text) 4%, transparent);
}

.rail-row__start {
  width: 44px;
  flex: none;
  font: 600 13px/1 var(--font-heading);
  letter-spacing: 0.02em;
}

.rail-row__main {
  flex: 1;
  min-width: 0;
}

.rail-row__name {
  font: 600 14px/1.2 var(--font-heading);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail-row__services {
  font: 400 11px/1.4 var(--font-body);
  color: var(--color-neutral-600);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rail-row__cost {
  font: 600 13px/1 var(--font-heading);
  color: var(--color-accent-700);
}

.rail__empty {
  padding: 26px 0;
  text-align: center;
  font: 400 11.5px/1.5 var(--font-body);
  color: var(--color-neutral-600);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.rail__cta {
  min-height: 46px;
  margin-top: 18px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 12px;
}

.rail__confirm {
  min-height: 48px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 12px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.chip {
  min-height: 34px;
  display: flex;
  align-items: center;
  padding: 0 11px;
  cursor: pointer;
  font: 600 12px var(--font-heading);
  letter-spacing: 0.02em;
  border: 1px solid var(--color-divider);
}

.chip--on {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-bg);
}

.opts {
  display: flex;
  flex-direction: column;
  margin-bottom: 18px;
}

.opt {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 44px;
  padding: 7px 2px;
  cursor: pointer;
  border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
}

.opt__box {
  width: 17px;
  height: 17px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
}

.opt__box--on {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-bg);
}

.opt__main {
  flex: 1;
}

.opt__title {
  font: 600 13.5px/1.2 var(--font-heading);
}

.opt__min {
  font: 400 10.5px/1.4 var(--font-body);
  color: var(--color-neutral-600);
}

.opt__price {
  font: 600 13px var(--font-heading);
}

.kv {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 9px 2px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
}

.kv__k {
  font: 400 11px var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.kv__v {
  font: 600 13.5px var(--font-heading);
}

.rail__actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.rail__action {
  flex: 1;
  min-height: 42px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 11px;
}

.rail__delete {
  min-height: 42px;
  margin-top: 8px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 11px;
}
</style>
