/**
 * The dashboard's "which day are we looking at" channel.
 *
 * Replaces `new BroadcastChannel('dateBC')`, which the original used in four
 * places (pages/index, dashboard-list, swipe-calendar, reservation/edit) to keep
 * the calendar strip, the day swiper and the page header in sync. BroadcastChannel
 * is part of the weex runtime and is not available once these are `.vue`, so this
 * uses uni-app's own global event bus.
 *
 * Behavioural difference worth knowing: BroadcastChannel did NOT deliver a message
 * back to the context that posted it, whereas `uni.$emit` notifies every listener
 * including the sender. Subscribers that also publish must therefore ignore their
 * own echo — `publishDate` passes a `source` tag for exactly that.
 */
const CHANNEL = 'dateBC'

export function publishDate(date, source = null) {
  uni.$emit(CHANNEL, { date, source })
}

/**
 * @param {string} subscriber identifies the caller so its own posts are skipped
 * @param {(date: string) => void} handler
 * @returns {() => void} unsubscribe, to be called from onUnload
 */
export function subscribeDate(subscriber, handler) {
  const listener = ({ date, source }) => {
    if (source && source === subscriber) return
    handler(date)
  }
  uni.$on(CHANNEL, listener)
  return () => uni.$off(CHANNEL, listener)
}
