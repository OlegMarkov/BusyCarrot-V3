# Vegetable frontend → Vue 3 migration

Three apps, one shared core:

| App | Old | New | State |
|---|---|---|---|
| `apps/mobile` | uni-app + Vue 2 + Vuex (`vegetable.mobile.vue`) | uni-app CLI + Vite + Vue 3 + Pinia | **done** — H5 layout pass done, device run outstanding |
| `apps/admin` | Nuxt 2 (`mode: spa`) + Vuetify 2 (`Vegetable.Admin`) | Vite + Vue 3, no UI framework | **done** — Industry desktop redesign |
| `apps/obs` | Vue 3 + Vuex 4 + UIkit (`vegetable.web`) | Vite + Vue 3 + Pinia + UIkit | **done** |
| `packages/api-client` | `common/api.service.js` + `store/api.service.js` | shared, transport-pluggable | **done** |

`Vegetable.API` (.NET) is unchanged throughout.

## Why three apps and not one

Admin requires Auth0 login and a JWT on every request; Obs is anonymous and public;
Mobile authenticates by phone + SMS code and is packaged natively. They differ in
audience, auth and UI weight, so they stay separately deployable and share a package
instead of a router. The real overlap — the API surface, locale JSON, date/phone
formatting — is exactly what `packages/api-client` and the locale files cover.

## Running it

```bash
npm install
```

```bash
npm run dev:mobile
```

`dev:mobile` serves the H5 target on http://localhost:5175, `dev:obs` on 5174 (open
`http://localhost:5174/{alias}`), `dev:admin` on 5173.

**The H5 bundle is what ships on mobile.** It used to be a development target
only, wrapped by HBuilderX into an app-plus build; packaging moved to Capacitor,
which wraps a web build. `src/plugins/native.js` picks a real implementation per
runtime — see "Packaging with Capacitor" at the end of this file.

```bash
npm run build:mobile     # H5 for Production, then cap sync
```

Then `cd apps/mobile/android && ./gradlew assembleDebug`.

The HBuilderX route still works and is deliberately intact: `dev:mobile:dcloud`
and `build:mobile:dcloud` are `uni -p app` and `uni build -p app`, whose output
goes to `apps/mobile/dist/build/app` for HBuilderX or DCloud cloud build.
`npm run dev:admin` and `npm run dev:obs` serve the two web apps.

## Mobile: what changed

| Old | New |
|---|---|
| HBuilderX project, `vueVersion: "2"` | uni-app CLI + Vite, `vueVersion: "3"` |
| 46 `.nvue` (weex) + 27 `.vue` | all `.vue`, one renderer |
| 12 Vuex modules + `actions.type.js` / `mutations.type.js` | 12 Pinia stores + `useAppStore`, constants gone |
| `getApp().globalData.$t` (73 call sites) | `this.$t` / `$t` — vue-i18n v9, `legacy: true` |
| axios + a `uni.request` adapter reaching into axios internals | `uni.request` transport, no axios in the bundle |
| `plus.*` called from ~20 files | all behind `src/plugins/native.js`, conditionally compiled |
| 45 vendored uni-ui components | the 7 actually used, in `src/components/ui` |

### The nvue → vue conversion

Weex gives every element `display:flex`, `flex-direction:column`, `flex-shrink:0`,
`position:relative` and `box-sizing:border-box` by default; the webview renderer does
not. Rather than hand-editing 46 layouts, each converted file carries `class="nv"` on
its root and inherits those defaults from `src/styles/nvue-compat.scss`. Files that
were already `.vue` are deliberately untouched — they were written against the webview
renderer and already declare `display: flex` where they need it.

Other substitutions applied while converting:

| nvue | `.vue` |
|---|---|
| `<list>` / `<cell>` | `<scroll-view>` / `<view>` |
| `<uni-refresh>` + `@pullingdown` | `<scroll-view refresher-enabled>` |
| `requireNativePlugin('dom').getComponentRect` | `uni.createSelectorQuery().boundingClientRect()` (async — check caller sequencing) |
| `requireNativePlugin('animation')` | CSS transitions |
| `BroadcastChannel('dateBC')` | `uni.$emit` / `uni.$on` |

## Pre-existing bugs this port changes behaviour around

These are not silent fixes. All have now been reviewed and signed off — each is marked
`FLAGGED` in the code with the decision recorded.

1. **Schedule minutes were silently dropped.** `reservation.module.js` used
   `workStartTime.substring(3, 2)` to read the minutes out of `"09:30"`; `substring`
   swaps its arguments when start > end, so it returned `":"`, and `Number(':')` is
   NaN. The author meant `substr(3, 2)`. The typo appears 8 times.

   moment's `.set()` *ignores* a NaN field — it does not invalidate the moment and does
   not zero the minute, it leaves whatever the base moment already had. So the schedule
   window inherited its minutes from elsewhere: in `ifInSchedule` from the reservation
   being tested (a 09:30–18:30 shift became 09:15–18:15 when checking a 10:15 booking),
   and in `getFreeTimeByDate` from the displayed day at midnight (09:30 → 09:00). The
   result is a boundary error of up to 59 minutes either way, not a total failure —
   schedules on the hour were correct, which is why it went unnoticed.
   → **Signed off: fixed.** `timeOnDate()` in `src/stores/reservation.js` parses it
   properly. Expect free-time slots to move by up to an hour on half-hour schedules, and
   bookings near a shift boundary to gain or lose their "out of the schedule" marker.
2. **The Auth0 refresh path was dead and leaked a secret.** `plugins/axios.js` embedded
   an Auth0 `client_secret` in shipped app source, in a function that could never run
   (`refreshToken()` called `Vue.axios` in a module that never imported `Vue`).
   → **Signed off: dropped.** 401 clears the token and returns to login, which is what
   happened anyway.
3. **SQLite was never opened.** `localStorage.init()` was commented out in
   `store/index.js` while the employee and service modules still called it, so the
   per-device "show in dashboard filter" flags never persisted.
   → **Signed off: fixed.** `initLocalStorage()` now runs at launch.
4. **First-run locale detection returned nothing.** On a device with no stored language,
   `getLanguage()` put its `return language` *inside* a `uni.setStorage` success
   callback, so the function itself fell off the end and returned `undefined` — the
   store's `language` initialised to `undefined`, not to the detected locale. That
   callback also referenced `this.state` and `this.store.getters`, which are not the
   store inside a plain `function()`, so it threw as well; being async, the throw missed
   the surrounding `try`, so the `catch`'s `return {}` never ran either.
   → **Signed off: fixed.** Locale resolution moved to `src/plugins/i18n.js`, which
   resolves synchronously.

5. **The phone field never formatted as you type.** `InputPhoneNumber.vue` bound
   `:value="phoneNumberFormatted"`, but that computed returned
   `this.phoneNumber.nationalNumber` — and `phoneNumber` is a string, so it was always
   `undefined` and the binding never applied. The author's intent sat commented out
   beside it: `formatIncompletePhoneNumber(...)`.
   → **Signed off: enabled.** The field now reads `999 123-45-67` (RU) /
   `(999) 123-4567` (US) as you type. Two notes: the input had to become `type="tel"`
   rather than `type="number"`, because assigning a value containing brackets or dashes
   to a number input leaves the field blank; and nothing about the submitted value
   changes — `loginint.vue:225` builds the number it sends from `countryCallingCode` +
   `nationalNumber` on the `@update` payload, never from the field text. The original
   also emitted an always-`undefined` `nationalNumberFormatted` there, which no consumer
   read; it stays dropped.

6. **The Android consent popup could lock users out of login.** `loginint.vue` gated the
   send button on `isGetuiAccepted`, but the checkbox that would let a user set it was
   inside a commented-out block, while the privacy one beside it stayed live. On iOS
   `onReady` set the flag automatically; on Android it opened a popup with `mask-click`
   enabled, so dismissing it left the flag false with nothing able to set it and the
   button permanently disabled.
   → **Signed off: the gate is removed.** The popup still shows and still records
   consent, it just cannot deadlock login.

7. **The new-employee form was bound to an HTTP response.** `getEmptyEmployee` returned
   the whole response and `pages/employee/edit.nvue:93` assigned it straight to
   `employee`, so the form was bound to `{ data, status, headers, config }` — every
   field blank, and Create posted that shape back. The sibling service page unwrapped
   `.data` correctly from the identical action.
   → **Signed off: fixed.** All `getEmpty*` store actions resolve the record itself.

## Dead code not carried over

