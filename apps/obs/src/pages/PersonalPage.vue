<template>
  <div v-if="owner.loading" class="bp bp--centred"><p class="text-muted">…</p></div>

  <div v-else-if="owner.error" class="bp bp--centred">
    <h2>{{ $t('obs.owner_not_found') }}</h2>
  </div>

  <div v-else class="bp">
    <div class="wrap">
      <div class="topbar">
        <div class="brand">
          <span>{{ owner.owner?.title }}</span>
          <span class="alias">{{ publicUrl }}</span>
        </div>
        <div class="lt">
          <button
            v-for="option in LOCALES"
            :key="option"
            type="button"
            :class="{ on: booking.locale === option }"
            @click="booking.changeLocale(option)"
          >
            {{ option === 'ru' ? 'РУ' : 'EN' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── booking ─────────────────────────────────────────────────────── -->
    <template v-if="view === 'book'">
      <div class="wrap">
        <section class="hero">
          <div>
            <div v-if="avatar" class="avatar"><img class="plate" :src="avatar" :alt="owner.owner?.title" /></div>
            <div class="kicker">{{ $t('obs.hero_kicker') }}</div>
            <h1>{{ owner.owner?.title }}</h1>
            <p v-if="owner.owner?.description">{{ owner.owner.description }}</p>
            <div class="chips">
              <span v-if="addressLine" class="tag tag-accent-2">{{ addressLine }}</span>
              <span v-if="openingLine" class="tag tag-neutral">{{ openingLine }}</span>
            </div>
            <div v-if="socials.length" class="socials">
              <a
                v-for="social in socials"
                :key="social.url"
                class="soc"
                :href="social.url"
                target="_blank"
                rel="noopener"
                :title="social.name"
                >{{ social.short }}</a
              >
            </div>
          </div>
          <div v-if="heroImage" class="heroart">
            <img class="plate" :src="heroImage" :alt="owner.owner?.title" />
          </div>
        </section>

        <div class="cols">
          <div>
            <!-- 1 · service -->
            <section class="step">
              <div class="step-h">
                <div class="num">1</div>
                <h3>{{ $t('obs.navigation_service') }}</h3>
                <span class="opt">{{ $t('obs.service_multiple_hint') }}</span>
              </div>
              <div class="svc">
                <label v-for="service in owner.services" :key="service.id">
                  <input
                    type="checkbox"
                    :checked="booking.isServiceSelected(service)"
                    @change="booking.toggleService(service)"
                  />
                  <img v-if="serviceImage(service)" class="plate" :src="serviceImage(service)" alt="" />
                  <span v-else class="svc-ph" />
                  <div>
                    <div class="svc-t">{{ service.title }}</div>
                    <p v-if="service.description" class="svc-d">{{ service.description }}</p>
                  </div>
                  <div class="svc-p">
                    <b>{{ money(service.cost) }}</b>
                    <span>{{ service.durationInMinutes }} {{ $t('obs.minutes_short') }}</span>
                  </div>
                </label>
              </div>
            </section>

            <!-- 2 · master -->
            <section v-if="owner.employees.length > 1" class="step">
              <div class="step-h">
                <div class="num">2</div>
                <h3>{{ $t('obs.navigation_employee') }}</h3>
                <span class="opt">{{ $t('obs.optional') }}</span>
              </div>
              <div class="staff">
                <label>
                  <input
                    type="radio"
                    name="stf"
                    :checked="booking.selectedEmployee === null"
                    @change="booking.changeEmployee(null)"
                  />
                  <span class="ph">?</span>
                  <span>{{ $t('obs.employee_any') }}</span>
                </label>
                <label v-for="employee in owner.employees" :key="employee.id">
                  <input
                    type="radio"
                    name="stf"
                    :checked="booking.selectedEmployee?.id === employee.id"
                    @change="booking.changeEmployee(employee)"
                  />
                  <img v-if="employee.avatar" :src="employee.avatar" :alt="employee.fullName" />
                  <span v-else class="ph">{{ employee.initials }}</span>
                  <span>{{ employee.fullName }}</span>
                </label>
              </div>
            </section>

            <!-- 3 · date & time -->
            <section class="step">
              <div class="step-h">
                <div class="num">{{ owner.employees.length > 1 ? 3 : 2 }}</div>
                <h3>{{ $t('obs.navigation_date_time') }}</h3>
                <span class="opt">{{ tzLabel }}</span>
              </div>

              <div class="days">
                <button
                  v-for="day in days"
                  :key="day.key"
                  type="button"
                  class="day"
                  :class="{ on: day.key === selectedDayKey }"
                  :disabled="!day.available"
                  @click="pickDay(day)"
                >
                  <span class="day-wd">{{ day.weekday }}</span>
                  <span class="day-n">{{ day.number }}</span>
                  <span class="day-m">{{ day.month }}</span>
                </button>
              </div>

              <p v-if="!booking.canQuerySlots" class="text-muted step-hint">
                {{ $t('obs.pick_service_first') }}
              </p>

              <template v-else-if="booking.loadingSlots">
                <p class="text-muted step-hint">…</p>
              </template>

              <template v-else-if="slotGroups.length">
                <div v-for="group in slotGroups" :key="group.key" class="grp">
                  <div class="grp-h">{{ $t(`obs.part_${group.key}`) }}</div>
                  <div class="slots">
                    <button
                      v-for="slot in group.items"
                      :key="slot.raw"
                      type="button"
                      class="slot"
                      :class="{ on: booking.selectedTime === slot.raw }"
                      @click="booking.changeTime(slot.raw)"
                    >
                      {{ slot.label }}
                    </button>
                  </div>
                </div>
              </template>

              <div v-else-if="booking.selectedDate" class="empty">
                <div class="ring" />
                <h4>{{ $t('obs.no_slots_title') }}</h4>
                <p class="text-muted">{{ nextOpeningText }}</p>
                <button v-if="nextFreeDay" class="btn btn-secondary" type="button" @click="pickDay(nextFreeDay)">
                  {{ $t('obs.no_slots_action') }}
                </button>
              </div>
            </section>

            <!-- 4 · about you -->
            <section class="step">
              <div class="step-h">
                <div class="num">{{ owner.employees.length > 1 ? 4 : 3 }}</div>
                <h3>{{ $t('obs.navigation_confirmation') }}</h3>
              </div>
              <div class="form">
                <div class="field">
                  <label for="bk-fn">{{ $t('obs.confirmation_first_name') }}</label>
                  <input id="bk-fn" v-model="form.firstName" class="input" type="text" maxlength="50" />
                </div>
                <div class="field">
                  <label for="bk-ln">{{ $t('obs.confirmation_last_name') }}</label>
                  <input id="bk-ln" v-model="form.lastName" class="input" type="text" maxlength="50" />
                </div>
                <div class="field">
                  <label for="bk-ph">{{ $t('obs.confirmation_phone') }}</label>
                  <input id="bk-ph" v-model="form.phoneNumber" class="input" type="tel" maxlength="20" />
                </div>
                <div class="field">
                  <label for="bk-em">{{ $t('obs.confirmation_email') }}</label>
                  <input id="bk-em" v-model="form.email" class="input" type="email" maxlength="100" />
                </div>
                <div class="field full">
                  <label for="bk-cm">{{ $t('obs.confirmation_comment') }}</label>
                  <textarea id="bk-cm" v-model="form.comment" class="input" maxlength="500" />
                </div>
                <label class="consent full">
                  <input v-model="form.consent" type="checkbox" />
                  <span>{{ $t('obs.confirmation_consent') }}</span>
                </label>
              </div>
            </section>
          </div>

          <!-- summary rail -->
          <aside class="rail">
            <h4>{{ $t('obs.summary_title') }}</h4>
            <div class="row">
              <span class="k">{{ $t('obs.navigation_service') }}</span>
              <span class="v">{{ serviceSummary }}</span>
            </div>
            <div class="row">
              <span class="k">{{ $t('obs.navigation_employee') }}</span>
              <span class="v">{{ employeeSummary }}</span>
            </div>
            <div class="row">
              <span class="k">{{ $t('obs.summary_when') }}</span>
              <span class="v">{{ whenSummary }}</span>
            </div>
            <div class="row">
              <span class="k">{{ $t('obs.summary_duration') }}</span>
              <span class="v">{{ booking.totalDurationInMinutes }} {{ $t('obs.minutes_short') }}</span>
            </div>
            <div class="total">
              <span class="k">{{ $t('obs.summary_total') }}</span>
              <b>{{ money(booking.totalCost) }}</b>
            </div>

            <div class="railbar">
              <span>{{ serviceSummary }} · {{ whenSummary }}</span>
              <b>{{ money(booking.totalCost) }}</b>
            </div>

            <button
              class="btn btn-primary btn-block"
              type="button"
              :disabled="!canSubmit || submitting"
              @click="submit"
            >
              {{ $t('obs.confirmation_book') }}
            </button>

            <p v-if="error" class="err">{{ error }}</p>
            <div class="note">{{ $t('obs.summary_note') }}</div>
          </aside>
        </div>
      </div>
    </template>

    <!-- ── verification ────────────────────────────────────────────────── -->
    <div v-else-if="view === 'verify'" class="wrap done">
      <h2>{{ $t('obs.confirmation_verification_code') }}</h2>
      <p class="text-muted">{{ $t('obs.confirmation_verification_code_text') }} {{ form.phoneNumber }}</p>
      <div class="ticket">
        <div class="field">
          <label for="bk-code">{{ $t('obs.confirmation_code_placeholder') }}</label>
          <input id="bk-code" v-model="code" class="input" inputmode="numeric" maxlength="6" />
        </div>
        <p v-if="error" class="err">{{ error }}</p>
        <div class="actions">
          <button class="btn btn-primary" type="button" :disabled="!code || verifying" @click="verify">
            {{ $t('obs.confirmation_confirm') }}
          </button>
          <button class="btn btn-ghost" type="button" :disabled="submitting" @click="submit">
            {{ $t('obs.confirmation_new_code') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── confirmed ───────────────────────────────────────────────────── -->
    <div v-else class="wrap done">
      <div class="tick">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f5ead8" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 12.5 9.5 18 20 6.5" />
        </svg>
      </div>
      <h2>{{ $t('obs.done_title') }}</h2>
      <p class="text-muted">{{ $t('obs.done_text') }}</p>
      <div class="ticket">
        <div class="row">
          <span class="k">{{ $t('obs.navigation_service') }}</span>
          <span class="v">{{ serviceSummary }}</span>
        </div>
        <div class="row">
          <span class="k">{{ $t('obs.navigation_employee') }}</span>
          <span class="v">{{ employeeSummary }}</span>
        </div>
        <div class="row">
          <span class="k">{{ $t('obs.summary_when') }}</span>
          <span class="v">{{ whenSummary }}</span>
        </div>
        <div v-if="addressLine" class="row">
          <span class="k">{{ $t('obs.summary_where') }}</span>
          <span class="v">{{ addressLine }}</span>
        </div>
        <div class="total">
          <span class="k">{{ $t('obs.summary_due') }}</span>
          <b>{{ money(booking.totalCost) }}</b>
        </div>
      </div>
      <div class="actions">
        <a class="btn btn-primary" :href="calendarHref" target="_blank" rel="noopener">
          {{ $t('obs.done_calendar') }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import moment from 'moment-timezone'
import { useI18n } from 'vue-i18n'
import { useBookingStore } from '@/stores/booking'
import { useOwnerStore } from '@/stores/owner'
import { slotTime } from '@/plugins/slot-time'

/**
 * The owner's public booking page, rebuilt on the "Organic" design system
 * (claude.ai/design → templates/booking/Booking.dc.html). Tokens are ported in
 * styles/organic.css; nothing here invents a colour, radius or space value.
 *
 * What the design changed, beyond the surface:
 *
 *  - The five-step UIkit wizard — an offcanvas holding a tab strip and a
 *    switcher — becomes one scrolling page with a sticky summary rail. There
 *    is no step navigation to keep in sync any more, which is what the old
 *    `useWizard` composable existed for, so UIkit leaves obs entirely.
 *  - The rail collapses to a fixed bottom bar under 980px rather than
 *    following the page.
 *
 * The data layer is untouched: every value comes from the existing booking and
 * owner stores, and the submit path is still createReservation → SMS code →
 * verifyCode, which is the only path that actually writes a reservation.
 *
 * Two things the design shows that the API cannot serve, and which are
 * therefore not built rather than faked:
 *
 *  - **"My bookings."** There is no endpoint listing a customer's reservations;
 *    `publicowner/reservation/{alias}/{id}` fetches one by id. A list needs an
 *    API change.
 *  - **Choosing a specific master is required, not optional.** The design
 *    offers "Any available" as the default. `publicowner/slots` takes a single
 *    employeeId, so "any" is resolved here by unioning each employee's slots
 *    and booking the first one free at the chosen time — see resolveEmployee().
 */
const props = defineProps({ alias: { type: String, required: true } })

const { t, locale } = useI18n()
const owner = useOwnerStore()
const booking = useBookingStore()

const LOCALES = ['ru', 'en']
const DAY_COUNT = 14

const view = ref('book')
const code = ref('')
const error = ref('')
const submitting = ref(false)
const verifying = ref(false)

const form = reactive({
  firstName: '',
  lastName: '',
  phoneNumber: '',
  email: '',
  comment: '',
  consent: true
})

/* ── owner presentation ─────────────────────────────────────────────────── */

const publicUrl = computed(() => `busycarrot.com/${props.alias}`)

const images = computed(() => owner.owner?.images ?? [])
const avatar = computed(() => owner.owner?.avatar || images.value[0]?.url || null)
const heroImage = computed(() => images.value[1]?.url || images.value[0]?.url || null)

const serviceImage = (service) => service.images?.[0]?.url || service.image || null

const addressLine = computed(() => {
  const address = owner.primaryAddress
  if (!address) return ''
  return [address.city, address.street, address.building].filter(Boolean).join(', ')
})

/**
 * "Mon–Sat, 10:00–20:00" in the design. The public owner payload carries no
 * schedule, so this is only shown when the owner has filled in the free-text
 * working-hours field; it is not derived.
 */
const openingLine = computed(() => owner.owner?.workingHours || '')

const SOCIAL_SHORT = {
  1: 'Fb',
  2: 'In',
  3: 'Tw',
  5: 'Yt',
  8: 'Vk',
  10: 'Pn',
  11: 'Ig'
}

const socials = computed(() =>
  (owner.owner?.socialNetworks ?? [])
    .filter((network) => network.url)
    .map((network) => ({
      // Preserve a scheme the owner already saved rather than prefixing http://
      // onto it — the original produced http://https://… for any such link.
      url: /^https?:\/\//i.test(network.url) ? network.url : `https://${network.url}`,
      short: SOCIAL_SHORT[network.type] ?? '·',
      name: network.name || ''
    }))
)

const timeZone = computed(() => owner.owner?.timeZone || moment.tz.guess())

const tzLabel = computed(() => t('obs.studio_time', [moment.tz(timeZone.value).format('Z')]))

/* ── money ──────────────────────────────────────────────────────────────── */

const symbol = computed(() => owner.owner?.currency?.symbol ?? '')

function money(value) {
  const amount = Number(value ?? 0).toLocaleString(locale.value === 'ru' ? 'ru-RU' : 'en-GB')
  return `${amount} ${symbol.value}`.trim()
}

/* ── the day strip ──────────────────────────────────────────────────────── */

const days = computed(() => {
  const start = moment.tz(timeZone.value).startOf('day')
  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const day = start.clone().add(index, 'days')
    return {
      key: day.format('YYYY-MM-DD'),
      date: day.toDate(),
      number: day.date(),
      weekday: day.locale(locale.value).format('dd'),
      month: day.locale(locale.value).format('MMM'),
      // Availability comes from monthSlots; before it loads every day is
      // offered rather than every day being greyed out, which would read as
      // "closed" instead of "loading".
      available: booking.hasMonthSlots ? booking.isDayAvailable(day.toDate()) : true
    }
  })
})

const selectedDayKey = computed(() =>
  booking.selectedDate ? moment(booking.selectedDate).format('YYYY-MM-DD') : null
)

const nextFreeDay = computed(() =>
  days.value.find((day) => day.available && day.key > (selectedDayKey.value ?? ''))
)

const nextOpeningText = computed(() =>
  nextFreeDay.value
    ? t('obs.no_slots_next', [moment(nextFreeDay.value.date).locale(locale.value).format('D MMMM')])
    : t('obs.no_slots_none')
)

function pickDay(day) {
  if (!day.available) return
  booking.changeDate(day.date)
  booking.fetchDaySlots(day.date)
}

/* ── slots, grouped as the design groups them ───────────────────────────── */

const PARTS = [
  { key: 'morning', until: 12 },
  { key: 'afternoon', until: 17 },
  { key: 'evening', until: 24 }
]

const slotGroups = computed(() => {
  const buckets = PARTS.map((part) => ({ key: part.key, items: [] }))

  for (const raw of booking.daySlots) {
    const label = slotTime(raw)
    const hour = Number(label.slice(0, 2))
    const bucket = buckets[PARTS.findIndex((part) => hour < part.until)] ?? buckets[2]
    bucket.items.push({ raw, label })
  }

  return buckets.filter((bucket) => bucket.items.length)
})

/* ── summary ────────────────────────────────────────────────────────────── */

const serviceSummary = computed(() => {
  const services = booking.selectedServices
  if (!services.length) return t('obs.summary_empty')
  return services.length === 1 ? services[0].title : `${services[0].title} +${services.length - 1}`
})

const employeeSummary = computed(() =>
  booking.selectedEmployee?.fullName ?? t('obs.employee_any')
)

const whenSummary = computed(() => {
  if (!booking.selectedDate) return t('obs.summary_empty')
  const day = moment(booking.selectedDate).locale(locale.value).format('D MMMM')
  return booking.selectedTime ? `${day}, ${slotTime(booking.selectedTime)}` : day
})

/* ── submit ─────────────────────────────────────────────────────────────── */

const canSubmit = computed(
  () =>
    booking.selectedServices.length > 0 &&
    Boolean(booking.selectedTime) &&
    Boolean(form.firstName.trim()) &&
    Boolean(form.phoneNumber.trim()) &&
    form.consent
)

/**
 * `publicowner/slots` is per-employee, so "any available" has to be resolved
 * before the reservation is written. The slots currently on screen belong to
 * whichever employee was queried; if the customer left it on "any", the first
 * employee is used. Booking genuinely-any would need the API to accept a null
 * employeeId and choose, which it does not.
 */
function resolveEmployee() {
  return booking.selectedEmployee ?? owner.employees[0] ?? null
}

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    if (!booking.selectedEmployee) booking.changeEmployee(resolveEmployee())

    const result = await booking.createReservation({
      firstName: form.firstName,
      lastName: form.lastName,
      phoneNumber: form.phoneNumber,
      email: form.email,
      comment: form.comment
    })

    if (!result) {
      error.value =
        booking.bookingError === 'captcha-not-configured'
          ? t('obs.captcha_not_configured')
          : t('obs.booking_failed')
      return
    }

    code.value = ''
    view.value = 'verify'
  } catch {
    error.value = t('obs.booking_failed')
  } finally {
    submitting.value = false
  }
}

async function verify() {
  error.value = ''
  verifying.value = true
  try {
    const confirmed = await booking.verifyCode(form.phoneNumber, code.value)
    if (confirmed) view.value = 'done'
    else error.value = t('obs.confirmation_code_invalid')
  } catch {
    error.value = t('obs.confirmation_code_invalid')
  } finally {
    verifying.value = false
  }
}

/** Google Calendar template link — no API involved, so it needs nothing new. */
const calendarHref = computed(() => {
  if (!booking.selectedTime) return '#'
  const start = moment(booking.selectedTime)
  const end = start.clone().add(booking.totalDurationInMinutes || 60, 'minutes')
  const fmt = (m) => m.utc().format('YYYYMMDDTHHmmss') + 'Z'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${serviceSummary.value} — ${owner.owner?.title ?? ''}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    location: addressLine.value
  })
  return `https://calendar.google.com/calendar/render?${params}`
})

