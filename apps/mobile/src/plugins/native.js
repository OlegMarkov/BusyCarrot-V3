/**
 * Every native touchpoint in the app, in one place.
 *
 * The original called the 5+ runtime directly from ~20 pages and components.
 * That is fine on a device but makes the H5 target crash on the first call.
 * Each function below has up to three implementations, picked in this order:
 *
 *   1. The APP-PLUS branch — the 5+ runtime. Only reached by `uni build -p app`,
 *      the HBuilderX/DCloud route. Kept so that route still works.
 *   2. Capacitor — reached when the H5 bundle is running inside a Capacitor
 *      WebView, which is how the app is packaged now. **This is the shipped
 *      path.** See tools/capacitor-sync.mjs and MIGRATION.md.
 *   3. Plain browser — `npm run dev:mobile`, where a no-op or a web equivalent
 *      is all that is wanted.
 *
 * Branches 2 and 3 live in the same block because conditional compilation only
 * distinguishes the *build* target, and Capacitor and the browser share one.
 * `isCapacitor` distinguishes them at runtime.
 *
 * Note the import block below is itself conditionally compiled: an app-plus
 * build must not pull Capacitor in, since nothing there would ever call it.
 */

import { ref } from 'vue'
import { t } from '@/plugins/i18n'

// #ifndef APP-PLUS
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Keyboard } from '@capacitor/keyboard'
import { Share } from '@capacitor/share'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Contacts } from '@capacitor-community/contacts'
// #endif

/** True inside a Capacitor WebView; false in app-plus and in a plain browser. */
export const isCapacitor = (() => {
  // #ifdef APP-PLUS
  return false
  // #endif
  // eslint-disable-next-line no-unreachable
  return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()
})()

/** True on a device, whichever shell got it there. Must follow isCapacitor. */
export const isApp = (() => {
  // #ifdef APP-PLUS
  return true
  // #endif
  // eslint-disable-next-line no-unreachable
  return isCapacitor
})()

/* -------------------------------------------------------------------------
 * Async values that the app reads synchronously
 *
 * `plus.runtime.version` and `plus.push.getClientInfo()` are synchronous
 * getters; every Capacitor equivalent is a promise or an event. Rather than
 * make ~6 call sites async — one of them a computed property — the values are
 * primed once by initNative() into refs. Reading a ref inside a computed keeps
 * the dependency, so `isOldVersion` re-evaluates when the version lands.
 * ---------------------------------------------------------------------- */

const cachedVersion = ref(null)
const cachedPushId = ref(null)
const launchUrl = ref('')

/**
 * Called once from App.vue onLaunch. Safe to call on any platform — on
 * app-plus and in a plain browser it does nothing.
 */
export async function initNative() {
  // #ifndef APP-PLUS
  if (!isCapacitor) return

  try {
    const info = await CapApp.getInfo()
    cachedVersion.value = info.version
  } catch (error) {
    console.warn('[native] could not read the app version', error)
  }

  // Deep links. Registered here rather than at a call site so the URL the app
  // was cold-started with is captured before any page can ask for it.
  try {
    const launch = await CapApp.getLaunchUrl()
    if (launch?.url) launchUrl.value = launch.url
    CapApp.addListener('appUrlOpen', ({ url }) => {
      launchUrl.value = url
    })
  } catch (error) {
    console.warn('[native] could not read the launch url', error)
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark })
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#1d2d3d' })
    }
  } catch {
    // Not fatal, and not available on every device.
  }

  // The splash is configured not to auto-hide so it covers the webview until
  // the first screen has actually rendered rather than until it has loaded.
  try {
    await SplashScreen.hide()
  } catch {
    /* no splash configured */
  }
  // #endif
}

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

/** How long a second back press still counts as "again". */
const EXIT_WINDOW_MS = 2000

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
  return
  // #endif

  // eslint-disable-next-line no-unreachable
  if (!isCapacitor) return

  // Capacitor hands the hardware back button over whole rather than emitting a
  // string to intercept, so the press-again-to-exit behaviour is rebuilt here
  // instead of translated. Same two-press contract the runtime had.
  let armed = 0
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
      return
    }

    if (Date.now() - armed < EXIT_WINDOW_MS) {
      CapApp.exitApp()
      return
    }

    armed = Date.now()
    uni.showToast({ title: t('main.app-exit'), icon: 'none', duration: EXIT_WINDOW_MS })
  })
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
 *
 * UNIMPLEMENTED ON CAPACITOR — see the note on getPushClientId().
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