Confirmed unreferenced in the Vue 2 app: `flyout-menu/**` and its only consumer of
`kilvn-fa-icon` (260 KB), `contacts-list`, `pages/customer/__customers.nvue`,
`uni-drawer` and `uni-swiper-dot` (imported and registered but never rendered),
`uni-icons-old`, the `uni-calendar` copy superseded by `components/app/custom-calendar`,
and ~26 other unused vendored `uni-*` components.

## Two things that bit during the port

**vue-i18n v9 `t()` only returns strings.** Under v8 the old code could write
`t('calendar.months')[date.month()]` and get a month name. In v9 that indexes into the
*key* and yields a single character — silently, with no error. Anywhere the locale files
hold an array (`calendar.months`, `monthsShort`, `weekdays`, `weekdaysShort`,
`weekdaysMin`) you must use `tArray()` from `src/plugins/i18n.js`, which wraps `tm()`/`rt()`.

**`easycom` outranks local component registration.** A broad rule like
`"^uni-(.*)"` will capture project components that merely start with `uni-` — it hijacked
`<uni-calendar-item>` inside `components/app/custom-calendar` even though the file imports
and registers it explicitly, and the page then failed to load with uni's generic
"connection timed out" overlay. The rule in `pages.json` is therefore an explicit
alternation of the seven UI-kit names, not a wildcard.

## Pull-to-refresh and infinite scroll

The nvue lists paired a native `<list>` with a separate `list-refresh` component built on
`<uni-refresh>` and `@pullingdown`. Both fold into `<scroll-view refresher-enabled>`, so
`list-refresh` is not ported. Worth knowing: `@scrolltolower` was declared on `<uni-list>`
in the customer list, but that only ever wired up on the nvue renderer — infinite scroll
did nothing on the webview side and the list stayed capped at its first 25 rows. It works
now, which means paging is live where it previously wasn't.

## Remaining work

**`apps/mobile` is fully ported** — all 29 pages and 29 project components, plus the
8-component UI kit and 13 Pinia stores. `npm run build:h5` is clean, and walking every
route in H5 produces no console errors and no failed page chunks.

- **Five components are deliberately not ported** — nothing renders them:
  `date-picker`, `time-picker`, `swipe-list-item` and `error-notification` were imported
  and registered in places but never appeared in any template, and `list-refresh` folded
  into `<scroll-view refresher-enabled>`.

Still outstanding:

- **A device pass.** The H5 layout pass is done (see "The H5 layout pass" below) and
  found two bugs that broke the conversion outright. What H5 still cannot tell you is
  how the result looks on a real screen — see the flex note above, and
  `components/app/gallery` in particular.
- **`apps/admin`** — done; see the admin section below.
- **`apps/obs`** — done; see the obs section below. Note it was built from
  `vegetable.web`, not `Vegetable.Obs`.
- **`components/app/gallery`** is the one deliberate visual change: the nvue
  `<waterfall>` masonry layout has no webview equivalent, so it is a uniform three-across
  grid now. Worth a look on a device.
- `pages/login/login` was deleted rather than ported: nothing navigated to it, and it
  called `setToken` / `setUser` Vuex mutations that were never defined. It was the
  web-view wrapper around the retired Auth0 login.

## Further pre-existing bugs found while porting the CRUD screens

- `pages/service/edit.nvue` contained a stray, unmatched `</uni-popup-options>` closing
  tag. Vue 2's parser discarded it; Vue 3's compiler rejects it, so that file could not
  have compiled unchanged.
- `getEmptyEmployee` returned the whole HTTP response and the page assigned it directly
  to `employee`, so the new-employee form was bound to `{ data, status, headers, config }`.
  The equivalent service action was unwrapped correctly by its page. All `getEmpty*`
  store actions now resolve the record.
- `service/edit.nvue` defined `deleteService()` twice — the first (delete with no
  confirmation) was silently replaced by the second.
- `customer/edit.nvue` set the error class from `validation.lastname` while clearing
  `validation.lastName`, so that one field never highlighted.
- The employee list filter called `.toLowerCase()` on `lastName` unconditionally and threw
  for any employee saved without one.
- Several `:placeholder="t.firstName"` bindings read a property off the translator
  *function*, so no placeholder ever rendered.
- Validation messages used `v-if` and `v-for` on the same element. Vue 2 ran `v-for`
  first, Vue 3 runs `v-if` first; both are now `v-for="… in validation.x || []"`.
- `reservation/edit.nvue`'s `setOptions` read `freeTimes[i].start`, but free-time slots
  carry `startTime`. Opening the form from a day (rather than from a specific slot) passed
  `undefined` into the time setter and produced an Invalid Date instead of the first open
  slot.
- The same page's cost field cleared `validation.title` on input — a key this form has no
  field for — so a cost validation error could never be dismissed.
- `selector-with-filter.nvue` declared `calculateHeight` as a **prop** and then assigned
  to it in `mounted` and on every keyboard resize. Mutating a prop is a hard warning in
  Vue 3; it is local state now.
- `settings/settings.nvue` dereferenced `this.owner` in five computeds with no guard, so
  a cold start straight onto the Settings tab threw while rendering.
- `settings/address.nvue` indexed `owner.addresses[0]` and `owner.phoneNumbers[0]`
  unconditionally — the page threw for an owner with no address saved.
- `settings/account.nvue` declared `data: function(){}` with no return. Vue 2 warned and
  carried on; Vue 3 throws.
- `settings/notification/settings.nvue` declared `computed` twice (the second silently
  replaced the first) and assigned `this.backup` without declaring it.
- `components/app/user.nvue`'s `created()` guarded on `this.ownerDb`, a property that
  exists nowhere, so the guard was always true.
- `settings/schedule/edit.nvue`'s `allowRegularSchedule` was a **computed with side
  effects**: as well as returning a boolean it reassigned `schedule.scheduleType`, rebuilt
  `scheduleOnDays`, wrote both dates and called two `bind*Change` handlers. Computeds
  cache on their dependencies, so those writes fired at unpredictable moments even under
  Vue 2; Vue 3 additionally warns about state mutated during render. The computed is pure
  now and the coercion happens once, in `enforceCustomWhenGeneralExists()`.
- The same page called `dispatch(DELETE_SCHEDULE, id, employeeId)`. Vuex actions receive
  a single payload, so `employeeId` was silently dropped and the post-delete refetch
  reloaded whichever employee happened to be current.
- Its "seed from the dashboard" branch guarded the end-time assignment on
  `option.workStartTime` rather than `option.workEndTime`, so an end time could never
  arrive on its own.
- `components/app/days-picker.nvue` assigned to its own `onDays` / `offDays` **props** on
  every change. Vue 2 let the write through (the parent re-rendered over it); Vue 3 warns
  and discards it. The component only emits now, and its parent binds with
  `v-model:on-days` instead of the removed `.sync` modifier.
- `settings/notification/edit.nvue`'s `displayReminder` was a computed that **filtered
  `reminderOptions` in place** — assigning the filtered result back to the same array it
  read, and decrementing a height on every evaluation. Each re-render shrank the list, so
  reminder choices vanished as you used the page. Both are derived values now.
- `settings/subscriptions.nvue`'s `defaultSubscriptionId` computed *dispatched a fetch*
  when the types had not loaded and then fell through to `defaultSubscription.id` —
  throwing on `undefined.id` every time it hit that path.
- `subscription-item.vue` passed a one-element **array** to a `String` prop
  (`:type="[isChecked ? 'checkbox' : 'circle']"`). Vue 2 coerced it via `toString`;
  Vue 3 logs a prop-type warning.
- `companyInformation.nvue` registered a `uni.$on('update:currency')` handler with no
  matching `$off`, so every visit to the page left another listener attached.
- **Layout pass** — the H5 half is done; see "The H5 layout pass". A device run is still outstanding.

# apps/obs

## It was built from `vegetable.web`, not `Vegetable.Obs`

The plan named `Vegetable.Obs` (Nuxt 1, 2018). That is not the current booking site.
`vegetable.web/src/Frontend/ui` (last commit Nov 2021) is a Vue 3 rewrite of the same
wizard, and it is what `apps/obs` is ported from.

`Vegetable.Obs` was dead in three separate ways, all verifiable against the API:

- It fetched the owner from `owner/search?alias=`, which is on `OwnerController` —
  marked `[AuthorizeOwner]`. Anonymously that is a 401. The anonymous route is
  `publicowner/search/{alias}` on `PublicOwnerController`.
- `date.vue` read `mock/slots.js`, whose newest entry is in **May 2018**, with the live
  request commented out. No real day was ever bookable.
- `confirmation.vue`'s `book()` sent an email code and showed a "booking completed"
  modal without calling any reservation endpoint. Nothing was ever booked.

Plus `location.vue` was the literal placeholder `<li>address</li>` whose one method
called `this.store.commit` (no `$`), and `locationnavigation.vue` bound `@click` to an
undefined `resetAddress`.

