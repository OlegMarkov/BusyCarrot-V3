import { defineStore } from 'pinia'
import { apiClient } from '@/plugins/request'
import { useAppStore } from '@/stores/app'

/**
 * Ported from vegetable.mobile.vue/store/user.module.js.
 *
 * Persistence is still hand-rolled against uni storage rather than a Pinia
 * persistence plugin, because the access token has to be readable synchronously
 * at store construction — the request transport asks for it on the very first
 * call, before any plugin hydration would have run.
 *
 * Cleaned up while porting: the original's UPSERT_* actions passed a `success`
 * callback to `uni.setStorage` *and* committed the same mutation before it, so
 * the value was set twice; and UPSERT_USER / UPDATE_USER called a bare
 * `commit(...)` that was never destructured from the context, which would have
 * thrown ReferenceError had those paths been hit.
 */

function readStorage(key, fallback = null) {
  try {
    const value = uni.getStorageSync(key)
    return value || fallback
  } catch {
    return fallback
  }
}

/**
 * Record the error and resolve to undefined, which is what the original's
 * catch blocks did. Deliberately *not* the shared `tracked()` from stores/app —
 * every SET_API_CALLS_COUNT in the original user module was commented out, so
 * these calls must not drive the global busy spinner.
 */
async function capture(fn) {
  try {
    return await fn()
  } catch (error) {
    useAppStore().raiseError(error)
    return undefined
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    /** The phone number the device is logged in as. */
    user: readStorage('user', ''),
    /** The user record from Vegetable.API. */
    userDb: '',
    accessToken: readStorage('accessToken'),
    refreshToken: readStorage('refreshToken'),
    timer: 0,
    captchaBase64: undefined
  }),

  actions: {
    setAccessToken(accessToken) {
      this.accessToken = accessToken
      uni.setStorageSync('accessToken', accessToken)
    },

    setRefreshToken(refreshToken) {
      this.refreshToken = refreshToken
      uni.setStorageSync('refreshToken', refreshToken)
    },

    /** Was UPSERT_USER_LOCAL — stores the phone number this device logged in with. */
    setUserLocal(user) {
      this.user = user
      uni.setStorageSync('user', user)
    },

    setTimer(seconds) {
      this.timer = seconds
    },

    /** Was RESET_USER — clears both memory and device storage. */
    clearSession() {
      this.user = ''
      this.userDb = ''
      this.accessToken = null
      this.refreshToken = null
      uni.removeStorageSync('accessToken')
      uni.removeStorageSync('refreshToken')
      uni.removeStorageSync('user')
    },

    async createUser(user) {
      return capture(async () => {
        const { data } = await apiClient.UsersService.create(user)
        this.userDb = data
        return data
      })
    },

    async fetchUser() {
      return capture(async () => {
        const { data } = await apiClient.UsersService.fetch(this.user)
        this.userDb = data
        return data
      })
    },

    async updateUser(user) {
      return capture(async () => {
        const { data } = await apiClient.UsersService.update(user)
        return data
      })
    },

    async upsertUserData({ phoneNumber, cid, platform }) {
      return capture(() => apiClient.UsersService.updateUserData(phoneNumber, cid, platform))
    },

    async deleteUserData(cid) {
      return capture(() => apiClient.UsersService.deleteUserData(cid))
    },

    async getCaptcha() {
      return capture(async () => {
        const { data } = await apiClient.UsersService.getcaptcha(useAppStore().sessionKey)
        this.captchaBase64 = data
        return data
      })
    },

    async sendCode(phoneNumber) {
      return capture(() => apiClient.UsersService.sendcode(phoneNumber))
    },

    /**
     * loginint.vue checks `result.status === 200`, so this resolves the whole
     * response rather than just its body.
     */
    async sendCallCode({ phoneNumber, captcha }) {
      return capture(() =>
        apiClient.UsersService.sendverificationcall(phoneNumber, useAppStore().sessionKey, captcha)
      )
    },

    async authenticate(request) {
      return capture(async () => {
        const { data } = await apiClient.UsersService.authenticate(request)
        this.userDb = data.user
        this.setAccessToken(data.token)
        return data
      })
    }
  }
})