/**
 * The device's push registration id.
 *
 * On app-plus this is a GeTui client id, minted by the uniPush SDK inside the
 * DCloud runtime, and it is what Vegetable.API's PushService addresses — see
 * GeTuiPushOptions in appsettings.json and Vegetable.Core/Services/PushService.cs.
 *
 * There is no GeTui SDK in a Capacitor app, so there is no cid to return and
 * this stays null. Push is the one capability that does not carry across from
 * the DCloud runtime for free; both routes out are native work plus, for one of
 * them, a second IPushService on the API. Documented in MIGRATION.md — it needs
 * a decision before the Capacitor build can ship.
 *
 * Callers already guard on a falsy id, so a null here degrades to "this device
 * is not registered for push" rather than breaking anything.
 */
export function getPushClientId() {
  // #ifdef APP-PLUS
  return plus.push.getClientInfo()?.clientid
  // #endif
  // eslint-disable-next-line no-unreachable
  return cachedPushId.value
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
  if (isCapacitor) {
    // Custom Tabs / SFSafariViewController. Both call sites — the privacy
    // policy and the subscription payment page — are external pages the user
    // comes back from, which is exactly what this is for.
    Browser.open({ url }).catch((error) => console.warn('[native] openUrl failed', error))
    return
  }

  window.open(url, '_blank')
}

/** App version, compared against Settings.minIOSVersion/minAndroidVersion. */
export function appVersion() {
  // #ifdef APP-PLUS
  return plus.runtime.version
  // #endif
  // eslint-disable-next-line no-unreachable
  return cachedVersion.value
}

/** Deep-link arguments the app was launched with. */
export function launchArguments() {
  // #ifdef APP-PLUS
  return plus.runtime.arguments
  // #endif
  // eslint-disable-next-line no-unreachable
  return launchUrl.value
}

export function platform() {
  // #ifndef APP-PLUS
  // Capacitor knows which shell it is; the H5 fallback only knows the user
  // agent, and a WKWebView user agent is not a reliable way to ask.
  if (isCapacitor) return Capacitor.getPlatform()
  // #endif
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

  // Capacitor's WebViewClient hands any non-http(s) scheme to the OS as an
  // Intent, so `sms:` reaches the composer without a plugin. `window.open` is
  // not reliable there — a location assignment is.
  const href = `sms:${recipients}${body ? `?body=${encodeURIComponent(body)}` : ''}`
  if (isCapacitor) {
    window.location.href = href
    return
  }

  window.open(href, '_self')
}

/** System share sheet — the fallback when a customer has no phone number. */
export function shareText({ content, href }) {
  // #ifdef APP-PLUS
  plus.share.sendWithSystem({ type: 'text', content, href })
  return
  // #endif

  // eslint-disable-next-line no-unreachable
  if (isCapacitor) {
    Share.share({ text: content, url: href }).catch((error) => {
      // A dismissed share sheet rejects; that is not worth surfacing.
      console.warn('[native] share dismissed or failed', error)
    })
    return
  }

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
 * Resolves to [{ displayName, phoneNumbers: [{ value }] }].
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
  if (!isCapacitor) return Promise.resolve([])

  return (async () => {
    const permission = await Contacts.requestPermissions()
    if (permission.contacts !== 'granted') {
      throw new Error('Contacts permission was not granted')
    }

    const { contacts } = await Contacts.getContacts({
      projection: { name: true, phones: true }
    })

    // Reshaped to the 5+ address-book shape so contactImportList.vue, which
    // reads `displayName` and `phoneNumbers[0].value`, does not have to care
    // which runtime it is on.
    return contacts.map((contact) => ({
      displayName: contact.name?.display || '',
      phoneNumbers: (contact.phones || [])
        .filter((phone) => phone.number)
        .map((phone) => ({ value: phone.number }))
    }))
  })()
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
  if (isCapacitor) {
    Keyboard.hide().catch(() => {})
    return
  }

  uni.hideKeyboard()
}