## What changed from `vegetable.web`

| Old | New |
|---|---|
| Vuex 4 (`actions.type.js` / `mutations.type.js`) | 2 Pinia stores, constants gone |
| vue-cli 4 (webpack) | Vite 5 |
| `store/api.service.js` (own axios instance) | `@vegetable/api-client` + axios transport |
| Alias from a hidden `<div id="moniker">` the Razor host rendered | route param, `/{alias}` |
| Mounted into an ASP.NET MVC page (`Views/PersonalPage/PersonalView.cshtml`) | standalone SPA with vue-router |
| `mock/slots.js` (2018) | `publicowner/monthslots` + `publicowner/slots` |
| No reservation call | `PUT publicowner/reservation/{alias}` → `GET publicowner/verifycode/{phone}` |

`PublicService` in `packages/api-client` had been scaffolded against invented routes
(`public/owner`, `public/reservation`). Neither exists — every public route is under
`publicowner/`. Corrected.

### Booking now needs a reCAPTCHA key

`QueryTokenFilter` (`Vegetable.API/Filters/TokenFilter.cs`) guards both write endpoints:
it reads `?token=`, posts it to Google's siteverify, and 401s on anything else.
`vegetable.web` sent no token at all, so its booking call could only ever have failed.
`src/plugins/recaptcha.js` fetches a v3 token on demand; set `VITE_RECAPTCHA_SITE_KEY`.
With no key the wizard runs to the last step and says booking is unavailable rather than
firing a request that would 401.

### Verification flow changed with the API

The old flow was email: send a code to the address, check it, show success. The API's
flow is phone + Telegram — `PUT publicowner/reservation/{alias}` holds the reservation
against a command key and returns either `CustomerWithTlg` (bot already knows them) or
`NoTlg` with a `tlgUrl` to subscribe first. `GET publicowner/verifycode/{phone}` is what
actually writes the reservation. The confirmation step follows that, and the copy talks
about phone numbers rather than email.

## Pre-existing bugs in `vegetable.web`

- **The date step could never populate.** `date.vue` mapped `getSelectedService`, a
  getter deleted when multi-service selection landed ("Added multi services", edf34d8).
  It was permanently `undefined`, and `initCalendar()` guarded on it — so the guard never
  passed. `initCalendar()` was also never called on mount, only from watchers and the
  month buttons.
- **"Clear services" cleared nothing.** `RESET_SERVICES` and `RESET_SERVICE` were both
  `= "resetServices"`, so the two mutations collided on a single key in the mutations
  object. The survivor expected a service argument; called with none, `indexOf(undefined)`
  returned `-1`.
- **The wizard tab strip was hardcoded to three columns** —
  `"uk-child-width-1-" + 3; //store.state.steps.length`, with the real expression
  commented out beside it. Owners with four or five steps got a wrapped strip.
- **`location` and `employee` steps had no components registered.** `PersonalPage`
  pushed both steps for owners with more than one address or employee, but registered
  only service/date/confirmation, so those steps rendered as unresolved
  `<component :is>`. Both are implemented and registered now.
- **`employee.vue` could not have run**: it committed the bare string `'changeEmployee'`,
  which stopped being a mutation name in the constants refactor, and its `<img src>` used
  a `~/assets` webpack alias this project's config did not define.
- **`ymaps.ready(...)` threw on every page view.** It was called unconditionally inside
  the owner fetch, and `_PersonalPage.cshtml` loaded only Bootstrap — no Yandex script.
  The ReferenceError landed in an unawaited promise, so it was invisible.
- **No UIkit either.** Same layout, same omission — every `UIkit.tab(...)`,
  `UIkit.notification(...)` and `UIkit.offcanvas(...)` call in the app referenced an
  undefined global. `index.html` loads UIkit, and the calls go through
  `src/composables/wizard.js`.
- **Social links downgraded their own URLs**: built as `'http://' + url`, so a link the
  owner saved with a scheme became `http://https://...`.
- `servicenavigation.vue`'s `<li>` carried a hardcoded `uk-active`, so the service tab
  looked active on every step.
- The resend countdown's `setInterval` was never cleared on unmount — only on reaching
  zero or restarting — leaving a timer ticking against a dead instance.
- `selectedDateTime` was stored as a preformatted string alongside the date and the time,
  and never recomputed on a language change, so the tab kept the old locale. Derived now.
- The calendar was laid out Sunday-first regardless of locale. It follows
  `localeData().firstDayOfWeek()` now — Monday for ru, Sunday for en.
- moment's `ru` locale was only present because webpack bundles every moment locale by
  default. Vite does not, so it is imported explicitly in `plugins/i18n.js`; without that
  switching to Russian would have silently left dates in English.

## Dead code not carried over

- `components/ReservationWizard.vue` and `components/Steps/*` (Bootstrap 5 + bs-stepper +
  v-calendar) — a second, newer wizard nothing imports. `PersonalPage` uses the UIkit one.
- `components/OwnerAvatar.vue`, `components/SocialNetworkItem.vue` — never imported.
  `OwnerAvatar` also carried a `socialNetworkOptions` computed referencing
  `this.socialNetwork`, a property it does not have, and `name: "socialNetworkItem"`.
- `store/modules/customer.module.js`, `employee.module.js` — copy-pasted from the mobile
  app, complete with `// #ifdef APP-PLUS` uni-app conditional compilation and imports of
  `@/plugins/helpers.js` and `local.storage.js`. Both of those files exist in the repo at
  **0 bytes**. Neither module is registered in `store/index.js`.
- `store/modules/logs.module.js`, `local.storage.js` — 0-byte files.
- `mock/slots.js`, `mock/Reservations.js` — replaced by the real endpoints.
- `hooks/form.js`, `hooks/field.js` — only used by the dead Bootstrap wizard.
- `vendor/Stepper/**` — a vendored copy of bs-stepper, same.

## Verifying it

`npm run dev:obs`, then open `http://localhost:5174/{alias}`.

The wizard was driven end to end against a stub of `PublicOwnerController`: owner load,
address → two services → employee → day → time → customer form → booking → code
verification → confirmation summary, in both locales, with no console errors. The
request shapes came out right, including `duration=180` for a 60+120-minute
two-service booking. A real run needs `Vegetable.API` reachable and
`VITE_RECAPTCHA_SITE_KEY` set.

# The H5 layout pass

Every one of the 29 routes was walked at a 375×812 viewport against a stub of the
owner-side API, with a scripted auditor checking each page for: elements overflowing
the right edge, containers collapsed to zero height while holding laid-out children,
`.flex-row` containers whose children had stacked vertically, and any element inside a
converted (`.nv`) subtree that had not picked up the weex box model.

It found two bugs, both of which broke the nvue→vue conversion outright. Both are
fixed in `src/styles/nvue-compat.scss`, and both would have shipped: they are
cascade/layout problems in the webview renderer, which is what app-plus uses too.

## 1. The compat sheet was inert

`nvue-compat.scss` wrapped everything in `:where()` so the weex defaults would have
zero specificity and never beat a component's own styles. That is the right intent,
but uni-app's base stylesheet ships `uni-view { display: block }` — specificity
(0,0,1), which outranks (0,0,0). **The `display: flex` half of the compat layer never
applied at all.**

Measured on the dashboard: **325 of the 665 elements inside converted subtrees were
laid out as blocks**, including 17 of the 24 `.nv` roots. It was not obvious because
block and `flex-direction: column` stack children the same way, so column layouts
looked right by accident; rows, `flex: 1` sizing and `align-items` did not.

`display` is now declared separately at just enough weight to beat that base rule —
plain `.nv` on roots, and `:not(nv-never)` on descendants for (0,0,2), still below any
component class selector. Every other property stays at (0,0,0). After the fix: 0 of
665.

## 2. Pages could not fill the screen

A weex page *is* the viewport, so a converted root saying `flex: 1` filled it. The
webview renderer's page body is an auto-height block, so `flex: 1` had nothing to fill
and collapsed. On the dashboard the swiper measured **0px tall** — the entire day list
was invisible, with the page body 45px high (just the nav bar).

`page` is now a full-height flex column. The nuance is which kind of full-height:

- `min-height: 100%` for pages that scroll as a page (the settings forms).
- `height: 100%` for converted pages whose root is a flex column, because those scroll
  *inside* themselves via a `<scroll-view>` with `flex: 1` — the way the nvue original
  used `<list>`. Under `min-height` alone that scroll-view just grew to fit its rows
  (measured 1925px for 25 customers), so it never became a scroller, `@scrolltolower`
  never fired, and the customer list was **stuck on its first 25 rows forever**.