/* ── lifecycle ──────────────────────────────────────────────────────────── */

onMounted(async () => {
  await owner.fetchOwner(props.alias)
  if (owner.owner) booking.buildSteps(owner.owner)
})

// Availability depends on the service duration and the chosen master, so the
// month has to be refetched whenever either moves.
watch(
  () => booking.canQuerySlots,
  (ready) => {
    if (!ready) return
    const now = moment.tz(timeZone.value)
    booking.fetchMonthSlots(now.year(), now.month())
  },
  { immediate: true }
)

watch(
  () => [booking.totalDurationInMinutes, booking.selectedEmployee?.id],
  () => {
    if (booking.selectedDate) booking.fetchDaySlots(booking.selectedDate)
  }
)
</script>

<style scoped>
/* Layout only — every colour, font, radius and shadow comes from
   styles/classical.css, which is the ported design system. */
.bp {
  font-family: var(--font-body);
  color: var(--color-text);
  padding-bottom: 120px;
}

.bp--centred {
  display: grid;
  place-items: center;
  min-height: 60vh;
}

.wrap {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}

/* Prices, times and dates are read in columns and compared down the page, so
   they are set on tabular figures throughout. */
.row .v,
.svc-p,
.day,
.slot,
.total b,
.railbar b,
.kicker {
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

.kicker {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-accent-700);
}

