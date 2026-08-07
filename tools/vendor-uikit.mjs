/**
 * Copies UIkit out of node_modules and into apps/obs/public/vendor/uikit/.
 *
 * Why a copy rather than an import: the app is written against UIkit's UMD
 * build and its global. `import UIkit from 'uikit'` does give a working object —
 * `UIkit.tab(el)` and `UIkit.icon(el)` both behave — but the automatic boot
 * that scans the document for `uk-*` attributes never runs through Vite's
 * interop, so every `uk-icon` stays an empty element and the declarative
 * switcher never activates. Loading the UMD as a classic script is what the
 * markup expects, and is exactly what the CDN tags used to do.
 *
 * npm still owns the version — `uikit` is a dependency of apps/obs, and this
 * runs from `predev`/`prebuild`, so the served files cannot drift from the
 * lockfile. The copies are generated, so they are gitignored.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')

const pkg = require.resolve('uikit/package.json', { paths: [root] })
const dist = path.join(path.dirname(pkg), 'dist')
const version = require(pkg).version

const target = path.join(root, 'apps', 'obs', 'public', 'vendor', 'uikit')

const FILES = [
  ['css/uikit.min.css', 'uikit.min.css'],
  ['js/uikit.min.js', 'uikit.min.js'],
  ['js/uikit-icons.min.js', 'uikit-icons.min.js']
]

fs.mkdirSync(target, { recursive: true })

for (const [from, to] of FILES) {
  const source = path.join(dist, from)
  if (!fs.existsSync(source)) {
    console.error(`uikit: missing ${source} — is the dependency installed?`)
    process.exit(1)
  }
  fs.copyFileSync(source, path.join(target, to))
}

// A marker so it is obvious where these came from and which version they are.
fs.writeFileSync(
  path.join(target, 'VERSION.txt'),
  `uikit ${version}\ncopied from node_modules by tools/vendor-uikit.mjs\ndo not edit; do not commit\n`
)

console.log(`uikit ${version} vendored into apps/obs/public/vendor/uikit/`)
