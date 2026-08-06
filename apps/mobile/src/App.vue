<script>
import { useAppStore } from '@/stores/app'
import { useLogStore } from '@/stores/log'
import { updateTabBarText, setLocale, getLocale } from '@/plugins/i18n'
import { initLocalStorage } from '@/plugins/local-storage'
import { loadIndustryFonts } from '@/plugins/fonts'
import {
  registerPushHandlers,
  createLocalNotification,
  installExitToast,
  clearBadge,
  isIOS
} from '@/plugins/native'

/**
 * Ported from vegetable.mobile.vue/App.vue.
 *
 * Gone from the original:
 *  - `globalData.$t` / `globalData._i18n`: components reached the translator
 *    through `getApp().globalData.$t` because nvue components couldn't see the
 *    Vue 2 i18n instance. With vue-i18n v9 in legacy mode, `this.$t` works
 *    everywhere, so the whole hack is gone (73 call sites).
 *  - `axiosPlugin.init()`: the request layer is configured in plugins/request.js.
 *  - the local `tabBarText()` copy, now plugins/i18n.js `updateTabBarText()`.
 *  - the `plus.nativeUI.toast` reassignment, now `installExitToast()`.
 *
 * All `plus.*` access moved behind plugins/native.js so the H5 dev target runs.
 */
export default {
  onLaunch() {
    const log = useLogStore()

    registerPushHandlers({
      onClick: (payload) => {
        log.postLog({ level: 'info', text: `click: ${JSON.stringify(payload)}` })
        if (payload.url) {
          uni.navigateTo({ url: payload.url.substring(1) })
        }
      },
      onReceive: (payload, msg) => {
        log.postLog({ level: 'info', text: `receive: ${JSON.stringify(payload)}` })

        if (isIOS()) {
          // iOS shows system pushes itself. Anything that isn't a native APS
          // payload and isn't already one of ours gets raised locally so the
          // user sees it while the app is in the foreground.
          if (!msg.aps && !payload.isLocal) {
            createLocalNotification({
              title: payload.title,
              body: payload.body,
              url: payload.url
            })
          }
          return
        }

        if (payload.url) {
          uni.navigateTo({ url: payload.url.substring(1) })
        }
      }
    })

    // See the note in plugins/local-storage.js: the original left this call
    // commented out, which silently disabled the per-device filter flags.
    initLocalStorage()

    // Barlow / Barlow Condensed. On app-plus a CSS @import never resolves, so
    // the families have to be registered through uni's own loader.
    loadIndustryFonts()

    // Re-apply the stored locale so moment picks it up as well as vue-i18n.
    setLocale(getLocale())

    updateTabBarText()
    installExitToast()
  },

  onShow() {
    clearBadge()
    useAppStore().setToday()
  }
}
</script>

<style lang="scss">
/* H5 only — app-plus registers the same families via plugins/fonts.js. */
/* #ifndef APP-PLUS */
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;700&family=Barlow+Condensed:wght@400;600&display=swap');
/* #endif */

@import './styles/nvue-compat.scss';
@import './styles/industry.scss';
@import './vegetable.scss';

page {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}
</style>
