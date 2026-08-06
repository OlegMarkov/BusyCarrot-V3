<template>
  <div class="timeline">
    <div v-if="column?.closed" class="timeline__off">{{ closedLabel }}</div>

    <template v-else>
      <div v-for="item in column?.timeline ?? []" :key="item.key" class="tl-row">
        <div class="tl-row__gutter">
          <div class="tl-row__start">{{ startOf(item) }}</div>
          <div class="tl-row__dur">{{ durationOf(item) }}</div>
        </div>

        <!-- a booking: a framed object, with the registration marks -->
        <div
          v-if="item.type === 'booking'"
          class="blueprint booking"
          :class="{ 'booking--on': item.id === selectedId }"
          @click="$emit('select', { id: item.id, dayKey: column.key })"
        >
          <i class="corner tl" /><i class="corner tr" /><i class="corner bl" /><i class="corner br" />
          <div class="booking__main">
            <div class="booking__name">{{ item.name }}</div>
            <div class="booking__services">{{ item.services }}</div>
          </div>
          <div class="booking__cost">{{ item.cost }}</div>
        </div>

        <!-- a gap: the booking affordance, drawn as an empty dashed frame -->
        <div v-else class="gap" @click="$emit('new-booking', { dayKey: column.key, start: item.start })">
          <span class="gap__label">{{ addLabel }}</span>
        </div>
      </div>

      <div v-if="!column?.timeline?.length" class="timeline__off">{{ emptyLabel }}</div>
    </template>
  </div>
</template>

<script setup>
import { fromMinutes, formatDuration } from '@/composables/useDayColumns'

/**
 * The day as a vertical list — the mobile counterpart of TimeGrid.
 *
 * TimeGrid positions blocks absolutely against an 08:00–20:00 window, which
 * needs a column wide enough to read; under the breakpoint there is no such
 * width, so the same day is drawn as a flow instead. Both read the identical
 * column shape out of useDayColumns, so there is one source of truth for what
 * a day contains — only the drawing differs.
 */
defineProps({
  column: { type: Object, default: null },
  selectedId: { type: String, default: null },
  closedLabel: { type: String, default: '' },
  emptyLabel: { type: String, default: '' },
  addLabel: { type: String, default: '' }
})

defineEmits(['select', 'new-booking'])

const startOf = (item) => fromMinutes(item.start)
const durationOf = (item) => formatDuration(item.duration)
</script>

<style scoped>
.timeline {
  display: flex;
  flex-direction: column;
  gap: 13px;
  padding: 15px 16px 22px;
}

.timeline__off {
  padding: 34px 0;
  text-align: center;
  font: 400 12px/1 var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.tl-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

/* The gutter is fixed and right-aligned so every start time stacks on one
   edge — the list reads as a clock down the left. */
.tl-row__gutter {
  width: 42px;
  flex: none;
  text-align: right;
  padding-top: 2px;
}

.tl-row__start {
  font: 600 14px/1.1 var(--font-heading);
  color: var(--color-text);
}

.tl-row__dur {
  font: 400 10px/1.3 var(--font-body);
  color: var(--color-neutral-600);
  margin-top: 2px;
}

.booking {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 11px;
  cursor: pointer;
  background: transparent;
}

.booking--on {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}

.booking__main {
  flex: 1;
  min-width: 0;
}

.booking__name {
  font: 600 15px/1.2 var(--font-heading);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking__services {
  font: 400 11.5px/1.35 var(--font-body);
  color: var(--color-neutral-600);
  margin-top: 3px;
}

.booking__cost {
  font: 600 14px/1.2 var(--font-heading);
  color: var(--color-text);
  flex: none;
}

.gap {
  flex: 1;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--color-divider);
  cursor: pointer;
}

.gap:hover {
  background: color-mix(in srgb, var(--color-accent) 6%, transparent);
}

.gap__label {
  font: 400 11px/1 var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}
</style>
