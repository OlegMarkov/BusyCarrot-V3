import { t } from '@/plugins/i18n'

/**
 * Ported from vegetable.mobile.vue/plugins/helpers.js.
 *
 * Two things changed:
 *  - `tabBarText()` moved to plugins/i18n.js as `updateTabBarText()`, where the
 *    other locale-dependent code lives (it was duplicated in three files).
 *  - `String.prototype.format` was a global monkey-patch; it is now the plain
 *    `format()` export below.
 */

export async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function capitalize(s) {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** `format('{0} of {1}', 3, 7)` → '3 of 7'. Was String.prototype.format. */
export function format(template, ...args) {
  return String(template).replace(/{(\d+)}/g, (match, number) =>
    typeof args[number] !== 'undefined' ? args[number] : match
  )
}

/** Minutes → "1h 30m", localized. */
export function timeConvert(n) {
  const hours = n / 60
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  return (wholeHours > 0 ? `${wholeHours}${t('common.hour')} ` : '') + minutes + t('common.minute')
}

export function generateUUID() {
  let d = new Date().getTime()
  let d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16
    if (d > 0) {
      r = (d + r) % 16 | 0
      d = Math.floor(d / 16)
    } else {
      r = (d2 + r) % 16 | 0
      d2 = Math.floor(d2 / 16)
    }
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
