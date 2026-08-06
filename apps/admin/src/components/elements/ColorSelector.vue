<template>
  <div class="colors">
    <button
      v-for="option in COLORS"
      :key="option.name"
      type="button"
      class="colors__swatch"
      :class="{ 'colors__swatch--on': option.name === modelValue }"
      :style="{ backgroundColor: option.hex }"
      :title="option.name"
      :aria-label="option.name"
      :aria-pressed="option.name === modelValue"
      @click="$emit('update:modelValue', option.name)"
    />
  </div>
</template>

<script setup>
/**
 * The employee/service colour picker.
 *
 * Rebuilt without Vuetify: it used `v-dialog` + `v-avatar` swatches and stored
 * Vuetify's own colour *names* ('red', 'deep-purple', …). Those names are what
 * Vegetable.API already holds and what the mobile app reads, so the stored
 * value is unchanged — only the rendering is ours now, with the palette mapped
 * to hex here rather than resolved by a framework that is no longer installed.
 *
 * Industry says not to add decorative colour beyond the accent, and the desktop
 * calendar honours that: blocks are drawn in the ground colour whatever an
 * employee's swatch says. The field is kept because the API and mobile use it.
 */
const COLORS = [
  { name: 'red', hex: '#f44336' },
  { name: 'pink', hex: '#e91e63' },
  { name: 'purple', hex: '#9c27b0' },
  { name: 'deep-purple', hex: '#673ab7' },
  { name: 'indigo', hex: '#3f51b5' },
  { name: 'blue', hex: '#2196f3' },
  { name: 'light-blue', hex: '#03a9f4' },
  { name: 'cyan', hex: '#00bcd4' },
  { name: 'teal', hex: '#009688' },
  { name: 'green', hex: '#4caf50' },
  { name: 'light-green', hex: '#8bc34a' },
  { name: 'lime', hex: '#cddc39' },
  { name: 'yellow', hex: '#ffeb3b' },
  { name: 'amber', hex: '#ffc107' },
  { name: 'orange', hex: '#ff9800' },
  { name: 'deep-orange', hex: '#ff5722' },
  { name: 'brown', hex: '#795548' },
  { name: 'blue-grey', hex: '#607d8b' },
  { name: 'grey', hex: '#9e9e9e' }
]

defineProps({
  modelValue: { type: String, default: 'red' }
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.colors {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.colors__swatch {
  width: 26px;
  height: 26px;
  padding: 0;
  cursor: pointer;
  border: 1px solid var(--color-divider);
  border-radius: 0;
}

/* The selection is marked by an accent frame and an inset gap, so the swatch's
   own colour still reads through. */
.colors__swatch--on {
  border-color: var(--color-accent);
  box-shadow: inset 0 0 0 2px var(--color-bg);
}

.colors__swatch:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
