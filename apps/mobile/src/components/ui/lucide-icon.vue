<template>
  <view class="lucide" :style="boxStyle">
    <!--
      Rendered as an inline data-URI <image> rather than an <svg> element:
      uni-app's app-plus renderer does not implement inline SVG, so a literal
      <svg> tag draws nothing on a device even though it works in H5. A data
      URI goes through the normal image pipeline and behaves on both.
      `currentColor` cannot cross that boundary, hence the explicit `color`.
    -->
    <!-- aspectFit, not widthFix: widthFix derives the height from the source and
         rounded a 25px box to 25×26, so icons sat a pixel off their baseline. -->
    <image :src="dataUri" :style="boxStyle" mode="aspectFit" />
  </view>
</template>

<script>
/**
 * Lucide icons (https://lucide.dev) at stroke-width 1.5 — the icon set the
 * Industry design system specifies, replacing the `uniicons` font the app
 * shipped before.
 *
 * Only the glyphs the redesign actually uses are carried; each is the path
 * data straight from Lucide, so adding one is a matter of pasting its `d`
 * attributes here rather than importing a package.
 */
const PATHS = {
  // nav / chrome
  refresh: ['M21 12a9 9 0 1 1-3-6.7', 'M21 3v6h-6'],
  search: ['M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14', 'm20 20-3.5-3.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  check: ['M20 6 9 17l-5-5'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-left': ['m15 18-6-6 6-6'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-up': ['m18 15-6-6-6 6'],
  'arrow-left': ['M19 12H5', 'M12 19l-7-7 7-7'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
  edit: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  more: ['M12 5h.01', 'M12 12h.01', 'M12 19h.01'],
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],

  // state marks
  circle: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18'],
  'check-square': ['M9 11l3 3 8-8', 'M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8'],
  'user-plus': [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8',
    'M19 8v6',
    'M22 11h-6'
  ],

  // contact actions
  phone: [
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z'
  ],
  message: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  mail: ['M4 4h16v16H4z', 'm4 6 8 6 8-6'],

  // tab bar
  day: ['M3 4h18v18H3z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
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
  schedule: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18', 'M12 7v5l3 2'],
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

  // notification feed
  calendar: ['M3 4h18v18H3z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  bell: ['M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.7 21a2 2 0 0 1-3.4 0'],
  report: ['M3 3v18h18', 'M7 15l4-4 3 3 5-6']
}

export default {
  name: 'LucideIcon',
  props: {
    /** Key from PATHS above. */
    type: { type: String, required: true },
    size: { type: [Number, String], default: 20 },
    color: { type: String, default: '#1d1f20' },
    /** The system specifies 1.5 throughout; heavier only for the tick on a filled chip. */
    strokeWidth: { type: [Number, String], default: 1.5 }
  },
  computed: {
    boxStyle() {
      const px = `${Number(this.size)}px`
      return `width:${px};height:${px}`
    },
    dataUri() {
      const paths = PATHS[this.type]
      if (!paths) {
        console.warn(`[lucide-icon] unknown icon "${this.type}"`)
        return ''
      }

      const body = paths.map((d) => `<path d="${d}"/>`).join('')
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ` +
        `stroke="${this.color}" stroke-width="${this.strokeWidth}" ` +
        `stroke-linecap="round" stroke-linejoin="round">${body}</svg>`

      // encodeURIComponent rather than base64: it keeps the markup legible in
      // devtools and avoids pulling in a btoa polyfill for app-plus.
      return `data:image/svg+xml,${encodeURIComponent(svg)}`
    }
  }
}
</script>

<style scoped>
.lucide {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
