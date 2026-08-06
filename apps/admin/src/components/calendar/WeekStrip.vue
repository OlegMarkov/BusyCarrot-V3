<template>
  <div class="strip">
    <div
      v-for="column in columns"
      :key="column.key"
      class="strip__cell"
      :class="{ 'strip__cell--on': column.key === activeKey }"
      @click="$emit('pick-day', column.key)"
    >
      <div class="strip__dow">{{ column.dow }}</div>
      <div class="strip__date">{{ column.dayNumber }}</div>
      <!-- A 4px square rather than a dot: the system has no round corners. -->
      <div class="strip__mark" :class="{ 'strip__mark--on': column.reservations.length }" />
    </div>
  </div>
</template>

<script setup>
/**
 * The mobile day picker: one cell per day of the week, the selected one
 * inverted to the accent-900 field. Desktop uses the column heads of the week
 * grid for the same job, which is why this only appears under the breakpoint.
 */
defineProps({
  columns: { type: Array, required: true },
  activeKey: { type: String, default: '' }
})

defineEmits(['pick-day'])
</script>

<style scoped>
.strip {
  display: flex;
  flex: none;
  border-bottom: 1px solid var(--color-divider);
}

.strip__cell {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0 7px;
  cursor: pointer;
  border-right: 1px solid var(--color-divider);
}

.strip__cell:last-child {
  border-right: 0;
}

.strip__cell--on {
  background: var(--color-accent-900);
  color: #f2f2f3;
}

.strip__dow {
  font: 400 9px/1 var(--font-body);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.62;
}

.strip__date {
  font: 600 17px/1 var(--font-heading);
}

.strip__mark {
  width: 4px;
  height: 4px;
  background: transparent;
}

.strip__mark--on {
  background: var(--color-accent);
}

/* On the inverted cell the accent square would disappear into the field. */
.strip__cell--on .strip__mark--on {
  background: #f2f2f3;
}
</style>
