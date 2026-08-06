import { createApiClient } from '@vegetable/api-client'
import config from '@/config'
import { t } from '@/plugins/i18n'
import { toast } from '@/plugins/native'

/**
 * Replaces vegetable.mobile.vue/plugins/axios.js.
 *
 * The original made axios work inside the app container by replacing
 * `axios.defaults.adapter` with one that called `uni.request`, reaching into
 * axios internals (`require('axios/lib/core/settle')`,
 * `require('axios/lib/helpers/buildURL')`) to do it. Those module paths no
 * longer exist in axios 1.x, so this talks to `uni.request` directly and axios
 * never enters the mobile bundle at all.
 *
 * SECURITY / BEHAVIOUR CHANGE, flagged rather than ported:
 * the original response interceptor tried to refresh an Auth0 token on 401,
 * using a `client_secret` hardcoded in shipped app source. That path was also
 * already dead — `refreshToken()` called `Vue.axios.post` in a module that
 * never imported `Vue`, so it threw ReferenceError and fell into the `.catch`
 * that redirects to the login page. This keeps the observable behaviour (401 →
 * back to login) and drops the secret. Login is phone + SMS code against
 * `users/authenticate`; Auth0 is not part of the live flow.
 */

const LOGIN_PAGE = '/pages/login/loginint'

function buildUrl(baseURL, url, params) {
  const absolute = /^(http|https):\/\//.test(url)
  let full = absolute ? url : `${baseURL || ''}${url}`

  if (params) {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    if (query) full += (full.includes('?') ? '&' : '?') + query
  }

  return full
}

export function createUniTransport() {
  return function uniTransport({ method, url, baseURL, params, data, headers }) {
    return new Promise((resolve, reject) => {
      uni.request({
        method: method.toUpperCase(),
        url: buildUrl(baseURL, url, params),
        header: headers,
        data,
        fail() {
          // Network-level failure — same global toast the original showed.
          toast(t('main.global-error'))
          reject(Object.assign(new Error('Network request failed'), { status: 0 }))
        },
        success(response) {
          const { statusCode, data: body, header } = response

          if (statusCode >= 500) {
            toast(t('main.global-error'))
          }

          if (statusCode >= 200 && statusCode < 300) {
            resolve({ data: body, status: statusCode, headers: header })
          } else {
            reject(
              Object.assign(new Error(`Request failed with status ${statusCode}`), {
                status: statusCode,
                data: body
              })
            )
          }
        }
      })
    })
  }
}

/*
 * The token lives in the user Pinia store, but importing that store here would
 * make plugins/request.js ↔ stores/user.js circular. main.js registers the
 * providers once Pinia is installed instead.
 */
let tokenProvider = () => null
let unauthorizedHandler = null

export function setTokenProvider(fn) {
  tokenProvider = fn
}

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn
}

/** Navigates to login unless we're already there — as the original did. */
export function redirectToLogin() {
  const pages = getCurrentPages()
  const current = pages.length ? pages[pages.length - 1].route : ''
  if (current.indexOf('loginint') === -1) {
    uni.redirectTo({ url: LOGIN_PAGE })
  }
}

export const apiClient = createApiClient({
  baseURL: config.getValue('ApiBaseUrl'),
  transport: createUniTransport(),
  getToken: () => tokenProvider(),
  onUnauthorized: () => {
    unauthorizedHandler?.()
    redirectToLogin()
  }
})
