/**
 * Ported from vegetable.mobile.vue/config.js.
 *
 * Values are selected by `Env` plus uni-app conditional compilation, and read
 * through the same `getValue(key)` lookup the original had, so call sites did
 * not change.
 *
 * Two things changed when packaging moved from HBuilderX to Capacitor:
 *
 *  - **The H5 bundle is now what ships.** It used to be a dev-only target that
 *    needed one host, so it only defined the `_Local` keys. Capacitor wraps
 *    this build, so it needs every environment app-plus has — and the public
 *    URLs below, which were sitting inside the `APP-PLUS` block, were resolving
 *    to `undefined` in it. `ReservationBaseUrl` had a live reader
 *    (pages/reservation/edit.vue), so the share link would have shipped broken.
 *    Anything not actually per-target now lives outside both blocks.
 *
 *  - **`Env` is chosen at build time** rather than by editing this line, via
 *    `VITE_APP_ENV` — the same build-per-environment shape apps/admin uses.
 *    app-plus keeps the literal, since that route does not read Vite env.
 */
export default Object.freeze({
  // #ifdef APP-PLUS
  Env: 'Local', // Local, Development, Production
  // #endif
  // #ifndef APP-PLUS
  Env: import.meta.env.VITE_APP_ENV || 'Local', // Local, Development, Production
  // #endif

  OwnerIdField: 'https://vegetable.com/company_id',

  // Not per-target: the public site is the public site whichever shell asks.
  AdminBaseUrl_Local: 'https://busycarrot.com/',
  AdminBaseUrl_Development: 'https://busycarrot.com/',
  AdminBaseUrl_Production: 'https://busycarrot.com/',

  ObsBaseUrl_Local: 'https://busycarrot.com/',
  ObsBaseUrl_Development: 'https://busycarrot.com/',
  ObsBaseUrl_Production: 'https://busycarrot.com/',

  ReservationBaseUrl_Local: 'https://busycarrot.com/r/',
  ReservationBaseUrl_Development: 'https://busycarrot.com/r/',
  ReservationBaseUrl_Production: 'https://busycarrot.com/r/',

  // #ifdef APP-PLUS
  ApiBaseUrl_Local: 'http://195.216.213.73/Vegetable.API/',
  ApiBaseUrl_Development: 'http://dev.api.busycarrot.com/',
  ApiBaseUrl_Production: 'https://api.busycarrot.com/',

  ApiOwnerUrl_Local: 'http://195.216.213.73/Vegetable.API/owner/',
  ApiOwnerUrl_Development: 'http://dev.api.busycarrot.com/owner/',
  ApiOwnerUrl_Production: 'https://api.busycarrot.com/owner/',

  ApiUserUrl_Local: 'http://195.216.213.73/Vegetable.API/users/',
  ApiUserUrl_Development: 'http://dev.api.busycarrot.com/users/',
  ApiUserUrl_Production: 'https://api.busycarrot.com/users/',

  // Dropped from the original: Logout_*, AccessToken_*, Callback_* and
  // LogoutShort_*. Those belonged to the Auth0 hosted-login flow, which is dead
  // — the live login is phone + SMS code against `users/authenticate`. The only
  // two readers were a commented-out line in loginint.vue and
  // components/app/flyout-menu/user.vue, a component that was never rendered.
  // #endif

  // #ifndef APP-PLUS
  // `Local` is whatever is running on this machine — an IIS-hosted
  // Vegetable.API, or `npm run mock:api`. VITE_API_BASE_URL overrides it
  // without editing this file. Development and Production match the app-plus
  // hosts above; a Capacitor release build sets VITE_APP_ENV to pick one.
  //
  // Note both non-production hosts are plain http. Android blocks cleartext by
  // default, so a Capacitor build pointed at either needs the exemption in
  // android/app/src/main/res/xml/network_security_config.xml — see
  // tools/capacitor-sync.mjs. Production is https and needs nothing.
  ApiBaseUrl_Local: import.meta.env.VITE_API_BASE_URL || 'http://localhost/Vegetable.API/',
  ApiBaseUrl_Development: 'http://dev.api.busycarrot.com/',
  ApiBaseUrl_Production: 'https://api.busycarrot.com/',

  ApiOwnerUrl_Local:
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost/Vegetable.API/') + 'owner/',
  ApiOwnerUrl_Development: 'http://dev.api.busycarrot.com/owner/',
  ApiOwnerUrl_Production: 'https://api.busycarrot.com/owner/',

  ApiUserUrl_Local:
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost/Vegetable.API/') + 'users/',
  ApiUserUrl_Development: 'http://dev.api.busycarrot.com/users/',
  ApiUserUrl_Production: 'https://api.busycarrot.com/users/',
  // #endif

  getValue(key) {
    const envKey = `${key}_${this.Env}`
    return this[envKey] ? this[envKey] : this[key]
  }
})
