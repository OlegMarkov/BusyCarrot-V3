<template>
  <app-shell :page-title="t('nav.clients')" :page-sub="pageSub">
    <div class="page">
      <div class="page__tools">
        <label class="input page__search">
          <lucide-icon name="search" :size="15" />
          <input v-model="search" class="page__search-input" :placeholder="t('clients.search')" />
        </label>
        <button class="btn btn-primary page__add">{{ t('clients.add') }}</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th class="col-initials" />
            <th>{{ t('clients.client') }}</th>
            <th>{{ t('clients.phone') }}</th>
            <th class="num">{{ t('clients.visits') }}</th>
            <th class="num">{{ t('clients.lastVisit') }}</th>
            <th class="num">{{ t('clients.nextVisit') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td><div class="initials">{{ row.initials }}</div></td>
            <td class="cell-name">{{ row.name }}</td>
            <td class="cell-phone">{{ row.phone }}</td>
            <td class="num cell-visits">{{ row.visits }}</td>
            <td class="num cell-last">{{ row.last }}</td>
            <td class="num cell-next">{{ row.next }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="!rows.length" class="page__empty">{{ t('clients.none') }}</div>
    </div>
  </app-shell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import moment from 'moment'
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/AppShell.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { useCustomerStore } from '@/stores/customer'
import { useReservationStore } from '@/stores/reservation'

const { t } = useI18n()
const customers = useCustomerStore()
const reservations = useReservationStore()

const search = ref('')

const all = computed(() => customers.activeCustomers ?? customers.customers ?? [])

const pageSub = computed(() => t('clients.count', [all.value.length]))

/**
 * Visits, last and next are derived from the loaded reservation window rather
 * than stored on the customer — the API has no such fields. That means the
 * figures reflect what the calendar has fetched, which is the same window the
 * dashboard shows.
 */
function historyFor(customerId) {
  const mine = reservations.reservations
    .filter((r) => r.customerId === customerId)
    .sort((a, b) => moment(a.startTime).diff(moment(b.startTime)))

  const now = moment()
  const past = mine.filter((r) => moment(r.startTime).isBefore(now))
  const upcoming = mine.filter((r) => !moment(r.startTime).isBefore(now))

  return {
    visits: mine.length,
    last: past.length ? moment(past[past.length - 1].startTime).format('DD.MM.YYYY') : '—',
    next: upcoming.length ? formatNext(moment(upcoming[0].startTime)) : '—'
  }
}

function formatNext(when) {
  if (when.isSame(moment(), 'day')) return t('calendar.today')
  return when.format('DD MMM').toUpperCase()
}

const rows = computed(() => {
  const terms = search.value.trim().toLowerCase().split(' ').filter(Boolean)

  return all.value
    .filter((customer) => {
      if (!terms.length) return true
      const haystack = [customer.firstName, customer.lastName, customer.phone]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return terms.every((term) => haystack.includes(term))
    })
    .map((customer) => {
      const history = historyFor(customer.id)
      return {
        id: customer.id,
        initials:
          [customer.firstName, customer.lastName]
            .filter(Boolean)
            .map((part) => part.trim().charAt(0).toUpperCase())
            .join('') || '—',
        name: [customer.firstName, customer.lastName].filter(Boolean).join(' '),
        phone: customer.phone || '—',
        ...history
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
})


</script>

<style scoped>
.page {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 22px 26px 30px;
}

.page__tools {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  max-width: 720px;
}

.page__search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--color-neutral-600);
}

.page__search-input {
  flex: 1;
  border: 0;
  background: transparent;
  font: 400 13px var(--font-body);
  color: var(--color-text);
  outline: none;
}

.page__add {
  min-height: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 11px;
}

.col-initials {
  width: 52px;
}

.num {
  text-align: right;
}

.initials {
  width: 34px;
  height: 34px;
  border: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 12px var(--font-heading);
  color: var(--color-accent-700);
}

.cell-name {
  font: 600 15px var(--font-heading);
}

.cell-phone {
  font: 400 12.5px var(--font-body);
  color: var(--color-neutral-700);
}

.cell-visits {
  font: 600 14px var(--font-heading);
}

.cell-last {
  font: 400 12.5px var(--font-body);
  color: var(--color-neutral-600);
}

.cell-next {
  font: 600 11.5px var(--font-heading);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-accent-700);
}

.page__empty {
  padding: 40px 0;
  text-align: center;
  font: 400 12px var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}
</style>
