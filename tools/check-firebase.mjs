/**
 * Preflight for the Firebase artefacts.
 *
 *   node tools/check-firebase.mjs
 *
 * Run automatically by tools/capacitor-sync.mjs when google-services.json is
 * present. The failures it catches all look identical on a device — the app
 * starts, push silently never arrives — and none of them produce a build error,
 * so they are worth catching here instead.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const android = path.join(root, 'apps', 'mobile', 'android')

const CONFIG = path.join(android, 'app', 'google-services.json')
const GRADLE = path.join(android, 'app', 'build.gradle')

const problems = []
const notes = []

/* ── the app's own package name, from the one place that decides it ────── */

const gradle = fs.readFileSync(GRADLE, 'utf8')
const applicationId = gradle.match(/applicationId\s+"([^"]+)"/)?.[1]

if (!applicationId) {
  console.error('Could not read applicationId out of android/app/build.gradle')
  process.exit(1)
}

/* ── google-services.json ──────────────────────────────────────────────── */

if (!fs.existsSync(CONFIG)) {
  console.log(`google-services.json   not present`)
  console.log(`\nPush is disabled for this build. Capacitor's Gradle template skips the`)
  console.log(`google-services plugin when the file is absent, and the app skips`)
  console.log(`registration, so nothing breaks — it simply never receives a push.`)
  console.log(`\nDownload it from the Firebase console for an Android app registered as`)
  console.log(`  ${applicationId}`)
  console.log(`and drop it at apps/mobile/android/app/google-services.json`)
  process.exit(0)
}

let config
try {
  config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'))
} catch (error) {
  console.error(`google-services.json is not valid JSON: ${error.message}`)
  process.exit(1)
}

const projectId = config.project_info?.project_id
const projectNumber = config.project_info?.project_number

// The file can carry several apps; only one of them is ours.
const clients = config.client || []
const packageNames = clients
  .map((client) => client.client_info?.android_client_info?.package_name)
  .filter(Boolean)

const ours = clients.find(
  (client) => client.client_info?.android_client_info?.package_name === applicationId
)

if (!ours) {
  problems.push(
    `no app in google-services.json matches applicationId "${applicationId}".\n` +
      `      the file describes: ${packageNames.join(', ') || '(none)'}\n` +
      `      Register an Android app with that exact package name in the Firebase\n` +
      `      console and download the file again. FCM will not issue a token for a\n` +
      `      package the project does not know, and the failure is silent.`
  )
}

if (ours && !(ours.api_key || []).some((key) => key.current_key)) {
  problems.push('the matching app has no api_key; the download looks truncated')
}

if (!projectId) {
  problems.push('project_info.project_id is missing')
}

/* ── the API's service account, if it happens to be reachable ──────────── */

// Best effort: the API lives in a sibling repo that may not be checked out.
const apiSettings = path.resolve(root, '..', 'vegetable', 'Vegetable.API', 'appsettings.json')
if (fs.existsSync(apiSettings)) {
  try {
    const text = fs.readFileSync(apiSettings, 'utf8').replace(/^﻿/, '')
    const settings = JSON.parse(text)
    const provider = settings.PushProvider
    const keyPath = settings.FcmPushOptions?.ServiceAccountJsonPath

    notes.push(`API PushProvider is "${provider}"`)
    if (provider?.toLowerCase() !== 'fcm') {
      notes.push(
        'the API still sends through GeTui — flip PushProvider to "Fcm" once the\n' +
          '      Capacitor build is the one people are running'
      )
    }
    if (keyPath) {
      notes.push(`service account expected at "${keyPath}" (relative to the API content root)`)
    }
  } catch {
    /* not worth failing over */
  }
}

/* ── report ────────────────────────────────────────────────────────────── */

console.log(`applicationId          ${applicationId}`)
console.log(`firebase project       ${projectId ?? '?'}${projectNumber ? ` (${projectNumber})` : ''}`)
console.log(`apps in the file       ${packageNames.join(', ') || '(none)'}`)

if (notes.length) {
  console.log('')
  for (const note of notes) console.log(`note:  ${note}`)
}

if (problems.length) {
  console.log('')
  for (const problem of problems) console.error(`ERROR: ${problem}`)
  process.exit(1)
}

console.log('\ngoogle-services.json matches the app. Push will register on next launch.')