Selected with `page:has(> .nv.flex-column)`.

## What the pass did not find

After the fixes, all 29 routes audit clean: no overflow, no collapsed containers, no
stacked rows, and every element in a converted subtree has the weex box model. The one
remaining `display: block` inside a `.nv` subtree is `uni-popup__wrapper-box`, which
the vendored popup declares for itself — a component style correctly winning over the
default, which is the behaviour the specificity scheme is designed for.

## A trap worth knowing about

Twice during this pass a `ReferenceError: tArray is not defined` appeared in the
console pointing at `pages/index/index.vue`, where `tArray` is plainly imported. Both
times it was a **stale message**: once from a Vite dev server that had been running for
a day across many edits, once from the console panel retaining messages across a
navigation. The tell is the `?t=<timestamp>` query on the module URL in the stack
trace. A fresh dev server and a clean tab both show nothing. Restart the dev server
before believing an error in this app.

## Verifying it yourself

`npm run dev:mobile` serves H5 on 5175, but most screens need data — the app fetches
its whole aggregate from `owner/` on the dashboard, and the other tabs read from that.
Point `config.js`'s H5 `ApiBaseUrl_Local` at a reachable `Vegetable.API`, or the pages
render as empty shells. The user record must come back with
`onboardingCompleted: true` or the dashboard relaunches into onboarding.

# The Industry redesign

`apps/mobile` is being moved onto **Industry**, the design system in the
"BusyCarrot mobile redesign" Claude Design project
(`_ds/industry-c7bbc332-ae54-42d1-88f2-018469ae55bf`). Two decisions were taken
up front: the dashboard uses the working prototype's own day view (1a) rather
than the rail/docket/chair-side alternatives, and the system is extended to the
22 pages the redesign does not draw.

## The two source files, and which one matters

The project holds `BusyCarrot - Current App.dc.html` and
`BusyCarrot - Industry Redesign.dc.html`. The first is a **recreation of the app
as it already exists** — its own header says so, and it is accurate: the palette,
the 9px/14px radii, the `0 0 5px #ccc` shadows and the `100rpx`/`18rpx`
free-time block all match the source exactly. It is the baseline the redesign is
measured against, not something to build. The redesign is the second file.

## What Industry is

The opposite of what the app looked like. Square corners instead of radii;
transparent hairline-bordered "blueprint" objects with `+` registration marks at
the corners instead of white cards with drop shadows; one steel accent
(`#5980a6`) instead of the green/blue/orange trio; Barlow Condensed over Barlow
instead of system fonts; Lucide SVG at stroke 1.5 instead of the `uniicons`
font. The one solid object on the board is the primary button, and the one full
colour field is the `accent-900` plate.

## How it is wired in

- `src/styles/industry.scss` — the tokens and primitives. Nothing downstream
  hard-codes a hex, a font or a spacing number.
- `src/plugins/fonts.js` — Barlow / Barlow Condensed. A CSS `@import` only
  resolves on H5, so app-plus registers the families through
  `uni.loadFontFace` at launch; without it both families fall back to system-ui
  on a device and the whole redesign renders in the wrong type.
- `src/components/ui/lucide-icon.vue` — the icon set.
- `src/components/ui/uni-icons/uni-icons.vue` — **re-pointed at Lucide**. The
  props, the `click` event and the `type` names are unchanged and a MAP
  translates each uniicons name, so the swap reached all ~19 call sites without
  touching them. The `.ttf` and its CSS are no longer imported.

The 22 uncovered pages are carried by the same trick: they are built almost
entirely from `uni-list-item`, `uni-nav-bar`, `uni-section` and the `.input-*`
classes in `vegetable.scss`, so restyling those four moved the whole app at
once. All four tab pages render with square corners, Lucide icons and no
overflow without being edited individually.

### Two things the runtime forced

- **`color-mix()` is unwrapped into literal rgba** in the token sheet. Older
  app-plus webviews are behind on CSS Color 5, and a failed `color-mix()` drops
  the whole declaration rather than degrading — divider lines would vanish.
- **Lucide renders as a data-URI `<image>`, not an inline `<svg>`.** app-plus
  does not implement inline SVG; a literal `<svg>` draws nothing on a device
  while working fine in H5. `currentColor` cannot cross that boundary, hence the
  explicit `color` prop.

## Two pre-existing bugs this surfaced

Both are the same vue-i18n v9 trap as the `tArray` one above, and both were
invisible until a screen rendered real figures.

1. **Every price rendered blank.** `common.price-format` is `"{0}{1}"`, and
   under v9 those braces are *list interpolation* — so `$t('common.price-format')`
   consumed the placeholders with nothing to put in them and returned `""`. The
   `format()` helper then had an empty template to work with. Affected the day
   and month totals and every booking's cost.
2. **`reservation.more` rendered `"( more)"`** for the same reason.

Fixed by letting vue-i18n do the interpolation it is already parsing for —
`$t(key, [a, b])` — rather than calling `t()` and running our own formatter over
the result. Those are the only two locale strings in the app that use positional
placeholders, so the blast radius is closed.

## The five surfaces, rebuilt

Each is now the layout the redesign draws, not just the system applied to the old
shape:

- **Day** — the accent-900 plate carrying the date and the money, then a 42px time
  column against blueprint-framed bookings. Bookable gaps are dashed outlines
  rather than filled green blocks: a gap is an absence, so it is drawn as one.
- **Clients** — a framed initials square, the name in condensed over the number,
  and the right edge carrying when they are next in and how many visits they have
  had. `nextVisit` and `visitsText` are derived from the reservation store,
  which already had the per-customer getters.
- **Services** — a spec-sheet table: a monospace index, the service over its
  description, then minutes and price reading down the right edge in condensed
  figures, under real column heads.
- **Schedules** — each schedule is its own blueprint object with the type as an
  accent tag; the group heads are tracked micro-labels instead of grey bands.
- **Settings** — the subscription is the framed plate the design leads with, and
  the language row became an inline segmented control that switches the app
  locale directly. The dedicated languages page still exists and still works.
- **The notification feed** — day dividers are a large day number, the weekday
  tracked beside it and a rule to the edge; each entry is a framed icon square,
  the headline in condensed over its detail, with the time on the right.

  The feed row also unpicks a fold: `title()` used to return the headline and
  its detail joined by a newline, because the shared list item had only one text
  slot — and the *time* was returned from `note()`. They are three separate
  values now.

## The week strip

The dashboard now leads with the redesign's seven-day strip; the expandable month
calendar and the pull-down gesture machinery that drove it are gone from
`pages/index/index.vue` — the touch handlers, `expandSlotTransform`, the
click-away overlay and the two transform computeds.

It is a deliberate trade. The month grid could jump to any date and showed a dot
per booking; the strip shows one week and marks which days the shop is open, and
distant dates are reached by swiping the day list — which moves the window with
it — rather than by jumping. The window starts on the locale's own first day of
the week, so it reads Monday-first in Russian and Sunday-first in English.

`components/app/swipe-calendar.vue` and `components/app/custom-calendar/**` are
orphaned by this and left in place rather than deleted: Vite does not bundle an
unimported module, so they cost nothing, and it is a decision you might want to
reverse.

### It surfaced a sixth i18n bug

Building the strip against `moment.localeData().firstDayOfWeek()` showed it
returning Sunday while the interface was in Russian. **moment ships no locale
data unless it is imported.** Webpack pulled the whole locale directory in by
default, so the Vue 2 app got Russian dates for free; Vite does not, which made
every one of the six `moment.locale(this.language)` calls in the app a silent
no-op. The interface switched language and the dates stayed English — the
schedules screen read `Основной график работы` above `Jul 3, 2026-Aug 2, 2027`.

`plugins/i18n.js` now imports `moment/dist/locale/ru`, and `setLocale()` keeps
moment in step with vue-i18n, which fixes all six call sites at once. The same
trap was already fixed in `apps/obs`; it was still live here. After the fix that
row reads `3 июля 2026 г.-2 авг. 2027 г.`

## The tab-bar icons

