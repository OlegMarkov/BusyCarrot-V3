import Auth0Lock from 'auth0-lock'
import config from '@/config'

// Ported from vegetable/Vegetable.Admin/plugins/axios.js (refreshToken) and
// pages/login.vue. Kept Auth0 Lock (rather than swapping to @auth0/auth0-spa-js)
// to minimize behavior risk during the rewrite; revisit once the port is stable.

/**
 * Industry's steel, given to Lock so its buttons and links are not the default
 * Auth0 blue. The widget's own chrome — its rounded corners, its type — belongs
 * to Auth0 and is not reachable from here; only the page around it is ours.
 */
const THEME = {
  primaryColor: '#5980a6'
}

/**
 * The options every Lock in this app shares. Exported because the login page
 * needs its own instance — it varies `allowLogin` for the invite flow, and a
 * memoized singleton cannot be reconfigured after construction — and it should
 * not restate the client id, the audience or the theme to do that.
 */
export const LOCK_OPTIONS = Object.freeze({
  autoclose: true,
  closable: false,
  container: 'login-container',
  theme: THEME,
  // The page already carries the wordmark above the widget; without this Lock
  // heads its own panel "Auth0", which is the wrong name on this screen.
  languageDictionary: { title: '' },
  auth: {
    params: { scope: 'openid profile email' },
    audience: 'vegetable'
  }
})

export function createLock(overrides = {}) {
  return new Auth0Lock(config.Auth0ClientId, config.Auth0Domain, {
    ...LOCK_OPTIONS,
    ...overrides
  })
}

let lockInstance = null

function getLock() {
  if (!lockInstance) lockInstance = createLock()
  return lockInstance
}

export function refreshToken() {
  return new Promise((resolve, reject) => {
    getLock().checkSession({}, (err, authResult) => {
      if (err) reject(err)
      else resolve(authResult.accessToken)
    })
  })
}

export function showLock(options = {}) {
  const lock = getLock()
  lock.show(options)
  return lock
}

/**
 * Ends the Auth0 session and returns to the login page.
 *
 * Ported from the inline logout in
 * Vegetable.Admin/components/actions-panel/user-profile.vue, which constructed
 * its own Auth0Lock with the client id and domain hardcoded, beside a comment
 * reading "TODO: Need to encapsulate auth0 logic in single module".
 */
export function logout() {
  getLock().logout({ returnTo: `${config.AdminBaseUrl}login` })
}
