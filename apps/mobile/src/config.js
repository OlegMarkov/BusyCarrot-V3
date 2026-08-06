/**
 * Ported verbatim from vegetable.mobile.vue/config.js.
 *
 * Values are selected by `Env` plus uni-app conditional compilation, so the H5
 * dev target and the packaged app can point at different hosts. Kept as a
 * frozen object with the same `getValue(key)` lookup so call sites don't change.
 */
export default Object.freeze({
  Env: 'Local', // Local, Development, Production

  OwnerIdField: 'https://vegetable.com/company_id',

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

  AdminBaseUrl_Local: 'https://busycarrot.com/',

  ObsBaseUrl_Local: 'https://busycarrot.com/',
  ObsBaseUrl_Development: 'https://busycarrot.com/',
  ObsBaseUrl_Production: 'https://busycarrot.com/',

  ReservationBaseUrl_Local: 'https://busycarrot.com/r/',
  ReservationBaseUrl_Development: 'https://busycarrot.com/r/',
  ReservationBaseUrl_Production: 'https://busycarrot.com/r/',

  // Dropped from the original: Logout_*, AccessToken_*, Callback_* and
  // LogoutShort_*. Those belonged to the Auth0 hosted-login flow, which is dead
  // — the live login is phone + SMS code against `users/authenticate`. The only
  // two readers were a commented-out line in loginint.vue and
  // components/app/flyout-menu/user.vue, a component that was never rendered.
  // #endif

  // #ifdef H5
  // The H5 target is the one that gets pointed at whatever is running locally —
  // an IIS-hosted Vegetable.API, or `npm run mock:api`. VITE_API_BASE_URL in
  // apps/mobile/.env.development.local overrides it without editing this file;
  // the literal below is what it was before that hook existed. app-plus is
  // untouched, since it never reads Vite env.
  ApiBaseUrl_Local: import.meta.env.VITE_API_BASE_URL || 'http://localhost/Vegetable.API/',
  ApiOwnerUrl_Local:
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost/Vegetable.API/') + 'owner/',
  ApiUserUrl_Local:
    (import.meta.env.VITE_API_BASE_URL || 'http://localhost/Vegetable.API/') + 'users/',
  AdminBaseUrl_Local: 'http://localhost:3000/',
  ObsBaseUrl_Local: 'http://localhost:3000/',
  // #endif

  getValue(key) {
    const envKey = `${key}_${this.Env}`
    return this[envKey] ? this[envKey] : this[key]
  }
})
