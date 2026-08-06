<template>
  <div class="grid">
    <!-- column heads -->
    <div class="grid__head">
      <div class="grid__gutter-head" />
      <div
        v-for="column in columns"
        :key="column.key"
        class="grid__col-head"
        :class="{ 'grid__col-head--active': column.key === activeKey }"
        @click="$emit('pick-day', column.key)"
      >
        <div class="grid__dow">{{ column.dow }}</div>
        <div class="grid__daterow">
          <span class="grid__dayno">{{ column.dayNumber }}</span>
          <span class="grid__sub">{{ column.sub }}</span>
        </div>
      </div>
    </div>

    <!-- the scrolling body -->
    <div class="grid__scroll">
      <div class="grid__inner">
        <!-- hour gutter -->
        <div class="grid__gutter" :style="{ height: gridHeight }">
          <div
            v-for="hour in hourRows"
            :key="hour.minutes"
            class="grid__hour"
            :style="{ top: hour.top }"
          >
            {{ hour.label }}
          </div>
        </div>

        <div
          v-for="column in columns"
          :key="column.key"
          class="grid__col"
          :style="{ height: gridHeight }"
        >
          <div
            v-for="hour in hourRows"
            :key="hour.minutes"
            class="grid__rule"
            :style="{ top: hour.top }"
          />

          <!-- A closed day is hatched rather than blanked, so it still reads as
               a column of the week instead of a hole in the grid. -->
          <div v-if="column.closed" class="grid__closed">
            <span class="grid__closed-text">{{ closedLabel }}</span>
          </div>

          <div
            v-for="gap in column.gaps"
            :key="gap.key"
            class="grid__gap"
            :style="{ top: gap.top, height: gap.height }"
            @click="$emit('new-booking', { dayKey: column.key, start: gap.start })"
          >
            <span class="grid__gap-label">{{ gap.label }}</span>
          </div>

          <div
            v-for="block in column.blocks"
            :key="block.key"
            class="blueprint grid__block"
            :class="{ 'grid__block--selected': block.id === selectedId }"
            :style="{ top: block.top, height: block.height }"
            @click="$emit('select', { id: block.id, dayKey: column.key })"
          >
            <i class="corner tl" /><i class="corner tr" /><i class="corner bl" /><i class="corner br" />
            <div class="grid__block-head">
              <span class="grid__block-name" :style="{ fontSize: block.nameSize }">
                {{ block.name }}
              </span>
              <span class="grid__block-cost">{{ block.cost }}</span>
            </div>
            <div v-if="block.showTime" class="grid__block-meta">{{ block.time }}</div>
            <div v-if="block.showServices" class="grid__block-meta">{{ block.services }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * The week/day calendar: an hour gutter beside one column per day, with
 * bookings positioned absolutely by their start time and sized by duration.
 *
 * This replaces Vuetify's `VCalendar`, which cannot draw a proportional time
 * grid — it lays events out as chips in day cells, not as blocks against a
 * ruler. The geometry constants come straight from the design.
 */
const GRID_START = 480 // 08:00, in minutes from midnight
const GRID_END = 1200 // 20:00
const PX_PER_MINUTE = 0.95

const props = defineProps({
  /** [{ key, dow, dayNumber, sub, closed, open, close, reservations }] */
  columns: { type: Array, required: true },
  activeKey: { type: String, default: '' },
  selectedId: { type: [String, Number], default: null },
  closedLabel: { type: String, default: 'Closed' }
})

defineEmits(['pick-day', 'new-booking', 'select'])

const gridHeight = computed(() => `${(GRID_END - GRID_START) * PX_PER_MINUTE}px`)

const hourRows = computed(() => {
  const rows = []
  for (let m = GRID_START; m <= GRID_END; m += 60) {
    rows.push({
      minutes: m,
      label: `${String(Math.floor(m / 60)).padStart(2, '0')}:00`,
      top: `${(m - GRID_START) * PX_PER_MINUTE}px`
    })
  }
  return rows
})

void props
</script>

<script>
/** Shared with the page that assembles `columns`, so the maths lives in one place. */
export const GRID = { start: 480, end: 1200, pxPerMinute: 0.95 }
</script>

<style scoped>
.grid {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.grid__head {
  flex: none;
  display: flex;
  border-bottom: 1px solid var(--color-divider);
}

.grid__gutter-head {
  width: 58px;
  flex: none;
}

.grid__col-head {
  flex: 1;
  min-width: 0;
  padding: 10px 12px 11px;
  cursor: pointer;
  border-left: 1px solid var(--color-divider);
}

.grid__col-head:hover {
  background: color-mix(in srgb, var(--color-text) 4%, transparent);
}

.grid__col-head--active {
  background: var(--color-accent);
  color: var(--color-bg);
}

.grid__dow {
  font: 400 9.5px/1 var(--font-body);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.66;
}

.grid__daterow {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-top: 5px;
}

.grid__dayno {
  font: 600 21px/1 var(--font-heading);
}

.grid__sub {
  font: 400 10.5px/1 var(--font-body);
  opacity: 0.7;
}

.grid__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.grid__inner {
  display: flex;
  position: relative;
  padding: 10px 0 24px;
}

.grid__gutter {
  width: 58px;
  flex: none;
  position: relative;
}

.grid__hour {
  position: absolute;
  right: 9px;
  transform: translateY(-50%);
  font: 400 10.5px/1 var(--font-body);
  color: var(--color-neutral-500);
  letter-spacing: 0.04em;
}

.grid__col {
  flex: 1;
  min-width: 0;
  position: relative;
  border-left: 1px solid var(--color-divider);
}

.grid__rule {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: color-mix(in srgb, var(--color-text) 7%, transparent);
}

.grid__closed {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(
    135deg,
    transparent 0 9px,
    color-mix(in srgb, var(--color-text) 5%, transparent) 9px 10px
  );
}

.grid__closed-text {
  font: 600 10px/1 var(--font-heading);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-neutral-500);
  writing-mode: vertical-rl;
}

.grid__gap {
  position: absolute;
  left: 5px;
  right: 5px;
  cursor: pointer;
  border: 1px dashed color-mix(in srgb, var(--color-accent) 45%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid__gap:hover {
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.grid__gap-label {
  font: 600 10px/1 var(--font-heading);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent-700);
  opacity: 0.75;
}

.grid__block {
  position: absolute;
  left: 5px;
  right: 5px;
  overflow: hidden;
  padding: 7px 9px;
  cursor: pointer;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.grid__block--selected {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-color: var(--color-accent);
}

.grid__block-head {
  flex: none;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
}

.grid__block-name {
  font-family: var(--font-heading);
  font-weight: 600;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.grid__block-cost {
  font: 600 12px/1 var(--font-heading);
  color: var(--color-accent-700);
  flex: none;
}

.grid__block-meta {
  flex: none;
  font: 400 10.5px/1.35 var(--font-body);
  color: var(--color-neutral-600);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