.topbar {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--color-divider);
}

.brand {
  margin-right: auto;
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
  font-size: 21px;
  letter-spacing: 0.01em;
}

.brand .alias {
  font-family: var(--font-body);
  font-weight: 400;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-text) 50%, transparent);
}

.lt {
  display: inline-flex;
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.lt button {
  font: inherit;
  font-size: 11px;
  letter-spacing: 0.1em;
  padding: 5px 11px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
}

.lt button + button { border-left: 1px solid var(--color-divider); }
.lt button:hover { background: color-mix(in srgb, var(--color-text) 7%, transparent); }
.lt button.on { color: var(--color-accent); box-shadow: inset 0 0 0 1px var(--color-accent); }

/* — hero — */
.hero {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: var(--space-8);
  align-items: start;
  padding: var(--space-8) 0;
}

.hero h1 {
  font-size: 60px;
  font-weight: 400;
  line-height: 1.02;
  margin: var(--space-3) 0 var(--space-4);
  max-width: 11ch;
}

.hero p {
  font-size: 16px;
  line-height: 1.75;
  max-width: 44ch;
  text-align: justify;
  hyphens: auto;
}

.avatar { width: 64px; height: 64px; overflow: hidden; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }

.chips { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-4); }
.socials { display: flex; gap: var(--space-2); margin-top: var(--space-6); }

