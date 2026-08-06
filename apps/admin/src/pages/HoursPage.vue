<template>
  <app-shell :page-title="t('nav.hours')" :page-sub="pageSub">
    <div class="page">
      <div class="page__main">
        <div class="plate">
          <div class="plate__kicker">{{ t('hours.generalSchedule') }}</div>
          <div class="plate__title">{{ t('hours.weekPattern') }}</div>
          <div class="plate__range">{{ range }}</div>
        </div>

        <div v-for="row in weekRows" :key="row.day" class="row">
          <div class="row__day" :class="{ 'row__day--off': row.closed }">{{ row.day }}</div>
          <!-- The bar is the day's span laid against the same 08:00–20:00 window
               the calendar uses, so a short day reads as a short bar. -->
          <div class="row__track">
            <div
              v-if="!row.closed"
              class="row__bar"
              :style="{ left: row.barLeft, width: row.barWidth }"
            />
          </div>
          <div class="row__hours" :class="{ 'row__hours--off': row.closed }">{{ row.hours }}</div>
        </div>
      </div>

      <div class="page__side">
        <div class="page__side-label">{{ t('hours.overrides') }}</div>

        <div v-for="override in overrides" :key="override.id" class="blueprint override">
          <i class="corner tl" /><i class="corner tr" /><i class="corner bl" /><i class="corner br" />
          <div>
            <div class="override__date">{{ override.date }}</div>
            <div class="override__note">{{ override.note }}</div>
          </div>
          <span class="tag tag-accent">{{ t('hours.custom') }}</span>
        </div>

        <div v-if="!overrides.length" class="page__empty">{{ t('hours.noOverrides') }}</div>
      </div>
    </div>
  </app-shell>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import moment from 'moment'
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/AppShell.vue'
import { useScheduleStore } from '@/stores/schedule'
import { useEmployeeStore } from '@/stores/employee'
import { GRID_START, GRID_END, toMinutes } from '@/composables/useDayColumns'

const { t } = useI18n()
const schedules = useScheduleStore()
const employees = useEmployeeStore()

const week = computed(() => schedules.weekSchedule)

const pageSub = computed(() => {
  const open = weekRows.value.filter((row) => !row.closed).length
  return t('hours.openDays', [open])
})

const range = computed(() => {
  if (!week.value) return '—'
  const from = moment(week.value.scheduleStartDate).format('DD.MM.YYYY')
  const to = moment(week.value.scheduleEndDate).format('DD.MM.YYYY')
  return `${from} — ${to}`
})

const SPAN = GRID_END - GRID_START

const weekRows = computed(() => {
  const days = week.value?.scheduleOnDays ?? []
  // scheduleOnDays is Monday-first (the API indexes it that way, and
  // PublicOwnerController reads it with the same (day + 6) % 7 shift), so the
  // labels have to be shifted to match rather than taking the locale ordering:
  // moment.weekdaysShort(true) starts on Sunday for en, which put Monday data
  // under a Sunday heading.
  const names = moment.weekdaysShort()
  const labels = Array.from({ length: 7 }, (_, i) => names[(i + 1) % 7])

  return Array.from({ length: 7 }, (_, index) => {
    const day = days[index]
    const enabled = Boolean(day && day.isEnabled !== false)
    const open = enabled ? toMinutes(day.workStartTime) : null
    const close = enabled ? toMinutes(day.workEndTime) : null

    return {
      day: labels[index] ?? '',
      closed: !enabled,
      hours: enabled ? `${fmt(day.workStartTime)} – ${fmt(day.workEndTime)}` : t('hours.closed'),
      barLeft: enabled ? `${((open - GRID_START) / SPAN) * 100}%` : '0%',
      barWidth: enabled ? `${((close - open) / SPAN) * 100}%` : '0%'
    }
  })
})

const overrides = computed(() =>
  schedules.customSchedules.map((schedule) => {
    const day = schedule.scheduleOnDays?.[0]
    const enabled = Boolean(day && day.isEnabled !== false)
    return {
      id: schedule.id,
      date: moment(schedule.scheduleStartDate).format('DD.MM.YYYY'),
      note: enabled
        ? `${fmt(day.workStartTime)} – ${fmt(day.workEndTime)}`
        : t('hours.markedOff')
    }
  })
)

/** "09:00:00" → "09:00" */
function fmt(time) {
  return String(time ?? '').slice(0, 5)
}

// The shell loads the schedules; this page only reads them. Refetch if the
// selected employee changes, since each has their own hours.
watch(
  () => employees.currentEmployeeId,
  (id) => {
    if (id) schedules.fetchSchedules(id)
  }
)
</script>

<style scoped>
.page {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 22px 26px 30px;
  display: flex;
  gap: 26px;
  align-items: flex-start;
}

.page__main {
  flex: 1;
  min-width: 0;
  max-width: 720px;
}

.plate {
  background: var(--color-accent-900);
  color: #f2f2f3;
  padding: 15px 16px;
  margin-bottom: 18px;
}

.plate__kicker {
  font: 400 9.5px/1 var(--font-body);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.62;
}

.plate__title {
  font: 600 24px/1.1 var(--font-heading);
  margin-top: 6px;
}

.plate__range {
  font: 400 11px/1 var(--font-body);
  opacity: 0.7;
  margin-top: 6px;
}

.row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 2px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
}

.row__day {
  width: 46px;
  font: 600 12.5px var(--font-heading);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.row__day--off,
.row__hours--off {
  color: var(--color-neutral-500);
}

.row__track {
  flex: 1;
  height: 9px;
  position: relative;
  background: color-mix(in srgb, var(--color-text) 7%, transparent);
}

.row__bar {
  position: absolute;
  top: 0;
  bottom: 0;
  background: var(--color-accent);
}

.row__hours {
  width: 110px;
  text-align: right;
  font: 600 13px var(--font-heading);
  letter-spacing: 0.03em;
}

.page__side {
  width: 320px;
  flex: none;
}

.page__side-label {
  font: 400 10px var(--font-body);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin-bottom: 12px;
}

.override {
  margin: 0 6px 14px;
  padding: 12px 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.override__date {
  font: 600 14.5px/1.2 var(--font-heading);
}

.override__note {
  font: 400 11px/1.4 var(--font-body);
  color: var(--color-neutral-600);
}

.page__empty {
  padding: 20px 6px;
  font: 400 11.5px var(--font-body);
  color: var(--color-neutral-600);
}
</style>
