/**
 * Yandex Maps, loaded on demand.
 *
 * PersonalPage.vue in vegetable.web called `ymaps.ready(...)` at module scope
 * inside the owner fetch, but the Razor layout that hosted it
 * (Views/Shared/_PersonalPage.cshtml) never loaded the Yandex script — so
 * `ymaps` was undefined and that call threw a ReferenceError inside a promise
 * chain, silently, on every page view.
 *
 * Here the script is injected only when a key is configured and only when the
 * map is actually shown, and the caller gets a rejected promise it can handle.
 */

const MAPS_KEY = import.meta.env.VITE_YANDEX_MAPS_KEY

let loader = null

export const isMapConfigured = () => Boolean(MAPS_KEY)

export function loadMaps(lang = 'ru_RU') {
  if (!MAPS_KEY) return Promise.reject(new Error('VITE_YANDEX_MAPS_KEY is not set.'))
  if (loader) return loader

  loader = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(MAPS_KEY)}&lang=${lang}`
    script.async = true
    script.onload = () => window.ymaps.ready(() => resolve(window.ymaps))
    script.onerror = () => {
      loader = null
      reject(new Error('Failed to load the Yandex Maps script.'))
    }
    document.head.appendChild(script)
  })

  return loader
}

/**
 * `points` arrives from the API as a single "lon lat" string — note the order,
 * which is why the original indexed [1] before [0] when building the centre.
 */
export function parsePoints(points) {
  if (!points) return null
  const parts = String(points).trim().split(/\s+/)
  if (parts.length < 2) return null

  const coordinates = [Number(parts[1]), Number(parts[0])]
  return coordinates.every(Number.isFinite) ? coordinates : null
}
