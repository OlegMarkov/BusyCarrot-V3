<template>
  <app-shell :page-title="t('nav.services')" :page-sub="pageSub">
    <div class="page">
      <div class="page__head">
        <h4 class="page__title">{{ t('services.priceList') }}</h4>
        <span class="page__count">{{ t('services.count', [rows.length]) }}</span>
      </div>

      <table class="table page__table">
        <thead>
          <tr>
            <th class="col-n">#</th>
            <th>{{ t('services.service') }}</th>
            <th class="num col-min">{{ t('services.min') }}</th>
            <th class="num col-price">{{ t('services.price') }}</th>
            <th class="num col-booked">{{ t('services.booked') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="clickable" @click="edit(row.id)">
            <td class="cell-n">{{ row.n }}</td>
            <td>
              <div class="cell-title">{{ row.title }}</div>
              <div class="cell-desc">{{ row.description }}</div>
            </td>
            <td class="num cell-fig">{{ row.minutes }}</td>
            <td class="num cell-fig">{{ row.price }}</td>
            <td class="num cell-booked">{{ row.booked }}</td>
          </tr>
        </tbody>
      </table>

      <button class="btn btn-secondary page__add" @click="edit(null)">
        {{ t('services.add') }}
      </button>

      <service-edit-dialog v-model="editing" :service-id="editingId" />
    </div>
  </app-shell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/AppShell.vue'
import ServiceEditDialog from '@/components/editors/ServiceEditDialog.vue'
import { useServiceStore } from '@/stores/service'
import { useReservationStore } from '@/stores/reservation'
import { useOwnerStore } from '@/stores/owner'

const { t } = useI18n()
const services = useServiceStore()
const reservations = useReservationStore()
const owner = useOwnerStore()

const currency = computed(() => owner.owner?.currency?.symbol ?? '')
const all = computed(() => services.activeServices ?? [])
const pageSub = computed(() => t('services.count', [all.value.length]))

/**
 * "Booked" counts how many reservations in the loaded window include the
 * service. The API exposes no aggregate for this, so like the client figures it
 * reflects the fetched window rather than all time — worth knowing before
 * reading it as a lifetime total.
 */
function bookedCount(serviceId) {
  return reservations.reservations.filter((reservation) =>
    (reservation.reservationServices || []).some((link) => link.serviceId === serviceId)
  ).length
}

const editing = ref(false)
const editingId = ref(null)

function edit(id) {
  editingId.value = id
  editing.value = true
}

const rows = computed(() =>
  all.value.map((service, index) => ({
    id: service.id,
    n: String(index + 1).padStart(2, '0'),
    title: service.title,
    description: service.description || '',
    minutes: service.durationInMinutes ?? '—',
    price: `${currency.value}${service.cost ?? 0}`,
    booked: bookedCount(service.id)
  }))
)


</script>

<style scoped>
.page {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 22px 26px 30px;
}

.page__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  max-width: 880px;
}

.page__title {
  margin: 0;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 16px;
}

.page__count {
  font: 400 10.5px var(--font-body);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.page__table {
  max-width: 880px;
}

.num {
  text-align: right;
}

.col-n {
  width: 40px;
}
.col-min,
.col-price {
  width: 90px;
}
.col-booked {
  width: 120px;
}

/* The index is a reference, not prose, so it sits in monospace. */
.cell-n {
  font: 400 11.5px ui-monospace, Menlo, monospace;
  color: var(--color-neutral-600);
}

.cell-title {
  font: 600 15px/1.2 var(--font-heading);
}

.cell-desc {
  font: 400 11.5px/1.4 var(--font-body);
  color: var(--color-neutral-600);
}

.cell-fig {
  font: 600 15px var(--font-heading);
}

.cell-booked {
  font: 400 12.5px var(--font-body);
  color: var(--color-neutral-600);
}

.clickable {
  cursor: pointer;
}

.page__add {
  margin-top: 16px;
  min-height: 42px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 11px;
}

/* ──────────────────────────────────────────────────────────────────────────
   Below 1024px — the design's single breakpoint.
   ────────────────────────────────────────────────────────────────────────── */
@media (max-width: 1023.98px) {
  .page {
    padding: 14px 14px 26px;
  }

  .page__head,
  .page__table {
    max-width: none;
  }

  th.col-n,
  th.col-booked,
  .cell-n,
  .cell-booked {
    display: none;
  }

  .cell-title {
    font-size: 14px;
  }

  .page__add {
    width: 100%;
  }
}
</style>
