/**
 * Barlow / Barlow Condensed — the Industry design system's type pairing.
 *
 * The system's stylesheet loads them with an `@import` from Google Fonts. That
 * only resolves on H5: the app-plus webview does not process a CSS `@import`
 * for a remote font sheet, so on a device both families would silently fall
 * back to system-ui and the whole redesign would render in the wrong type.
 * uni-app's own `uni.loadFontFace` is the supported route there.
 *
 * Both paths are best-effort. If the font never arrives the app still works —
 * `--font-heading` and `--font-body` both end in `system-ui, sans-serif`.
 */

const FAMILIES = [
  {
    family: 'Barlow',
    // woff2 is what the app-plus webview accepts; the v12 URLs are the stable
    // ones Google serves for these weights.
    sources: {
      400: 'https://fonts.gstatic.com/s/barlow/v12/7cHpv4kjgoGqM7EPC8E46HsxnA.woff2',
      500: 'https://fonts.gstatic.com/s/barlow/v12/7cHqv4kjgoGqM7EPDLcMcMxzsg.woff2',
      700: 'https://fonts.gstatic.com/s/barlow/v12/7cHqv4kjgoGqM7EPDPINcMxzsg.woff2'
    }
  },
  {
    family: 'Barlow Condensed',
    sources: {
      400: 'https://fonts.gstatic.com/s/barlowcondensed/v12/HTx3L3I-JCGChYJ8VI-L6OO_au7B6xTru0Zn.woff2',
      600: 'https://fonts.gstatic.com/s/barlowcondensed/v12/HTxwL3I-JCGChYJ8VI-L6OO_au7B6xTrq0ZnFmYq.woff2'
    }
  }
]

export function loadIndustryFonts() {
  // #ifdef APP-PLUS
  for (const { family, sources } of FAMILIES) {
    for (const [weight, url] of Object.entries(sources)) {
      uni.loadFontFace({
        family,
        source: `url("${url}")`,
        weight,
        global: true,
        fail: (error) => {
          console.warn(`[fonts] ${family} ${weight} did not load`, error)
        }
      })
    }
  }
  // #endif

  // #ifndef APP-PLUS
  // H5 takes the stylesheet route; see styles/industry-fonts.css.
  // #endif
}