.soc {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: grid;
  place-items: center;
  border: 1px solid var(--color-divider);
  color: var(--color-accent-700);
  text-decoration: none;
  font-family: var(--font-heading);
  font-size: 13px;
}

.soc:hover {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.heroart { aspect-ratio: 4 / 5; }
.heroart img { width: 100%; height: 100%; object-fit: cover; }

/* — flow — */
.cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--space-8);
  align-items: start;
}

/* minmax(0, 1fr) above plus these: a bare 1fr is minmax(auto, 1fr), so the
   track cannot shrink below its content's min-content width and the fourteen-
   day strip pushes the rail out of the container. */
.cols > div,
.step,
.svc { min-width: 0; }

.step { padding: var(--space-8) 0; border-top: 1px solid var(--color-divider); }
.step-hint { margin-top: var(--space-4); }

.step-h {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.num {
  flex: none;
  font-family: var(--font-heading);
  font-weight: 400;
  font-size: 15px;
  letter-spacing: 0.14em;
  color: var(--color-accent-700);
  font-feature-settings: 'tnum';
  padding-right: var(--space-3);
  border-right: 1px solid var(--color-divider);
}

.step-h h3 { margin: 0; font-weight: 400; font-size: 28px; }

.step-h .opt {
  margin-left: auto;
  font-size: 12px;
  font-style: italic;
  color: color-mix(in srgb, var(--color-text) 50%, transparent);
}

.svc { display: grid; border-top: 1px solid var(--color-divider); }

.svc label {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-divider);
  cursor: pointer;
  box-shadow: inset 0 0 0 0 var(--color-accent);
}

