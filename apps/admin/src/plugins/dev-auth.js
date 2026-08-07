/**
 * Development-only auth bypass.
 *
 * Admin sits behind Auth0, and Auth0 is awkward to run against locally: when
 * `checkSession` cannot reach a tenant it does not fail, it *hangs* — so no
 * request is ever made and the app sits on an empty shell with nothing in the
 * console. That makes the app impossible to open, or to verify, without live
 * credentials.
 *
 * ---------------------------------------------------------------------------
 * Why this cannot end up in production
 * ---------------------------------------------------------------------------
 * The flag is `import.meta.env.DEV && …`. Vite replaces `import.meta.env.DEV`
 * with the literal `false` when it builds for production, so the constant folds
 * to `false`, every `if (devAuthEnabled)` branch becomes unreachable, and the
 * minifier removes them. It is not a runtime check that a stray env var can
 * flip — the code is not in the production bundle at all. `npm run build` and
 * grep the output if you want to confirm it.
 *
 * The second condition means it is off even in dev unless you ask for it.
 *
 * ---------------------------------------------------------------------------
 * Using it
 * ---------------------------------------------------------------------------
 * Put this in `apps/admin/.env.local` (which is yours, not the repo's):
 *
 *     VITE_DEV_BYPASS_AUTH=true
 *
 * Then `npm run dev:admin`. The router stops redirecting to /login and requests
 * go out with no bearer token.
 *
 * That last part matters: this bypasses *this app's* login, not the API's
 * authorisation. `OwnerController` is `[AuthorizeOwner]`, so a real
 * Vegetable.API will answer 401 to every call. Point `VITE_API_BASE_URL` at a
 * local API with auth disabled, or at a stub — see the "Verifying it" notes in
 * MIGRATION.md.
 */

export const devAuthEnabled =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true'

/**
 * A stand-in owner, so the shell has a name to show and the route guard has
 * something truthy to read. Real values arrive from the API on the first fetch
 * and overwrite these.
 */
export function seedDevSession(ownerStore) {
  if (!devAuthEnabled) return

  ownerStore.setAuthenticated(true)
  // The store initialises `user` to `{}`, which is truthy — guarding on the
  // object itself meant the stand-in was never applied and anything reading a
  // profile field (the sidebar's account row) rendered blank.
  if (!ownerStore.user?.name) {
    ownerStore.setUser({ name: 'dev@localhost', email: 'dev@localhost' })
  }

  console.warn(
    '[dev-auth] Login is bypassed (VITE_DEV_BYPASS_AUTH). Requests carry no ' +
      'bearer token — point VITE_API_BASE_URL at an API that allows that.'
  )
}
