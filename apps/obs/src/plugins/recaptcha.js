/**
 * Google reCAPTCHA v3, loaded on demand.
 *
 * Vegetable.API puts QueryTokenFilter (Vegetable.API/Filters/TokenFilter.cs) in
 * front of the two endpoints that write a reservation. The filter reads
 * `?token=` and posts it to Google's siteverify; anything else is a 401.
 *
 * The old web app never sent one — ReservationService.create() called
 * `PUT publicowner/reservation/{alias}` with no token at all, so booking could
 * only ever have returned 401. That is fixed here.
 *
 * The script is injected the first time a token is asked for rather than from
 * index.html, so a page view that never opens the booking wizard does not load
 * Google's script at all.
 */

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

let loader = null

export const isCaptchaConfigured = () => Boolean(SITE_KEY)

function loadScript() {
  if (loader) return loader

  loader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`
    script.async = true
    script.onload = () => resolve(window.grecaptcha)
    script.onerror = () => {
      loader = null
      reject(new Error('Failed to load the reCAPTCHA script.'))
    }
    document.head.appendChild(script)
  })

  return loader
}

/**
 * Resolves a fresh reCAPTCHA token for `action`, or null when no site key is
 * configured. Callers treat null as "cannot book" and say so — sending the
 * request anyway would just 401.
 */
export async function getCaptchaToken(action = 'booking') {
  if (!SITE_KEY) return null

  const grecaptcha = await loadScript()
  await new Promise((resolve) => grecaptcha.ready(resolve))
  return grecaptcha.execute(SITE_KEY, { action })
}