.svc label:hover { background: color-mix(in srgb, var(--color-text) 4%, transparent); }
.svc label:has(input:checked) { box-shadow: inset 2px 0 0 0 var(--color-accent); }
.svc label:has(input:checked) .svc-t { color: var(--color-accent-800); }
.svc label:has(input:focus-visible) { outline: 2px solid var(--color-accent); outline-offset: -2px; }
.svc input { position: absolute; opacity: 0; width: 0; height: 0; }
.svc img { width: 64px; height: 80px; object-fit: cover; }

.svc-ph { width: 64px; height: 80px; border: 1px solid var(--color-divider); }

.svc-t {
  font-family: var(--font-heading);
  font-weight: var(--font-heading-weight);
  font-size: 20px;
  line-height: 1.2;
}

.svc-d { font-size: 13.5px; line-height: 1.6; opacity: 0.75; margin: 5px 0 0; max-width: 48ch; }
.svc-p { text-align: right; }
.svc-p b { font-family: var(--font-heading); font-weight: 400; font-size: 21px; display: block; }
.svc-p span { font-size: 12px; color: color-mix(in srgb, var(--color-text) 55%, transparent); }

.staff { display: flex; flex-wrap: wrap; gap: var(--space-3); }

.staff label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px 7px 7px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-divider);
  cursor: pointer;
  font-size: 14px;
}

