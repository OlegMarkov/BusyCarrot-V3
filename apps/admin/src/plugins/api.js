import { createApiClient } from '@vegetable/api-client'
import { createAxiosTransport } from '@vegetable/api-client/axios'
import config from '@/config'
import { refreshToken } from '@/plugins/auth'
import { devAuthEnabled, devApiToken } from '@/plugins/dev-auth'

/**
 * Ported from vegetable/Vegetable.Admin/common/api.service.js (ApiService.init()),
 * now backed by the shared @vegetable/api-client package. Every request gets a
 * fresh bearer token the same way plugins/axios.js did, via Auth0 Lock's
 * checkSession.
 *
 * When that fails we go back to login. The redirect uses vue-router rather than
 * `window.location.href`: a full page load throws away the Pinia state the login
 * flow is about to repopulate, and it made the app impossible to open without a
 * live Auth0 session — the dashboard's first data fetch bounced the browser
 * before anything rendered.
 *
 * The router is imported lazily because `@/router` imports the owner store,
 * which imports this module; a static import would close that loop at module
 * scope.
 */
export const apiClient = createApiClient({
  baseURL: config.ApiBaseUrl,
  transport: createAxiosTransport(),
  getToken: async () => {
    // Dev only, and compiled out of production builds — see plugins/dev-auth.js.
    // This is the gate that matters most: Auth0's checkSession hangs rather than
    // failing when it cannot reach a tenant, so without it no request is made
    // at all.
    // devApiToken lets the bypass talk to a real local API, which needs the
    // API's own bearer token rather than an Auth0 one; null suits the stub.
    if (devAuthEnabled) return devApiToken

    try {
      return await refreshToken()
    } catch {
      const { router } = await import('@/router')
      if (router.currentRoute.value.name !== 'login') {
        router.push({ name: 'login' })
      }
      return null
    }
  }
})
