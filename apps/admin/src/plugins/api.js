import { createApiClient } from '@vegetable/api-client'
import { createAxiosTransport } from '@vegetable/api-client/axios'
import config from '@/config'
import { useSessionStore } from '@/stores/session'

/**
 * Ported from vegetable/Vegetable.Admin/common/api.service.js (ApiService.init()),
 * now backed by the shared @vegetable/api-client package.
 *
 * The bearer token used to come from Auth0 Lock's `checkSession`, refreshed on
 * every request. It is now the API's own token, minted by `users/authenticate`
 * and held in the session store — see stores/session.js for why the Auth0 one
 * was never going to open `[AuthorizeOwner]`.
 *
 * Reading the store rather than caching the token in a module variable means a
 * sign-out takes effect on the next request with nothing to invalidate, and a
 * token restored from storage on page load is picked up without a sync step.
 *
 * `stores/session` can be imported normally because it holds state only and
 * pulls in nothing from here; `useSessionStore()` is called inside the handlers,
 * by which time main.js has installed Pinia. The router import has to stay lazy
 * — `@/router` imports the owner store, which imports this module, and a static
 * import would close that loop at module scope.
 */
export const apiClient = createApiClient({
  baseURL: config.ApiBaseUrl,
  transport: createAxiosTransport(),

  getToken: () => useSessionStore().token,

  /**
   * A 401 means the token is no longer good — rotated `Secret`, or a record the
   * owner no longer has access to. Drop it and show the login page.
   *
   * The redirect goes through vue-router rather than `window.location.href`: a
   * full page load throws away the Pinia state the login flow is about to
   * repopulate.
   */
  onUnauthorized: async () => {
    useSessionStore().signOut()
    const { router } = await import('@/router')
    if (router.currentRoute.value.name !== 'login') {
      router.push({ name: 'login' })
    }
  }
})
