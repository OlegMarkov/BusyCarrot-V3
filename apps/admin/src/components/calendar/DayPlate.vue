<template>
  <div class="plate">
    <div>
      <div class="plate__kicker">{{ weekday }}</div>
      <div class="plate__date">{{ date }}</div>
      <div class="plate__hours">{{ hours }}</div>
    </div>
    <div class="plate__money">
      <div class="plate__kicker">{{ todayLabel }}</div>
      <div class="plate__total">{{ total }}</div>
      <div class="plate__month">{{ monthLabel }} {{ month }}</div>
    </div>
  </div>
</template>

<script setup>
/**
 * The day header — the system's one solid colour field.
 *
 * It lives at the top of the right rail on desktop and above the timeline on
 * mobile. Same content in both, so it is a component rather than two copies.
 */
defineProps({
  weekday: { type: String, default: '' },
  date: { type: String, default: '' },
  hours: { type: String, default: '' },
  total: { type: String, default: '' },
  month: { type: String, default: '' },
  todayLabel: { type: String, default: '' },
  monthLabel: { type: String, default: '' }
})
</script>

<style scoped>
.plate {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 16px 17px;
  background: var(--color-accent-900);
  color: #f2f2f3;
}

.plate__kicker {
  font: 400 10px/1 var(--font-body);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.62;
}

.plate__date {
  font: 600 38px/0.95 var(--font-heading);
  margin-top: 6px;
}

.plate__hours {
  font: 400 11.5px/1.3 var(--font-body);
  opacity: 0.72;
  margin-top: 7px;
}

.plate__money {
  text-align: right;
  flex: none;
}

.plate__total {
  font: 600 27px/1 var(--font-heading);
  margin-top: 6px;
}

.plate__month {
  font: 400 10.5px/1.3 var(--font-body);
  opacity: 0.62;
  margin-top: 5px;
}
</style>
