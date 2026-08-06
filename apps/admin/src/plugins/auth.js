import Auth0Lock from 'auth0-lock'
import config from '@/config'

// Ported from vegetable/Vegetable.Admin/plugins/axios.js (refreshToken) and
// pages/login.vue. Kept Auth0 Lock (rather than swapping to @auth0/auth0-spa-js)
// to minimize behavior risk during the rewrite; revisit once the port is stable.
let lockInstance = null

function getLock() {
  if (!lockInstance) {
    lockInstance = new Auth0Lock(config.Auth0ClientId, config.Auth0Domain, {
      autoclose: true,
      closable: false,
      container: 'login-container',
      auth: {
        params: { scope: 'openid profile email' },
        audience: 'vegetable'
      }
    })
  }
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
