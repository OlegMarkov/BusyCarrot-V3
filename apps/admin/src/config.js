// Ported from vegetable/Vegetable.Admin/config.js.
// Values now come from Vite env vars instead of being hardcoded, see .env.example.
//
// The Auth0 entries are gone with the Auth0 login: `Auth0ClientId` and
// `Auth0Domain` built the Lock widget, `OwnerIdField` read the namespaced
// company_id claim off the profile, and `AdminBaseUrl` was only ever the
// `returnTo` of Auth0's logout redirect. Admin now signs in against
// `users/authenticate` — see stores/session.js.
export default Object.freeze({
  ApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  // The public booking site; the owner's alias is appended to build their URL.
  ObsBaseUrl: import.meta.env.VITE_OBS_BASE_URL
})