uni-app's native tab bar takes raster files, not components, so the Lucide swap
that reached every other icon through `uni-icons` could not reach these. The ten
PNGs in `src/static/icons` are now generated from the same Lucide path data the
app renders everywhere else — `calendar`, `clients`, `services`, `schedules` and
`settings`, each at rest (`--color-neutral-600` #7a7a7d) and selected
(`--color-accent` #5980a6).

They are 81×81, which is uni-app's @3x recommendation, drawn on a canvas at
stroke-width 1.5 with round caps and joins so they match the inline set exactly.
Between 937 b and 3.2 kB each; the pair for a given tab has identical ink
coverage, which is the check that they differ only in colour.

The filenames are unchanged, including the original `clientsSelcted.png`
misspelling — `pages.json` already points at it, and renaming would have been a
second change for no benefit.

### Three orphaned assets

`src/static/**` is copied into the build wholesale, so an unreferenced file there
costs real bundle size — unlike an unimported `.vue`, which Vite drops.

- `calendarToday.png` (11.9 kB) — orphaned by this work: the dashboard's
  "back to today" button is a Lucide `calendar` glyph now.
- `employees.png` (13.3 kB) and `employeesSelected.png` (21.8 kB) — already dead
  before any of this. There is no employees tab; they are left over from the
  original app.

47 kB in total. Left in place rather than deleted, since removing assets is a
one-way door — worth a decision.

## Still to do

- **A device pass**, again: the font loading, the data-URI icons and the
  `mix-blend-mode` duotone on the login hero are all things H5 cannot vouch for.

# apps/admin — the Industry desktop redesign

Built from `BusyCarrot - Desktop.dc.html` in the Claude Design project. Admin was
a Dashboard with a slide-out actions panel; it is now a sidebar shell over five
sections, and **Vuetify is gone entirely**.

## Vuetify removed

The design is built from the Industry stylesheet's own primitives — `.btn`,
`.table`, `.blueprint`, `.seg`, `.input`, `.tag` — and uses no Material
component anywhere. Admin had 237 Vuetify tags; carrying the framework would
have meant shipping a UI library nothing rendered. `vuetify` and `@mdi/font` are
out of `package.json`, `plugins/vuetify.js` is deleted, and the bundle contains
no Vuetify code.

`VCalendar` went with it. It cannot draw a proportional time grid — it lays
events out as chips inside day cells, not as blocks against a ruler — so the
calendar is hand-built.

## What is there

- `styles/industry.css` — the design system's stylesheet, vendored so it can be
  re-synced. Unlike the mobile copy it keeps `color-mix()` and the webfont
  `@import`: admin is a browser app, not an app-plus webview.
- `components/ui/LucideIcon.vue` — inline SVG here rather than mobile's data-URI
  variant, so `currentColor` works.
- `components/AppShell.vue` — 216px sidebar, 64px title bar, content slot.
- `components/calendar/TimeGrid.vue` — the hour gutter and day columns.
- `composables/useDayColumns.js` — the geometry, shared by the grid and Hours.
- `stores/schedule.js` — **new**; admin had no notion of schedules, and both the
  Hours section and the calendar's open/close bounds need them.
- Five pages: Calendar, Clients, Services, Hours, Settings.

### The grid

08:00–20:00 at 0.95 px per minute, giving a 684px column. A booking at 13:00 for
an hour lands at `top: 285px` — `(780 − 480) × 0.95` — and stands 55px tall,
`60 × 0.95 − 2`. Closed days are hatched rather than blanked so they still read
as part of the week; gaps shorter than 20 minutes are not offered, since nothing
in the price list is shorter.

## Three things found while wiring it

1. **The service and employee stores hold `{ id, checked, service }` wrappers.**
   The pages were reading `s.title` off the wrapper, so the new-booking rail
   showed a 0-minute, zero-cost draft. Added `activeServices` / `activeEmployees`
   getters that unwrap, matching the customer store's existing `activeCustomers`
   rather than making every caller know about the wrapper.
2. **Hours labelled the week Sunday-first while the API indexes
   `scheduleOnDays` Monday-first** — an off-by-one that put Monday's hours under
   a Sunday heading. `moment.weekdaysShort(true)` sorts by locale, which is not
   the same thing as the data's own order.
3. **Only the calendar was loading the owner aggregate**, so a cold navigation
   straight to `/hours` or `/clients` found the stores empty — Hours drew every
   day as closed. That bootstrap belongs to the shell and now lives there.

## Worth knowing

- **Derived figures reflect the loaded window, not all time.** The clients
  table's visits/last/next and the services table's "booked" are computed from
  the reservations the calendar has fetched, because the API exposes no
  aggregate for either.
- **The layout is fixed at the design's 1440px.** The design specifies no
  responsive behaviour and none was invented: below roughly 1100px the fixed
  216px sidebar and 334px rail squeeze the middle column. Verified clean at
  1440×900 — zero overflow on all five sections, document width exactly 1440.
- **The accent is steel `#5980a6`,** the design system's own, so desktop matches
  mobile. The doc's canvas previews a green `#4f7a68`, but that is a theme knob
  whose fallback in the doc's own script is `#5980a6`.
- **Verification needs the auth bypass.** Auth0's `checkSession` hangs rather
  than failing when it cannot reach a tenant, so no request is ever made. A
  temporary env-flagged bypass was used and has been reverted.

## The editors

The design draws entry points but no editors, so these are an extension of the
system rather than a transcription of it. All three are the design system's own
`.dialog` / `.dialog-backdrop`, via `components/ui/AppDialog.vue` — teleported to
`<body>` so a dialog opened deep inside the shell is not trapped by the shell's
`overflow: hidden`.

- `editors/ServiceEditDialog.vue` — reached from a Services row or "Add service".
  Carries over both fixes the Vue 3 port made to the old editor: the default is a
  factory rather than a module-level object two dialogs could scribble on, and
  the draft is re-seeded on open so reopening for a different service does not
  show the previous one.
- `editors/EmployeesDialog.vue` + `EmployeeEditDialog.vue` — reached from the
  Settings "Employees" row, which the design gives a count and a chevron and
  nothing behind it. The save shape is unchanged: `employeeServices` is rebuilt
  from the ticked ids as `{ service, employee }` links, which is what the API
  expects.
- `elements/ColorSelector.vue` — rebuilt as a square swatch grid. It still
  **stores Vuetify's colour names** ('red', 'deep-purple', …) because that is
  what the API holds and what mobile reads; only the rendering is ours, with the
  palette mapped to hex here rather than resolved by a framework that is no
  longer installed.

`components/actions-panel/**` is deleted — ActionsPanel, GeneralSettings,
EmployeesList/InList, ServicesList/InList and UserProfile were all superseded by
the five sections and these dialogs.

### The two capabilities that were dropped, and are back

Both were listed here as dropped by the redesign. Both have been restored.

**Employee avatars.** `elements/AvatarPicker.vue` picks a file, draws it into a
square canvas, and lets it be dragged and zoomed before reading it back as a
data URL — the same thing `Employee.Avatar` already stored, and the same thing
the old editor wrote. It does not bring `vue-advanced-cropper` back: one field
in one dialog did not justify the dependency, and the crop is about eighty
lines of canvas.

The output is JPEG at 0.85 rather than PNG. This string rides in the employee
record on every fetch, and a photograph as PNG is several times the size — the
test crop came to 4 KB.

Where a photograph exists it fills the framed square the design gives a person,
in the editor and in the employees list, so the system's square is kept and only
its contents change.

**Owner company details.** `editors/OwnerEditDialog.vue`, reached from a new
Company row on the Settings page. Same field set as the Vuetify
`general-settings.vue` it replaces: name, description, alias, currency, the
publish switch and the address list. That component never edited phone numbers
or social links, and neither does this — an earlier note here claimed otherwise
and was wrong.

Two bugs found while verifying it against the real API:

- `owner/information` answers **200 with an empty body**. The first version read
  `response.data ?? draft`, and an empty string is not nullish, so it stored
  `''` as the owner — which persists, so the next load had no owner at all and
  the dialog opened blank. It now checks for a non-empty body.
- The Settings page read `currency.code`; the API sends `currencyCode`. The row
  had been rendering "undefined ₽". The stub had invented `code`, so this only
  appeared against a real API. Both are now aligned.

### A bootstrap bug this surfaced

The shell guarded its data load on `owner.owner?.id`. The owner store is
persisted; the employee and service stores are not, and they are populated *as a
side effect of that same call*. So on any reload with a persisted owner the
services and employees stores stayed empty for good — the Services page showed
"0 services" against a populated API. The guard now covers everything the call
fills.

# Deploying the two web apps

Both are static sites. `npm run build:admin` and `npm run build:obs` each
produce a `dist/` folder that is the whole deployable: hashed assets, an
`index.html`, a favicon and a `web.config`. Copy the folder to an IIS site
root; there is nothing to install and no process to run.

## The build belongs to one environment

Vite inlines every `VITE_*` value into the JavaScript at build time. The API
URL, the Auth0 client id and the reCAPTCHA site key are compiled in, so **an
artifact cannot be promoted from staging to production** — build once per
target with that target's `.env.production`.

`.env.production.example` in each app is the template and is tracked;
`.env.production` itself is not, so a stray commit cannot repoint an
environment. None of the values are secrets: they all ship in the bundle by
design, and the Auth0 client *secret* appears nowhere in this repo.

## What the web.config does

It lives in `public/`, so Vite copies it into `dist/` on every build and the
folder stays self-contained. Three things:

**The SPA fallback.** Both apps use vue-router in history mode, so `/clients`
and `/{alias}` are routes the client resolves, not folders on disk. Anything
that is not a real file or directory is rewritten to `/index.html`. Obs needs
this more than admin does: every owner's page is a path, so without the rule
every booking link anyone has shared returns 404.

This needs the **IIS URL Rewrite module**, which is not installed by default.
Missing, IIS answers 500.19 on the config file rather than ignoring the rule —
it fails loudly, which is the good failure.

**MIME types.** IIS has no mapping for `.json`, `.woff2` or `.webmanifest` and
answers 404 for them out of the box.

**Caching.** Everything under `/assets` is fingerprinted by Vite and is served
`immutable` for a year. `index.html` is served no-cache: it is the file that
names the current hashed bundles, so caching it makes a deploy invisible until
the browser gives up on its copy.

## Auth0 has to be told the origin

Admin's login fails at the tenant, not in the app, unless the deployed origin
is in **Allowed Web Origins**, **Allowed Callback URLs** and **Allowed Logout
URLs** for client `KpF5kduqFqXVHykbcCDDMYhUI0VPboP3`. The symptom is an
origin error in the console followed by the SSO warning Lock always prints.

## Obs serves UIkit itself

`index.html` used to pull UIkit's stylesheet and both scripts from jsdelivr.
UIkit drives the booking wizard's tab/switcher, the modals, the offcanvas and
every icon, so that put the public site's core interaction behind a third party
being reachable: lose the CDN and the page loads but cannot take a booking.

The files now come from `/vendor/uikit/`, copied out of `node_modules` by
`tools/vendor-uikit.mjs` on `predev` and `prebuild`. npm owns the version —
`uikit` is a dependency of `apps/obs` — and the copies are gitignored because
they are build output.

They are loaded as **classic script tags, not an ES import**, and that is not
laziness. `import UIkit from 'uikit'` does yield a working object: `UIkit.tab(el)`
and `UIkit.icon(el)` both behave when called explicitly. What does not survive
Vite's interop is UIkit's automatic boot, the pass that scans the document for
`uk-*` attributes — so with the import, all six `uk-icon` elements rendered
empty and the declarative switcher never activated. Measured before and after:
0/6 icons with the import, 6/6 with the script tags.

## Obs cannot take a booking without a reCAPTCHA key

`VITE_RECAPTCHA_SITE_KEY` is not optional for the public site.
Vegetable.API guards `PUT publicowner/reservation/{alias}` and
`GET publicowner/verifycode/{phone}` with `QueryTokenFilter`, which verifies a
reCAPTCHA token and returns 401 without one. Unset, the wizard runs to the last
step and then says captcha is not configured — an honest failure, but still a
booking site that cannot take a booking.

## What was removed

`apps/admin` carried a `Dockerfile`, two compose files and a `.dockerignore`
from VS Code's "Add Docker Files" command. None of it worked for this app: the
Dockerfile ran `npm start`, which is not a script here, and served port 3000
for what is a folder of static files; `compose.debug.yaml` ran
`node --inspect index.js`, which does not exist; and the build context was
`apps/admin` alone, which cannot resolve the `@vegetable/api-client` workspace
dependency. Deleted rather than repaired — the target is IIS.

# Running the real Vegetable.API locally

Everything in this document was verified against `tools/mock-owner-api.mjs`
until this point. The stub answers the shapes the client asks for; it validates
nothing, and it agreed with mistakes the real API does not. They are described
at the end.

## What it needs

- **.NET 6 SDK.** `Vegetable.API` targets `net6.0`.
- **The .NET Framework Developer Pack.** `Vegetable.Entities` is an old-style
  project targeting `v4.7.2`, and `net6.0` can consume it — but MSBuild needs
  reference assemblies for it. No current installer ships the 4.7.2 pack, so
  `Vegetable.Entities.csproj` takes a `Microsoft.NETFramework.ReferenceAssemblies`
  PackageReference instead and the build stops depending on what is installed.
- **Postgres.** `appsettings.Local.json` expects `localhost:5432`, database
  `vegetable`, `postgres`/`123qwe`.

```
docker run -d --name vegetable-postgres \
  -e POSTGRES_PASSWORD=123qwe -e POSTGRES_USER=postgres -e POSTGRES_DB=vegetable \
  -p 5432:5432 -v vegetable-pgdata:/var/lib/postgresql/data postgres:14

dotnet tool install --global dotnet-ef --version 6.*
dotnet ef database update --project Vegetable.Core --startup-project Vegetable.API
```

81 migrations, 26 tables. Then, from `Vegetable.API`:

```
dotnet run --launch-profile "Kestrel Local"
```

`launchSettings.json` only had IIS profiles, so a Kestrel one was added. HTTP
rather than HTTPS: nothing here needs TLS and it avoids the dev-certificate
dance. CORS is already `AllowAnyOrigin`.

## Auth0 is not in the API's path

Worth knowing before trying to make Auth0 work locally: you do not need to.

`[AuthorizeOwner]`, the attribute on `OwnersController`, reads
`HttpContext.Items["OwnerId"]`. That is set by `JwtMiddleware`, which validates
an **HS256 token signed with `Configuration["Secret"]`** and reads `id` and
`userId` claims. It is the API's own token, not an Auth0 one. Admin sends an
Auth0 token, which this middleware cannot validate — so admin talks to a local
API through `VITE_DEV_API_TOKEN` (see `plugins/dev-auth.js`), behind the same
`import.meta.env.DEV` guard as the login bypass.

## Getting a token

`users/authenticate` issues one, valid for ten years, and creates the owner if
the phone number is unknown. It is gated on a code the API caches, which
`SendVerificationCall` puts there — and that has a test path: **a phone number
containing `123456` gets the code `123456`** without any call being placed.

The captcha in front of it is real, and the answer is only in the image:

```
GET  users/getcaptcha/{key}                       -> base64 GIF, read it
GET  users/SendVerificationCall/79161234567?key={key}&captcha={answer}
POST users/authenticate  { code: "123456", user: { phoneNumber: "79161234567", ... } }
```

The response carries the owner, the user and the token.

## One table the migrations leave empty

`ApplicationSettings` is created by the migrations but never seeded, and
`SettingsRepo.GetApplicationSettings()` calls `Single` on it — so
`settings/applicationSettings` throws "Sequence contains no elements" and
500s. Mobile calls it on startup, so the app boots into a failed request.
One row fixes it:

```sql
insert into "ApplicationSettings" ("MinIOSVersion", "MinAndroidVersion")
values ('1.0.0', '1.0.0');
```

Currencies, SubscriptionTypes and Discounts are seeded by the migrations;
only this one is not.

## Two things the stub had wrong

Both were found within minutes of pointing admin at the real API, and both were
bugs in the app rather than in the stub — the stub simply never disagreed.

**A reservation needs its customer object, not just the id.**
`OwnerRepo.CreateReservation` reads `reservation.Customer.Id` before anything
else, so `{ customerId }` alone throws a NullReferenceException and the request
comes back 500. Admin's calendar sent exactly that.

**`ScheduleType` was transposed in admin.** `week` is 0 and `switch` is 1;
`stores/schedule.js` had them the other way round, so `weekSchedule` searched
for a type no weekly schedule carries, every lookup returned null, and every day
rendered closed. `apps/mobile` had it right in `constants/schedule-types.js`.
The stub had been written to serve `scheduleType: 1` — agreeing with the wrong
constant — which is exactly how a stub hides this class of bug.

A third gap surfaced the same way: `createReservation` did not exist on admin's
reservation store at all. The calendar had always called it, and no request had
ever left the browser.

The stub now emits `sequence` on `scheduleOnDays` the way the real API does, and
`scheduleType: 0` for a weekly schedule.

## Running admin without Auth0

Auth0 is awkward to run against locally, and its failure mode is the worst kind:
when `checkSession` cannot reach a tenant it does not throw, it **hangs**. No
request is ever made, nothing appears in the console, and the app sits on an
empty shell. It blocked verification of this app twice.

`src/plugins/dev-auth.js` is the way in. Put this in `apps/admin/.env.local`:

```
VITE_DEV_BYPASS_AUTH=true
```

The router then stops redirecting to `/login` (and bounces `/login` itself to
the calendar, since that route renders the Auth0 widget), and `getToken` returns
`null` immediately instead of waiting on Auth0.

### It cannot reach production

The flag is `import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH ===
'true'`. Vite substitutes the literal `false` for `import.meta.env.DEV` when
building for production, so the constant folds, every `if (devAuthEnabled)`
branch becomes unreachable and the minifier drops it. This is not a runtime
switch a misconfigured environment can flip — the code is absent from the
production bundle. Verified: `grep -c "devAuthEnabled\|VITE_DEV_BYPASS_AUTH"`
over `dist/assets/*.js` matches nothing.

Both halves were checked from a cold start with `localStorage` cleared:

| flag | asking for `/calendar` | shell | API calls |
| --- | --- | --- | --- |
| `true` | lands on `/calendar` | yes | 4 |
| `false` | redirects to `/login` | no | 0 |

### What it does not do

It bypasses *this app's* login, not the API's authorisation. `OwnerController`
is `[AuthorizeOwner]`, so requests without a bearer token get 401 from a real
Vegetable.API. Point `VITE_API_BASE_URL` at a local API with auth disabled, or
at a stub of the owner endpoints.

`tools/mock-owner-api.mjs` is that stub, and it is in the repo rather than
improvised each time:

```
npm run mock:api        # http://localhost:5098
npm run dev:admin       # http://localhost:5173
```

`apps/admin/.env.local` wires the two together. The stub answers the owner
aggregate, employees, services, customers, schedules and reservations with three
employees, three services, thirty customers and five reservations spanning
yesterday to tomorrow. Writes mutate its in-memory arrays, so create / update /
delete round-trip inside a session and reset on restart — enough to exercise the
editors, not a fake of the API's validation.

The alternative is the real thing: `Vegetable.API` under `ASPNETCORE_ENVIRONMENT=Local`
wants Postgres on 5432 with a seeded `vegetable` database, and its
`launchSettings.json` only carries IIS profiles. That is the honest test of the
API contract; the stub is the one that starts in a second.

# Packaging with Capacitor

The app used to be wrapped by HBuilderX: `uni build -p app` emits a resource
bundle, and HBuilderX or DCloud's cloud build turns that into an APK or IPA.
That is a GUI on one machine, which is not somewhere a release should live.

## Why not DCloud's offline SDK

The documented way off HBuilderX is DCloud's Android offline SDK — a Gradle
project you drop the bundle into. Our uni-app version, `3.0.0-5010520260709002`,
is HBuilderX 5.1.5 of 2026-07-09, and DCloud publishes `Android-SDK@5.15.2026070915`,
an exact match, so no version bump would have been needed.

It is only distributed through Baidu Cloud and Hexacloud, both of which want an
account, an extraction code and a captcha. There is no direct download and no
way to script one. A third-party GitHub mirror exists; a native SDK compiled
into a shipped app is not something to take from an unofficial mirror.

`tools/android-offline-package.mjs` was written and tested against a mock SDK
layout before that route was abandoned, and then deleted. It is in the session
history if the decision is ever revisited.

## What ships now

**The H5 bundle, not app-plus.** Capacitor wraps a web build, so `uni build`
(no `-p app`) produces the shipped artifact and a native shell serves it from
`https://localhost` inside a WebView.

That is a bigger change than it sounds, because the H5 target had always been
the *dev* target. Anything guarded by `#ifndef APP-PLUS` used to be a
convenience so a browser would not crash; all of it is now production code. Two
things had quietly rotted in there — see "What the switch exposed" below.

The app-plus path is untouched and still builds. Nothing about this is a
one-way door.

## The build

```
npm run cap:sync                                   # Local
node tools/capacitor-sync.mjs --env Production
```

`tools/capacitor-sync.mjs` does three things: builds the H5 bundle with
`VITE_APP_ENV` set, copies `versionName`/`versionCode` out of
`src/manifest.json` into `android/app/build.gradle` so the two packaging routes
cannot drift, then runs `cap sync`.

Which API host a build talks to is decided **at build time** by `VITE_APP_ENV`,
read in `src/config.js`. There is no runtime switch and no `.env` file in the
path, so a release cannot pick up a developer's local host by accident — the
same shape `apps/admin` uses.

Then:

```
cd apps/mobile/android && ./gradlew assembleDebug
cd apps/mobile && npx cap open android
```

`apps/mobile/android/` is committed. Capacitor treats the native project as
source, not output: the manifest, icons and Gradle config live there. `cap sync`
only rewrites `assets/public` and the generated config, both gitignored.

iOS is not set up — `npx cap add ios` needs macOS and CocoaPods.

### The toolchain

No Android Studio. The Gradle wrapper is committed, so Gradle downloads itself;
what has to exist beforehand is:

| | |
|---|---|
| JDK 17 | `C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot`, `JAVA_HOME` set |
| Android command-line tools | `C:\Android\sdk\cmdline-tools\latest`, `ANDROID_HOME=C:\Android\sdk` |
| SDK packages | `platform-tools`, `platforms;android-34`, `build-tools;34.0.0` |

`android-34` because Capacitor 6 builds against compileSdk 34; JDK 17 because
AGP 8.2.1 requires it. The command-line tools come from `dl.google.com` — winget's
`Google.AndroidCLI` is Google's newer agent-oriented CLI, not the classic
`cmdline-tools` that ships `sdkmanager`, and Gradle's SDK detection wants the
classic layout. Verify the download against the size and SHA-1 in Google's own
`repository2-3.xml` rather than trusting the transfer.

The SDK packages will not install until the Android SDK licences are accepted:

```
C:\Android\sdk\cmdline-tools\latest\bin\sdkmanager.bat --sdk_root=C:\Android\sdk --licenses
```

`sdkmanager` prints a deprecation notice pointing at the newer `android` binary.
Gradle still expects this layout; ignore it.

### What a debug build proves

`app-debug.apk`, 6.1 MB — `com.vegetable.mob`, versionCode 100, versionName
1.0.0, compileSdk 34, labelled "Busy Carrot". Inside it: 130 entries under
`assets/public`, the four declared permissions plus the FCM ones merged in from
the push plugin (`c2dm.permission.RECEIVE`, `WAKE_LOCK`), and the debug-only
`networkSecurityConfig` resolved.

It does **not** prove the push path. Capacitor's Gradle template skips the
google-services plugin when `google-services.json` is absent, so the APK builds
happily without Firebase and simply never registers. That still needs the
project.

## Three implementations per native call

`src/plugins/native.js` had two branches; it now has three, picked in order:

1. **app-plus** — the 5+ runtime, behind a conditional-compilation guard. Only
   `uni build -p app` reaches it.
2. **Capacitor** — the shipped path.
3. **Plain browser** — `npm run dev:mobile`.

Branches 2 and 3 share one compilation target, so they share a block and
`isCapacitor` (`Capacitor.isNativePlatform()`) separates them at runtime. The
import block for the Capacitor packages is itself conditionally compiled, so an
app-plus build does not pull them in.

| Was | Now |
|---|---|
| `plus.runtime.openURL` | `Browser.open` — Custom Tabs / SFSafariViewController |
| `plus.share.sendWithSystem` | `Share.share` |
| `plus.key.hideSoftKeybord` | `Keyboard.hide` |
| `plus.runtime.version` | `App.getInfo()`, cached |
| `plus.runtime.arguments` | `App.getLaunchUrl()` + `appUrlOpen`, cached |
| `plus.contacts.getAddressBook` | `Contacts.getContacts`, reshaped |
| `plus.messaging` SMS | `location.href = 'sms:…'` |
| `plus.nativeUI.toast` patch | `App` `backButton` listener |
| `plus.sqlite` | uni storage — the existing H5 fallback |
| `plus.push` | **nothing yet** — see below |

Three of those need a note.

**Two values are read synchronously that Capacitor only offers
asynchronously.** `plus.runtime.version` and `plus.runtime.arguments` are plain
getters; `App.getInfo()` and `App.getLaunchUrl()` are promises. Rather than make
six call sites async — one of them a computed property, `isOldVersion` — both
are primed once by `initNative()` (called from `App.vue` `onLaunch`) into Vue
refs. Reading a ref inside a computed keeps the dependency, so `isOldVersion`
re-evaluates when the version lands rather than being stuck on its first read.

**SMS needs no plugin.** Capacitor's `Bridge.launchIntent` hands any non-http
scheme straight to `startActivity(ACTION_VIEW)`. It does not call
`resolveActivity`, so Android 11 package visibility does not apply and no
`queries` block is needed. A location assignment works where `window.open`
does not.

**Press-again-to-exit was rebuilt, not ported.** The 5+ runtime emitted a
hardcoded Chinese toast that the original intercepted by reassigning
`plus.nativeUI.toast`. Capacitor hands the hardware back button over whole
instead, so `installExitToast()` now implements the two-press contract directly:
go back if there is history, otherwise toast, and exit on a second press inside
two seconds.

`plus.sqlite` needed nothing at all. It only ever stored per-device "is this
employee shown in the filter" flags, and the H5 fallback already backed those
with uni storage, which is WebView `localStorage` and persists.

## What the switch exposed

Promoting the H5 branch from dev convenience to shipped code turned up two
things that had been latent:

**`ReservationBaseUrl` was undefined in H5.** The public URLs sat inside the
app-plus block in `config.js`, but `pages/reservation/edit.vue:442` reads
`ReservationBaseUrl` on every target. In a browser it evaluated to `undefined`
and the share link came out as `undefined<id>`. Harmless while H5 was dev-only;
shipped breakage the moment Capacitor packaged that bundle. Anything not
genuinely per-target now lives outside both blocks.

**The H5 branch only had `_Local`.** It was written for one dev host. Capacitor
needs every environment app-plus has, so `Development` and `Production` are
there now.

## Android specifics

- **`applicationId` is `com.vegetable.mob`**, taken from the iOS
  `urlidentifier` in the old manifest. The old manifest never set an Android
  package name, so HBuilderX supplied its own default. **If there is a live Play
  listing, confirm its package name matches** — Play treats a different
  `applicationId` as a different app, and this cannot be changed after the first
  upload.
- **`versionCode` is 100**, from `src/manifest.json`, the same number the
  HBuilderX builds used. It must be *higher* than whatever is already on the
  store or the upload is rejected. Bump `src/manifest.json`, not `build.gradle`.
- **Contacts permissions are declared in `AndroidManifest.xml`.** The
  `@capacitor-community/contacts` plugin requests them at runtime but does not
  declare them; without the entries `requestPermissions()` is refused outright.
- **Cleartext is allowed for debug builds only.** `Local` and `Development`
  point at plain http, which Android has blocked by default since API 28.
  `app/src/debug/res/xml/network_security_config.xml` allowlists those hosts and
  lives under `src/debug`, so release builds stay https-only. Add a LAN IP there
  to run against an API on another machine.
- **Keystores are gitignored.** `android/.gitignore` shipped with `*.jks` and
  `*.keystore` commented out; they are uncommented now. The release key cannot
  be rotated — lose control of it and anyone can publish as us, lose the file
  and the listing can never be updated.

## Push moved from GeTui to FCM

On app-plus the device's push id was a GeTui client id, minted by the uniPush
SDK inside the DCloud runtime. A Capacitor app has no GeTui SDK, so that id has
no source. The two ways out were wrapping GeTui's native SDK in a plugin, or
moving to FCM/APNs; **FCM was chosen**, so the id is now a Firebase registration
token and the API grew a second sender.

Neither side is a rewrite. The payload contract is unchanged — the API sends
`{ title, body, url }` and the app navigates to `url` — which is what lets the
client code stay common between the two runtimes.

### The app

`@capacitor/push-notifications`. `registerPushHandlers()` maps the two runtimes
onto each other: both offer a "user tapped it" event and a "one arrived while
you were in the foreground" event, carrying a free-form payload.

| GeTui / 5+ | FCM / Capacitor |
|---|---|
| `plus.push.addEventListener('click')` | `pushNotificationActionPerformed` |
| `plus.push.addEventListener('receive')` | `pushNotificationReceived` |
| `plus.push.getClientInfo().clientid` | `registration` event token |

**The token is asynchronous, and that is the part with teeth.** A GeTui cid was
available synchronously the moment the runtime booted. An FCM token needs a
permission prompt and a round trip to Google. Both places that record the device
— the login screen and the dashboard's `fetchUser` — routinely run first, so
reading it synchronously posted a null and left the device unregistered until
some later launch happened to lose the race.

`whenPushClientId()` is the fix: it resolves the cached token if there is one,
waits for the `registration` event if one is in flight, and resolves **null**
rather than rejecting when there is genuinely no token — permission refused,
registration failed, or the 8s timeout elapsed. All three mean the same thing to
a caller, and every caller already treated a falsy id as "not registered".

Three call sites take the awaited form. The third is not obvious:
`components/app/user.vue` unregisters the device on logout, and logging out a
second after launch would otherwise unregister nothing and leave the phone
receiving pushes for an account it is no longer signed into.

`loginint.vue` also stopped posting `userData: [{ cid: null }]` unconditionally.
That persisted an empty registration row nothing could match or clean up; it now
posts an empty array and lets the dashboard register the device once a token
exists.

The iOS foreground re-raise is gone. GeTui delivered transparent messages that
iOS would not display by itself, so `App.vue` re-raised them as local
notifications. The API now sends a real APNs alert and `presentationOptions` in
`capacitor.config.json` tells iOS to show it, so `createLocalNotification()` is
deliberately a no-op on Capacitor. It stays for the app-plus path.

### The API

`Vegetable.Core/Services/FcmPushService.cs`, on `FirebaseAdmin`. It implements
the existing `IPushService`, so `NotificationMessagesSendWorker` — the only live
sender — did not change.

**Both providers stay registered.** `services.UsePushApi()` picks one from the
`PushProvider` setting in appsettings.json; it is `"GeTui"` today. This is not
fussiness: during the rollout the two populations are disjoint. A phone running
an HBuilderX build has a GeTui cid that only GeTui can reach, and a phone
running the Capacitor build has an FCM token that only Firebase can. Flipping
the setting decides which population gets notified, so it should not flip until
the Capacitor build is the one people are running — and the old rows want
clearing afterwards.

Two deliberate differences from the GeTui implementation:

- **Both platform blocks are always sent** and the `platform` argument is
  ignored. FCM applies whichever suits the token, which beats trusting the
  platform string stored beside the registration — those rows have been wrong
  before, which is why the app re-registers when it finds a null one.
- **No badge increment.** GeTui had `auto_badge: "+1"`; FCM has no
  auto-increment and wants an absolute number, which the sender cannot know.
  `clearBadge()` clears the tray on Capacitor but does not reset the iOS badge
  count — the push plugin has no badge API. Both need a plugin and a counter if
  the badge matters.

A dead token (app uninstalled, token rotated) comes back as
`MessagingErrorCode.Unregistered`. That is caught and returned as a string
rather than thrown, so one stale row cannot fail a batch; the reason lands in
`NotificationMessage.Result`.

`PushMessageToApp()` — GeTui's broadcast — throws `NotSupportedException`. It
has no live caller, and FCM has no equivalent that does not need devices
subscribed to a topic first. Shipping an untested broadcast would be worse than
saying so.

`FirebaseAdmin` needs `Newtonsoft.Json` ≥ 13.0.4; the solution pinned 13.0.1, so
all three projects that reference it were bumped. Same 13.0.x line.

### What Firebase needs from you

Four things, none of which can come from the repo:

1. **A Firebase project**, with an Android app registered under the package name
   `com.vegetable.mob` (confirm this against the Play listing first — see above).
2. **`google-services.json`** from that project, dropped at
   `apps/mobile/android/app/`. Capacitor's Gradle template already applies the
   google-services plugin when it finds the file and skips it when it does not,
   so nothing else changes. This file is not a secret — it ships inside the APK.
3. **A service account key** with the Firebase Messaging role, for the API. Set
   `FcmPushOptions:ServiceAccountJsonPath` to wherever it lands. **This one is a
   real credential** — it can send push as us — and it is gitignored.
4. **APNs**: for iOS, the auth key uploaded into the Firebase project, plus
   `GoogleService-Info.plist` in the Xcode project. Not startable from Windows.

Until (1) and (2) exist, `registrationError` fires, the app logs it and carries
on unregistered. Until (3) exists, leave `PushProvider` on `"GeTui"`.

## Still to do

- The four Firebase artefacts above, then flip `PushProvider` to `"Fcm"` once
  the Capacitor build is the one people are running.
- Confirm the Play `applicationId` and get the release keystore.
- Launcher icons and the splash image are Capacitor's placeholders, as is the
  notification silhouette in `res/drawable/ic_stat_notify.xml`.
- The iOS badge count is not maintained; see the push section.
- Deep-link schemes are not configured. The old manifest declared `hbuilder`
  (Android) and `vegetable` (iOS); `launchArguments()` has no readers today, so
  nothing is broken, but anything relying on those schemes needs setting up.
- Barlow and Barlow Condensed still load from Google Fonts over the network, on
  both packaging routes. A packaged app that starts offline falls back to
  system type. Vendoring the woff2 files would fix it for both.
- iOS: `npx cap add ios` on a Mac, then the same checks.
- A device run. The debug APK builds, but nothing has been installed on
  hardware — the nvue-to-vue flex conversion still needs that pass, and so does
  every native call in plugins/native.js.
