<template>
  <app-dialog
    :model-value="modelValue"
    :title="t('hours.edit')"
    :can-save="isValid"
    @update:model-value="$emit('update:modelValue', $event)"
    @save="save"
  >
    <div class="week">
      <div v-for="(day, index) in days" :key="day.sequence" class="day">
        <label class="day__toggle">
          <input v-model="day.isEnabled" type="checkbox" />
          <span class="day__name" :class="{ 'day__name--off': !day.isEnabled }">
            {{ labels[index] }}
          </span>
        </label>

        <div v-if="day.isEnabled" class="day__times">
          <div class="pair">
            <span class="pair__label">{{ t('hours.open') }}</span>
            <input v-model="day.workStartTime" class="input time" type="time" />
          </div>
          <div class="pair">
            <span class="pair__label">{{ t('hours.close') }}</span>
            <input v-model="day.workEndTime" class="input time" type="time" />
          </div>

          <label class="pair pair--check">
            <input v-model="day.enableBreakTime" type="checkbox" />
            <span class="pair__label">{{ t('hours.breakTime') }}</span>
          </label>

          <template v-if="day.enableBreakTime">
            <input v-model="day.breakStartTime" class="input time" type="time" />
            <input v-model="day.breakEndTime" class="input time" type="time" />
          </template>
        </div>

        <div v-else class="day__closed">{{ t('hours.closed') }}</div>

        <div v-if="touched && errors[index]" class="err">{{ t(errors[index]) }}</div>
      </div>
    </div>

    <template #actions>
      <button class="btn btn-secondary dlg-btn" type="button" @click="close">
        {{ t('common.cancel') }}
      </button>
      <button class="btn btn-primary dlg-btn" type="button" :disabled="!isValid" @click="save">
        {{ t('common.save') }}
      </button>
    </template>
  </app-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import moment from 'moment'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/components/ui/AppDialog.vue'
import { useScheduleStore } from '@/stores/schedule'

/**
 * Edits the seven days of the general weekly schedule.
 *
 * The Hours page could always draw the week pattern and never change it, so an
 * owner could see their hours in admin but had to open the phone app to alter
 * them. This is the missing half.
 *
 * Scope is deliberately the weekly pattern only. Custom one-off overrides carry
 * date ranges and a no-overlap rule between them, which apps/mobile models
 * properly; duplicating that here badly would be worse than leaving those
 * read-only, as they are on the page.
 *
 * Times cross the wire as "HH:mm:ss" (a .NET TimeSpan) and `<input type="time">`
 * speaks "HH:mm", so they are converted on the way in and back out.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { t } = useI18n()
const schedules = useScheduleStore()

/** "09:00:00" or "09:00" -> "09:00" for the time input. */
const toInput = (value) => (value ? String(value).slice(0, 5) : '')
/** "09:00" -> "09:00:00" for the API. */
const toApi = (value) => (value ? `${String(value).slice(0, 5)}:00` : '00:00:00')

const minutes = (value) => {
  const [h, m] = toInput(value).split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

// scheduleOnDays is Monday-first, matching how the page and the API's own
// (day + 6) % 7 shift read it, so the labels are rotated rather than taken in
// locale order — moment's en week starts on Sunday.
const names = moment.weekdaysShort()
const labels = Array.from({ length: 7 }, (_, i) => names[(i + 1) % 7])

const days = ref([])
const touched = ref(false)

const errors = computed(() =>
  days.value.map((day) => {
    if (!day.isEnabled) return null

    const open = minutes(day.workStartTime)
    const close = minutes(day.workEndTime)
    if (open === null || close === null) return 'validation.required'
    if (close <= open) return 'validation.endBeforeStart'

    if (!day.enableBreakTime) return null

    const breakStart = minutes(day.breakStartTime)
    const breakEnd = minutes(day.breakEndTime)
    if (breakStart === null || breakEnd === null) return 'validation.required'
    if (breakEnd <= breakStart) return 'validation.breakEndBeforeStart'
    if (breakStart < open || breakEnd > close) return 'validation.breakOutsideHours'

    return null
  })
)

const isValid = computed(() => errors.value.every((error) => !error))

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    touched.value = false

    const week = schedules.weekSchedule
    // Sorted by sequence rather than trusting array order: the day rows come
    // back from Postgres in whatever order it likes, and the whole week would
    // land on the wrong labels if the API ever stopped ordering them.
    const stored = [...(week?.scheduleOnDays ?? [])].sort((a, b) => a.sequence - b.sequence)

    days.value = Array.from({ length: 7 }, (_, index) => {
      const day = stored[index]
      return day
        ? {
            ...day,
            workStartTime: toInput(day.workStartTime),
            workEndTime: toInput(day.workEndTime),
            breakStartTime: toInput(day.breakStartTime),
            breakEndTime: toInput(day.breakEndTime)
          }
        : {
            sequence: index + 1,
            workStartTime: '09:00',
            workEndTime: '18:00',
            breakStartTime: '13:00',
            breakEndTime: '14:00',
            enableBreakTime: false,
            isEnabled: index < 5
          }
    })
  }
)

function close() {
  emit('update:modelValue', false)
}

async function save() {
  touched.value = true
  if (!isValid.value) return

  const week = schedules.weekSchedule
  if (!week) return

  // Every day travels, always. UpdateSchedule deletes the schedule's existing
  // days before re-adding the body's, so a short list is a destructive edit —
  // see the note on updateSchedule in the store.
  await schedules.updateSchedule({
    ...week,
    scheduleOnDays: days.value.map((day) => ({
      ...day,
      workStartTime: toApi(day.workStartTime),
      workEndTime: toApi(day.workEndTime),
      breakStartTime: toApi(day.breakStartTime),
      breakEndTime: toApi(day.breakEndTime)
    }))
  })

  emit('saved')
  close()
}
</script>

<style scoped>
.week {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.day {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: 8px 0;
  border-bottom: 1px solid var(--color-rule);
}

.day__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 88px;
  cursor: pointer;
}

.day__name {
  font: 600 12px var(--font-heading);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.day__name--off {
  color: var(--color-text-muted);
}

.day__times {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.pair {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pair--check {
  cursor: pointer;
}

.pair__label {
  font: 400 11px var(--font-body);
  color: var(--color-text-muted);
}

.time {
  width: 108px;
}

.day__closed {
  font: 400 12px var(--font-body);
  color: var(--color-text-muted);
}

.err {
  flex-basis: 100%;
  font: 400 11px var(--font-body);
  color: #8f4741;
}

.dlg-btn {
  min-height: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 11px;
}
</style>
