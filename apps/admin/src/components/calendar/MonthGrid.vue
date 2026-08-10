<template>
  <div class="month">
    <!-- weekday heads, in the locale's own week order -->
    <div class="month__head">
      <div v-for="label in weekdayLabels" :key="label" class="month__dow">{{ label }}</div>
    </div>

    <div class="month__grid">
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="month__cell"
        :class="{
          'month__cell--muted': !cell.inMonth,
          'month__cell--today': cell.isToday,
          'month__cell--active': cell.key === activeKey
        }"
        @click="$emit('pick-day', cell.key)"
      >
        <div class="month__daterow">
          <span class="month__dayno">{{ cell.dayNumber }}</span>
          <span v-if="cell.count" class="month__count">{{ cell.count }}</span>
        </div>
        <!--
          A filled bar per booking, capped so a busy day does not overflow the
          cell — the count above is the exact figure, the bars are the glance.
        -->
        <div v-if="cell.count" class="month__bars">
          <span v-for="n in cell.barCount" :key="n" class="month__bar" />
          <span v-if="cell.overflow" class="month__more">+{{ cell.overflow }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * A month at a glance: seven columns, whole weeks, each day showing its booking
 * count. Vegetable.Admin had a month view that drew only the day numbers and
 * nothing else; this shows where the work actually is, and a day click hands
 * back to the page, which switches to the day view for it.
 *
 * The counts come from the store's countsByDay (the aggregate endpoint), not the
 * loaded reservation window — a month is far wider than the ±3-day window
 * `fetchReservations` pulls.
 */
import { computed } from 'vue'
import moment from 'moment'
import { useReservationStore } from '@/stores/reservation'

const props = defineProps({
  /** Any day within the month to show. */
  monthDate: { type: Object, required: true },
  activeKey: { type: String, default: '' }
})

defineEmits(['pick-day'])

const reservations = useReservationStore()

/** The header labels, Monday-first in ru and Sunday-first in en — whatever the locale's week is. */
const weekdayLabels = computed(() => {
  const start = moment(props.monthDate).startOf('week')
  return Array.from({ length: 7 }, (_, i) => start.clone().add(i, 'days').format('dd'))
})

/**
 * Six weeks of cells covering the month, padded with the tail of the previous
 * month and the head of the next so every row is full. Six rows always, so the
 * grid does not resize as you page between a 4- and a 6-row month.
 */
const cells = computed(() => {
  const month = moment(props.monthDate)
  const gridStart = month.clone().startOf('month').startOf('week')
  const today = moment().format('YYYY-MM-DD')

  return Array.from({ length: 42 }, (_, i) => {
    const day = gridStart.clone().add(i, 'days')
    const key = day.format('YYYY-MM-DD')
    const count = reservations.countOnDate(key)
    const barCount = Math.min(count, 4)
    return {
      key,
      dayNumber: day.format('D'),
      inMonth: day.month() === month.month(),
      isToday: key === today,
      count,
      barCount,
      overflow: count > 4 ? count - 4 : 0
    }
  })
})
</script>

<style scoped>
.month {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.month__head {
  flex: none;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-bottom: 1px solid var(--color-divider);
}

.month__dow {
  padding: 9px 12px;
  font: 400 9.5px/1 var(--font-body);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  border-left: 1px solid var(--color-divider);
}

.month__dow:first-child {
  border-left: 0;
}

.month__grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-auto-rows: minmax(88px, 1fr);
}

.month__cell {
  min-width: 0;
  padding: 8px 10px;
  border-left: 1px solid var(--color-divider);
  border-top: 1px solid var(--color-divider);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* The first column and the top row already have the grid's outer edge. */
.month__cell:nth-child(7n + 1) {
  border-left: 0;
}

.month__cell:hover {
  background: color-mix(in srgb, var(--color-text) 4%, transparent);
}

.month__cell--muted {
  color: var(--color-neutral-500);
  background: color-mix(in srgb, var(--color-text) 2%, transparent);
}

.month__cell--today .month__dayno {
  color: var(--color-accent);
}

.month__cell--active {
  background: var(--color-accent);
  color: var(--color-bg);
}

.month__cell--active .month__dayno,
.month__cell--active .month__count {
  color: var(--color-bg);
}

.month__daterow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.month__dayno {
  font: 600 15px/1 var(--font-heading);
}

.month__count {
  font: 600 10px/1 var(--font-heading);
  letter-spacing: 0.04em;
  padding: 2px 5px;
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
  color: var(--color-accent-700);
}

.month__cell--active .month__count {
  background: color-mix(in srgb, var(--color-bg) 26%, transparent);
}

.month__bars {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
  margin-top: auto;
}

.month__bar {
  height: 4px;
  flex: 1 1 14px;
  min-width: 14px;
  max-width: 28px;
  background: var(--color-accent);
}

.month__cell--active .month__bar {
  background: var(--color-bg);
}

.month__more {
  font: 400 10px/1 var(--font-body);
  color: var(--color-neutral-600);
}

.month__cell--active .month__more {
  color: var(--color-bg);
}

@media (max-width: 1023.98px) {
  .month__grid {
    grid-auto-rows: minmax(64px, 1fr);
  }

  .month__cell {
    padding: 6px;
  }

  .month__bars {
    display: none;
  }
}
</style>
