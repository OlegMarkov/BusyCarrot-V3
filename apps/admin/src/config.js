// Ported from vegetable/Vegetable.Admin/config.js.
// Values now come from Vite env vars instead of being hardcoded, see .env.example.
export default Object.freeze({
  ApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
  // The public booking site; the owner's alias is appended to build their URL.
  ObsBaseUrl: import.meta.env.VITE_OBS_BASE_URL,
  // This app's own origin, used to build the invite link.
  AdminBaseUrl: import.meta.env.VITE_ADMIN_BASE_URL,
  OwnerIdField: import.meta.env.VITE_OWNER_ID_FIELD,
  Auth0ClientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  Auth0Domain: import.meta.env.VITE_AUTH0_DOMAIN
})
