import { defineStore } from 'pinia'

/**
 * Who is signed in, and the bearer token that proves it.
 *
 * Replaces Auth0. Admin now authenticates the same way the mobile app does —
 * phone number, then a verification code — against `users/authenticate`, which
 * returns the API's own HS256 token. That is the only credential
 * `[AuthorizeOwner]` accepts: `JwtMiddleware` validates against
 * `Configuration["Secret"]` and reads `id` and `userId` claims, neither of which
 * an Auth0 token carries. See MIGRATION.md for why the Auth0 path could not work.
 *
 * Deliberately holds no API calls. `plugins/api.js` reads the token from here on
 * every request, so if this module imported the client the two would form a
 * cycle at module scope. The login page makes the calls and writes the result in.
 *
 * Persisted, because the token is what survives a refresh — without it every
 * reload would ask for the phone again. The API issues it with a ten year
 * lifetime, so there is nothing to refresh and no expiry to track; it stays
 * valid until the user signs out or `Secret` is rotated.
 */
export const useSessionStore = defineStore('session', {
  state: () => ({
    /** The API's HS256 bearer token, or null when signed out. */
    token: null,
    /** The `User` record `users/authenticate` echoes back. */
    user: null,
    /** Digits only, calling code included — what the code was sent to. */
    phoneNumber: null
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.token),

    /**
     * What the sidebar and the settings page show for the signed-in person.
     * A user who has never set a name still has a phone number, so this always
     * resolves to something rather than falling through to a dash.
     */
    displayName: (state) =>
      state.user?.name || state.user?.email || (state.phoneNumber ? `+${state.phoneNumber}` : '—')
  },

  actions: {
    signIn({ token, user, phoneNumber }) {
      this.token = token
      this.user = user ?? null
      this.phoneNumber = phoneNumber ?? user?.phoneNumber ?? null
    },

    signOut() {
      this.token = null
      this.user = null
      this.phoneNumber = null
    }
  },

  persist: true
})
