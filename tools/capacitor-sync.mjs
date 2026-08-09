/**
 * Builds the mobile H5 bundle for one environment and pushes it into the
 * Capacitor native projects.
 *
 *   node tools/capacitor-sync.mjs                  # Local
 *   node tools/capacitor-sync.mjs --env Production
 *
 * Capacitor ships a web bundle, so `uni build` (the H5 target, not `-p app`) is
 * what produces the shipped artifact. Which API host it points at is decided
 * here at build time by VITE_APP_ENV, read in src/config.js — there is no
 * runtime switch, and no .env file involved, so a build cannot pick up a
 * developer's local host by accident.
 *
 * The version numbers come from src/manifest.json so that the DCloud route and
 * the Capacitor route cannot drift apart. Gradle would otherwise keep the
 * template's versionCode 1 / versionName "1.0" forever.
 *
 * Everything this does is idempotent; run it as often as you like.
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const mobile = path.join(root, 'apps', 'mobile')

const ENVIRONMENTS = ['Local', 'Development', 'Production']

const envArg = process.argv.indexOf('--env')
const environment = envArg === -1 ? 'Local' : process.argv[envArg + 1]

if (!ENVIRONMENTS.includes(environment)) {
  console.error(`--env must be one of ${ENVIRONMENTS.join(', ')} (got ${environment ?? 'nothing'})`)
  process.exit(1)
}

/**
 * `shell: true` is needed on Windows for npm/npx, which are .cmd shims. Passing
 * the command as one pre-joined string rather than (command, args) avoids
 * Node's DEP0190 warning about unescaped argument concatenation — the arguments
 * here are all literals, so there is nothing to escape.
 */
function run(command, options = {}) {
  const result = spawnSync(command, {
    stdio: 'inherit',
    shell: true,
    cwd: mobile,
    ...options,
    env: { ...process.env, ...(options.env || {}) }
  })
  if (result.status !== 0) {
    console.error(`\n${command} failed with code ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

/* ── 1. the web bundle ─────────────────────────────────────────────────── */

// Whether Firebase is actually configured for the Android app, decided here and
// baked into the bundle as VITE_PUSH_ENABLED.
//
// This is not a nicety. Calling PushNotifications.register() without a
// google-services.json throws IllegalStateException ("Default FirebaseApp is not
// initialized") on Capacitor's own plugin thread — a native crash, not a
// rejected promise, so no JavaScript try/catch or registrationError listener can
// contain it. The app dies the moment the user grants notification permission.
// Found by running a debug build on a device; the browser cannot reproduce it
// and the build succeeds either way.
const firebaseConfig = path.join(mobile, 'android', 'app', 'google-services.json')
const pushEnabled = fs.existsSync(firebaseConfig)

// A google-services.json for the wrong package name builds and installs fine
// and then never receives a push, with nothing in any log to say why. Check it
// here, where the answer is cheap, rather than on a device.
if (pushEnabled) {
  run(`node "${path.join(root, 'tools', 'check-firebase.mjs')}"`, { cwd: root })
}

console.log(`\n>> building the H5 bundle for ${environment}`)
console.log(`>> push: ${pushEnabled ? 'enabled (google-services.json found)' : 'disabled (no google-services.json)'}\n`)

run('npm run build:h5', {
  env: { VITE_APP_ENV: environment, VITE_PUSH_ENABLED: String(pushEnabled) }
})

/* ── 2. version, from the one place that declares it ───────────────────── */

// manifest.json is JSON with comments — uni-app writes it that way. Strip them
// rather than pull in a parser for two fields.
const manifestSource = fs
  .readFileSync(path.join(mobile, 'src', 'manifest.json'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

const versionName = manifestSource.match(/"versionName"\s*:\s*"([^"]+)"/)?.[1]
const versionCode = manifestSource.match(/"versionCode"\s*:\s*"?(\d+)"?/)?.[1]

if (!versionName || !versionCode) {
  console.error('Could not read versionName/versionCode out of src/manifest.json')
  process.exit(1)
}

const gradlePath = path.join(mobile, 'android', 'app', 'build.gradle')
if (fs.existsSync(gradlePath)) {
  const before = fs.readFileSync(gradlePath, 'utf8')
  const after = before
    .replace(/versionCode\s+\d+/, `versionCode ${versionCode}`)
    .replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`)

  if (after !== before) {
    fs.writeFileSync(gradlePath, after)
    console.log(`\n>> android versionName ${versionName}, versionCode ${versionCode}`)
  } else {
    console.log(`\n>> android already at ${versionName} (${versionCode})`)
  }
} else {
  console.log('\n>> no android project yet; run `npx cap add android` in apps/mobile')
}

/* ── 3. hand the bundle to the native projects ─────────────────────────── */

console.log('\n>> cap sync\n')
run('npx cap sync')

/* ── mixed content, for the http environments only ─────────────────────── */

// `androidScheme: https` means the WebView serves the bundle from
// https://localhost, and a secure origin may not issue plain-http XHR — the
// WebView blocks it as mixed content and logs ERR_BLOCKED, *before* Android's
// cleartext policy is consulted. So network_security_config.xml is necessary
// but not sufficient: Local and Development point at http hosts and cannot work
// without this.
//
// Patched into the generated copy under android/app/src/main/assets rather than
// capacitor.config.json itself, so the tracked config keeps the production
// answer (mixed content off) and no build can turn it on by accident.
if (environment !== 'Production') {
  const generated = path.join(
    mobile, 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json'
  )

  if (fs.existsSync(generated)) {
    const config = JSON.parse(fs.readFileSync(generated, 'utf8'))
    config.android = { ...(config.android || {}), allowMixedContent: true }
    fs.writeFileSync(generated, JSON.stringify(config, null, 2))
    console.log(`>> ${environment}: allowed mixed content so the http API is reachable`)
  }
} else {
  console.log('>> Production: mixed content stays blocked (the API is https)')
}

console.log(`
Done. The native projects now carry a ${environment} build.

  Android debug APK   cd apps/mobile/android && ./gradlew assembleDebug
  Android in the IDE  cd apps/mobile && npx cap open android
  iOS                 macOS only; run \`npx cap add ios\` there first

Release builds still need a keystore — see MIGRATION.md. And note that
versionCode ${versionCode} has to be higher than whatever is already on the
store, or the upload is rejected.
`)
