<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, i) in paths" :key="i" :d="d" />
  </svg>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Lucide (https://lucide.dev) at stroke-width 1.5, the icon set Industry
 * specifies.
 *
 * Inline SVG here, unlike the mobile app's data-URI variant — admin is a
 * browser app, so `currentColor` works and the icon inherits whatever colour
 * its container sets. Only the glyphs the design uses are carried.
 */
const GLYPHS = {
  calendar: ['M3 4h18v18H3z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  clients: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8',
    'M22 21v-2a4 4 0 0 0-3-3.87'
  ],
  services: [
    'M6 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
    'M6 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6',
    'M20 4 8.12 15.88',
    'M14.47 14.48 20 20',
    'M8.12 8.12 12 12'
  ],
  hours: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18', 'M12 7v5l3 2'],
  settings: [
    'M4 21v-7',
    'M4 10V3',
    'M12 21v-9',
    'M12 8V3',
    'M20 21v-5',
    'M20 12V3',
    'M1 14h6',
    'M9 8h6',
    'M17 16h6'
  ],
  search: ['M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14', 'm20 20-3.5-3.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  check: ['M20 6 9 17l-5-5'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-left': ['m15 18-6-6 6-6'],
  phone: [
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z'
  ],
  message: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9']
}

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 17 }
})

const paths = computed(() => {
  const glyph = GLYPHS[props.name]
  if (!glyph) console.warn(`[LucideIcon] unknown icon "${props.name}"`)
  return glyph || []
})
</script>