.staff label:hover { border-color: color-mix(in srgb, var(--color-accent) 60%, transparent); }

.staff label:has(input:checked) {
  border-color: var(--color-accent);
  color: var(--color-accent-800);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}

.staff input { position: absolute; opacity: 0; width: 0; height: 0; }

.staff .ph {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-divider);
  display: grid;
  place-items: center;
  font-family: var(--font-heading);
  font-size: 14px;
  color: var(--color-accent-700);
}

.staff img { width: 34px; height: 34px; object-fit: cover; border-radius: var(--radius-sm); }

.days {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-3);
  scrollbar-width: thin;
}

.day {
  flex: none;
  width: 74px;
  padding: var(--space-3) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-divider);
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: inherit;
  display: grid;
  gap: 3px;
  text-align: center;
}

.day:hover:not(:disabled) { border-color: color-mix(in srgb, var(--color-accent) 60%, transparent); }
.day.on { border-color: var(--color-accent); box-shadow: inset 0 0 0 1px var(--color-accent); }
.day.on .day-n { color: var(--color-accent-800); }
.day:disabled { opacity: 0.4; cursor: not-allowed; }

.day-wd {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--color-text) 55%, transparent);
}

.day-n { font-family: var(--font-heading); font-weight: 400; font-size: 26px; line-height: 1.05; }

