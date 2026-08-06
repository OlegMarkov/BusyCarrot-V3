/**
 * The dashboard's "open a sheet" channel.
 *
 * The day rows that know *what* was tapped live three levels down — inside a
 * `<swiper-item>` in dashboard-list — and a sheet rendered there would be
 * clipped by the swiper. So the rows announce the intent and the page, which
 * owns the whole viewport, renders the sheet.
 *
 * Same shape as date-bus.js, and the same caveat: `uni.$emit` notifies the
 * sender too. Nothing here both publishes and subscribes today, but the API
 * keeps the option open.
 */
const CHANNEL = 'sheetBC'

/** @param {'new'|'detail'} kind @param {object} payload */
export function openSheet(kind, payload = {}) {
  uni.$emit(CHANNEL, { kind, payload })
}

/**
 * @param {(kind: string, payload: object) => void} handler
 * @returns {() => void} unsubscribe, to be called from onUnload
 */
export function subscribeSheet(handler) {
  const listener = ({ kind, payload }) => handler(kind, payload)
  uni.$on(CHANNEL, listener)
  return () => uni.$off(CHANNEL, listener)
}
