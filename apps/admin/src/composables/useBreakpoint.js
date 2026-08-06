import { onMounted, onUnmounted, ref } from 'vue'

/**
 * The design's single breakpoint: below 1024px the app wears the mobile layout
 * (bottom tabs, one column, sheets), above it the desktop one (sidebar, week
 * grid, right rail).
 *
 * Nearly all of that is CSS. This exists for the two places where the
 * difference is behaviour rather than presentation and a media query cannot
 * reach: the calendar swapping the week grid for a day timeline, and the rail
 * being always-present on desktop but a dismissable sheet on mobile.
 */
const QUERY = '(max-width: 1023.98px)'

const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY) : null

/** Shared, so every caller reads the same answer within a tick. */
const isMobile = ref(query ? query.matches : false)

function sync() {
  if (query) isMobile.value = query.matches
}

export function useBreakpoint() {
  onMounted(() => {
    if (!query) return

    // Read on mount as well as on change: the module-level read happens at
    // import time, which for a lazily-loaded route can predate the window
    // reaching its final size.
    sync()

    query.addEventListener('change', sync)
    // `resize` is belt and braces. The change event is the right signal and
    // fires on a genuine viewport change, but it does not survive every way a
    // viewport can be resized — device-metric emulation being the one that bit
    // during verification, where the CSS media query updated and the event
    // never arrived. Both call the same idempotent read.
    window.addEventListener('resize', sync)
  })

  onUnmounted(() => {
    if (!query) return
    query.removeEventListener('change', sync)
    window.removeEventListener('resize', sync)
  })

  return { isMobile }
}
