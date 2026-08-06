/**
 * Every `plus.*` touchpoint in the app, in one place.
 *
 * The original called the 5+ runtime directly from ~20 pages and components.
 * That is fine on a device but makes the H5 target — the only cheap way to
 * verify the nvue → vue layout conversion in a browser — crash on the first
 * call. Each function below is conditionally compiled: the real 5+ call on
 * APP-PLUS, a no-op or a reasonable browser equivalent elsewhere.
 *
 * Behaviour on APP-PLUS is intended to be identical to the original.
 */

import { t } from '@/plugins/i18n'

export const isApp = (() => {
  // #ifdef APP-PLUS
  return true
  // #endif
  // eslint-disable-next-line no-unreachable
  return false
})()

/* -------------------------------------------------------------------------
 * Toast
 * ---------------------------------------------------------------------- */

/**
 * Ported from App.vue's `overWriteBackButtonText()`, which monkey-patched
 * plus.nativeUI.toast to translate the hardcoded Chinese "press again to exit"
 * string that the 5+ runtime emits. Rather than reassigning a runtime function,
 * the translation is done here and the patch is installed by installExitToast().
 */
export function toast(message, options = {}) {
  // #ifdef APP-PLUS
  plus.nativeUI.toast(message, {
    duration: options.duration || 'long',
    verticalAlign: options.verticalAlign || 'top'
  })
  return
  // #endif
  // eslint-disable-next-line no-unreachable
  uni.showToast({ title: message, icon: 'none', duration: options.duration === 'long' ? 5000 : 3000 })
}

/** The 5+ runtime's own exit hint, in Chinese, that the original replaced. */
const RUNTIME_EXIT_TOAST = '再按一次退出应用'

export function installExitToast() {
  // #ifdef APP-PLUS
  const original = plus.nativeUI.toast
  plus.nativeUI.toast = function (message, ...rest) {
    if (message === RUNTIME_EXIT_TOAST) {
      uni.showToast({ title: t('main.app-exit'), icon: 'none', duration: 3000 })
      return
    }
    return original.call(plus.nativeUI, message, ...rest)
  }
  // #endif
}

/* -------------------------------------------------------------------------
 * Push
 * ---------------------------------------------------------------------- */

function parsePayload(msg) {
  if (typeof msg.payload === 'string') {
    try {
      return JSON.parse(msg.payload)
    } catch {
      return {}
    }
  }
  return msg.payload || {}
}

/**
 * Ported from App.vue onLaunch. `onClick` and `onReceive` get the parsed
 * payload; the caller decides what to navigate to.
 */
export function registerPushHandlers({ onClick, onReceive } = {}) {
  // #ifdef APP-PLUS
  plus.push.addEventListener('click', (msg) => {
    onClick?.(parsePayload(msg), msg)
  })

  plus.push.addEventListener(
    'receive',
    (msg) => {
      onReceive?.(parsePayload(msg), msg)
    },
    false
  )
  // #endif
}

/**
 * iOS re-raises a local notification for pushes that arrive while the app is in
 * the foreground; Android navigates straight there. Kept exactly as App.vue had it.
 */
export function createLocalNotification({ title, body, url }) {
  // #ifdef APP-PLUS
  plus.push.createMessage(body, JSON.stringify({ isLocal: true, url }), { title })
  // #endif
}

export function getPushClientId() {
  // #ifdef APP-PLUS
  return plus.push.getClientInfo()?.clientid
  // #endif
  // eslint-disable-next-line no-unreachable
  return null
}

export function clearBadge() {
  // #ifdef APP-PLUS
  plus.runtime.setBadgeNumber(0)
  // #endif
}

/* -------------------------------------------------------------------------
 * Runtime
 * ---------------------------------------------------------------------- */

export function openUrl(url) {
  // #ifdef APP-PLUS
  plus.runtime.openURL(url)
  return
  // #endif
  // eslint-disable-next-line no-unreachable
  window.open(url, '_blank')
}

/** App version, compared against Settings.minIOSVersion/minAndroidVersion. */
export function appVersion() {
  // #ifdef APP-PLUS
  return plus.runtime.version
  // #endif
  // eslint-disable-next-line no-unreachable
  return null
}

/** Deep-link arguments the app was launched with (loginint.vue reads these). */
export function launchArguments() {
  // #ifdef APP-PLUS
  return plus.runtime.arguments
  // #endif
  // eslint-disable-next-line no-unreachable
  return ''
}

export function platform() {
  return uni.getSystemInfoSync().platform
}

export function isIOS() {
  return platform() === 'ios'
}

/* -------------------------------------------------------------------------
 * Messaging / share
 * ---------------------------------------------------------------------- */

/**
 * Opens the native SMS composer prefilled with `to` and `body`. Used when
 * confirming a reservation, sharing a customer invite link, and by the
 * notification-template test button.
 */
export function sendSms({ to, body }) {
  // #ifdef APP-PLUS
  const msg = plus.messaging.createMessage(plus.messaging.TYPE_SMS)
  msg.to = Array.isArray(to) ? to : [to]
  msg.body = body
  plus.messaging.sendMessage(msg)
  return
  // #endif
  // eslint-disable-next-line no-unreachable
  const recipients = Array.isArray(to) ? to.join(',') : to
  window.open(`sms:${recipients}?body=${encodeURIComponent(body)}`, '_self')
}

/** System share sheet — the fallback when a customer has no phone number. */
export function shareText({ content, href }) {
  // #ifdef APP-PLUS
  plus.share.sendWithSystem({ type: 'text', content, href })
  return
  // #endif
  // eslint-disable-next-line no-unreachable
  if (navigator.share) {
    navigator.share({ text: content, url: href })
  } else {
    uni.setClipboardData({ data: href ? `${content} ${href}` : content })
  }
}

/* -------------------------------------------------------------------------
 * Contacts
 * ---------------------------------------------------------------------- */

/**
 * Reads the phone address book. Promisified — the original nested two levels of
 * callbacks inline in contactImportList.nvue.
 * Resolves to [{ displayName, phoneNumbers }].
 */
export function getPhoneContacts() {
  // #ifdef APP-PLUS
  return new Promise((resolve, reject) => {
    plus.contacts.getAddressBook(
      plus.contacts.ADDRESSBOOK_PHONE,
      (addressbook) => {
        addressbook.find(['displayName', 'phoneNumbers'], resolve, reject)
      },
      reject
    )
  })
  // #endif
  // eslint-disable-next-line no-unreachable
  return Promise.resolve([])
}

/* -------------------------------------------------------------------------
 * Keyboard
 * ---------------------------------------------------------------------- */

export function hideSoftKeyboard() {
  // #ifdef APP-PLUS
  plus.key.hideSoftKeybord()
  return
  // #endif
  // eslint-disable-next-line no-unreachable
  uni.hideKeyboard()
}