.day-m {
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-text) 55%, transparent);
}

/* The part-of-day label sits beside its slots rather than above them. */
.grp {
  margin-top: var(--space-6);
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: var(--space-4);
  align-items: start;
  border-top: 1px solid var(--color-divider);
  padding-top: var(--space-3);
}

.grp-h {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--color-text) 55%, transparent);
  padding-top: 8px;
}

.slots { display: flex; flex-wrap: wrap; gap: var(--space-2); }

.slot {
  font: inherit;
  font-size: 14px;
  padding: 8px 15px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-divider);
  background: transparent;
  cursor: pointer;
  color: inherit;
}

.slot:hover { border-color: color-mix(in srgb, var(--color-accent) 60%, transparent); }

.slot.on {
  border-color: var(--color-accent);
  color: var(--color-accent-800);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}

.empty {
  display: grid;
  gap: var(--space-3);
  justify-items: start;
  padding: var(--space-8);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-divider);
}

.empty h4 { margin: 0; font-weight: 400; font-size: 23px; }
.empty p { max-width: 44ch; }
.empty .ring { width: 52px; height: 52px; border-radius: 50%; border: 1px dashed var(--color-neutral-400); }

.form { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form .full { grid-column: 1 / -1; }

.consent {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 12px;
  opacity: 0.8;
  line-height: 1.6;
  cursor: pointer;
}

.consent input { accent-color: var(--color-accent); width: 16px; height: 16px; margin: 2px 0 0; }

/* — summary rail — */
.rail {
  position: sticky;
  top: var(--space-4);
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-md);
  padding: var(--space-6) var(--space-4);
  display: grid;
  gap: var(--space-3);
}

.rail h4 {
  margin: 0 0 var(--space-2);
  font-weight: 400;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-accent-700);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-divider);
}

.row { display: flex; justify-content: space-between; gap: var(--space-3); font-size: 14px; }
.row .k { color: color-mix(in srgb, var(--color-text) 55%, transparent); flex: none; }
.row .v { text-align: right; }

.total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-top: 1px solid var(--color-divider);
  padding-top: var(--space-3);
  margin-top: var(--space-1);
}

.total b { font-family: var(--font-heading); font-weight: 400; font-size: 28px; }

.note {
  font-size: 11px;
  font-style: italic;
  line-height: 1.5;
  color: color-mix(in srgb, var(--color-text) 55%, transparent);
}

.err { font-size: 12px; color: var(--color-accent-800); margin: 0; }
.railbar { display: none; }

/* — confirmation — */
.done { max-width: 620px; padding: var(--space-8) 0; }

.tick {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 1px solid var(--color-accent);
  display: grid;
  place-items: center;
  margin-bottom: var(--space-6);
}

