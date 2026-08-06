<template>
  <lucide-icon
    :type="lucideType"
    :size="Number(size)"
    :color="color"
    :stroke-width="strokeWidth"
    @click="$emit('click')"
  />
</template>

<script>
import lucideIcon from '../lucide-icon.vue'

/**
 * The icon component every screen already calls, re-pointed at Lucide.
 *
 * The Industry design system specifies Lucide at stroke-width 1.5 in place of
 * the `uniicons` font this app shipped with. Rather than rewrite the ~19 files
 * that render an icon, the swap happens here: the props, the `click` event and
 * the `type` names are unchanged, and MAP translates each uniicons name to its
 * Lucide equivalent.
 *
 * Names with no sensible Lucide counterpart fall through to the closest one
 * rather than rendering nothing; anything genuinely unmapped warns in
 * lucide-icon so it shows up in development rather than as a silent blank.
 *
 * The font files (`uniiconsnew.ttf`, `uniiconsnew.css`) are no longer imported
 * — that is ~90 KB out of the bundle.
 */
const MAP = {
  // navigation / chrome
  arrowright: 'chevron-right',
  arrowleft: 'chevron-left',
  arrowdown: 'chevron-down',
  arrowup: 'chevron-up',
  back: 'arrow-left',
  refresh: 'refresh',
  search: 'search',
  clear: 'close',
  closeempty: 'close',
  close: 'close',
  'more-filled': 'more',
  more: 'more',

  // actions
  plus: 'plus',
  plusempty: 'plus',
  compose: 'edit',
  trash: 'trash',
  'trash-filled': 'trash',
  checkmarkempty: 'check',
  checkmark: 'check',
  upload: 'upload',
  personadd: 'user-plus',

  // state marks
  circle: 'circle',
  smallcircle: 'circle',
  checkbox: 'check-square',
  'checkbox-filled': 'check-square',

  // domain
  calendar: 'calendar',
  notification: 'bell',
  person: 'user',
  contact: 'user',
  customers: 'clients',
  day: 'day',
  services: 'services',
  cart: 'services',
  'email-filled': 'mail',
  email: 'mail',
  'phone-filled': 'phone',
  phone: 'phone',
  gear: 'settings',
  settings: 'settings'
}

export default {
  name: 'UniIcons',
  components: { lucideIcon },
  emits: ['click'],
  props: {
    type: { type: String, default: '' },
    color: { type: String, default: '#1d1f20' },
    size: { type: [Number, String], default: 16 },
    /**
     * Retained so existing call sites that pass it keep working; the icon set
     * is a single weight now, so it is not read.
     */
    customPrefix: { type: String, default: '' }
  },
  computed: {
    lucideType() {
      return MAP[this.type] || this.type
    },
    /**
     * 1.5 throughout, per the system. The one exception is a tick sitting on a
     * filled accent chip, where a hairline disappears against the fill.
     */
    strokeWidth() {
      return this.type === 'checkmarkempty' || this.type === 'checkmark' ? 2.25 : 1.5
    }
  }
}
</script>