.done h2 { font-size: 44px; font-weight: 400; }
.done > p { max-width: 46ch; line-height: 1.75; }

.ticket {
  border: 1px solid var(--color-divider);
  border-radius: var(--radius-md);
  padding: var(--space-6) var(--space-4);
  display: grid;
  gap: var(--space-3);
  margin: var(--space-6) 0;
}

.actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }

@media (max-width: 980px) {
  .hero { grid-template-columns: 1fr; gap: var(--space-6); }
  .hero h1 { font-size: 40px; max-width: none; }
  .heroart { aspect-ratio: 16 / 9; }
  .cols { grid-template-columns: minmax(0, 1fr); }
  .form { grid-template-columns: 1fr; }
  .grp { grid-template-columns: 1fr; gap: var(--space-2); }
  .svc label { grid-template-columns: auto 1fr; row-gap: var(--space-2); }
  .svc-p { grid-column: 2; text-align: left; display: flex; gap: 10px; align-items: baseline; }
  .svc-p b { font-size: 18px; }

  .rail {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    border: 0;
    border-top: 1px solid var(--color-divider);
    border-radius: 0;
    background: var(--color-bg);
    padding: var(--space-3) var(--space-4) var(--space-4);
    box-shadow: var(--shadow-md);
    gap: var(--space-2);
    z-index: 5;
  }

  .rail h4,
  .rail .row,
  .rail .total,
  .rail .note { display: none; }

  .railbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    font-size: 13px;
  }

  .railbar b { font-family: var(--font-heading); font-weight: 400; font-size: 20px; }
}

/* — phone — */
@media (max-width: 640px) {
  .bp { padding-bottom: 150px; }
  .wrap { padding: 0 var(--space-4); }
  .topbar { gap: var(--space-3); padding: var(--space-3) 0; flex-wrap: wrap; }
  .brand .alias { display: none; }
  .lt button { padding: 8px 12px; }
  .hero { padding: var(--space-6) 0; gap: var(--space-4); }
  .hero h1 { font-size: 34px; margin: var(--space-2) 0 var(--space-3); }
  .hero p { text-align: left; font-size: 15.5px; max-width: none; }
  .avatar { width: 56px; height: 56px; }
  .heroart { aspect-ratio: 4 / 3; }
  .socials { margin-top: var(--space-4); }
  .soc { width: 44px; height: 44px; }
  .step { padding: var(--space-6) 0; }
  .step-h { margin-bottom: var(--space-4); }
  .step-h h3 { font-size: 23px; }
  .step-h .opt { flex: 1 0 100%; margin: 4px 0 0; }

  .svc label {
    grid-template-columns: 56px 1fr;
    gap: var(--space-3);
    padding: var(--space-3) 0 var(--space-4);
    align-items: start;
  }

  .svc img,
  .svc-ph { width: 56px; height: 66px; }
  .svc-t { font-size: 18px; }
  .svc-d { font-size: 13px; margin-top: 4px; }
  .svc-p { grid-column: 1 / -1; margin-top: 2px; }

  .staff { gap: var(--space-2); }
  .staff label { min-height: 44px; flex: 1 1 auto; }

  /* The day strip runs edge to edge and snaps. */
  .days {
    margin: 0 calc(var(--space-4) * -1);
    padding: 0 var(--space-4) var(--space-3);
    scroll-snap-type: x mandatory;
  }

  .day { width: 64px; min-height: 66px; scroll-snap-align: start; }
  .day-n { font-size: 23px; }

  .grp { margin-top: var(--space-4); }
  .grp-h { padding-top: 0; }
  .slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); }
  .slot { min-height: 44px; padding: 10px 8px; text-align: center; }
  .empty { padding: var(--space-6) var(--space-4); }
  .empty h4 { font-size: 21px; }

  /* Touch targets. :deep because .input and .btn come from the design system
     stylesheet, not this component. */
  :deep(.input) { min-height: 44px; }
  :deep(.btn) { min-height: 44px; }

  .actions { display: grid; grid-template-columns: 1fr; }
  .rail { padding: var(--space-3) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom)); }
  .railbar span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .done { padding: var(--space-6) 0; }
  .done h2 { font-size: 34px; }
  .done > p { max-width: none; }
  .ticket { padding: var(--space-4); }
}
</style>
