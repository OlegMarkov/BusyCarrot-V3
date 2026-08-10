<template>
  <div class="login">
    <!--
      The design shares the sign-in screen across form factors: the same 375px
      column, centred on the page ground, with the hero photograph above it. It
      always drew phone fields here — the Auth0 widget was what did not fit. Now
      that admin authenticates the same way the mobile app does, the screen is
      the one the design asked for.
    -->
    <div class="login__col">
      <div class="blueprint duotone login__hero">
        <i class="corner tl" /><i class="corner tr" /><i class="corner bl" /><i class="corner br" />
      </div>

      <div class="login__masthead">
        <div class="login__kicker">{{ t('login.kicker') }}</div>
        <div class="login__wordmark">
          <span class="login__busy">BUSY</span><span class="login__carrot">CARROT</span>
        </div>
        <p class="login__tagline">{{ t('login.tagline') }}</p>
      </div>

      <form class="login__form" @submit.prevent="submit">
        <!-- step one: the number, and the image captcha that gates the call -->
        <template v-if="!codeSent">
          <label class="login__label" for="login-phone">{{ t('login.phone') }}</label>
          <input
            id="login-phone"
            v-model="phoneInput"
            class="input"
            type="tel"
            autocomplete="tel"
            :placeholder="t('login.phonePlaceholder')"
          />
          <p v-if="phoneInput && !phoneValid" class="login__hint login__hint--bad">
            {{ t('login.phoneInvalid') }}
          </p>

          <label class="login__label" for="login-captcha">{{ t('login.captcha') }}</label>
          <div class="login__captcha">
            <img
              v-if="captchaImage"
              :src="captchaImage"
              class="login__captcha-img"
              :alt="t('login.captcha')"
            />
            <div v-else class="login__captcha-img login__captcha-img--empty" />
            <button
              type="button"
              class="btn btn-secondary login__refresh"
              :disabled="loading"
              @click="loadCaptcha"
            >
              {{ t('login.refresh') }}
            </button>
          </div>
          <input
            id="login-captcha"
            v-model="captchaInput"
            class="input"
            autocomplete="off"
            :placeholder="t('login.captchaPlaceholder')"
          />
        </template>

        <!-- step two: the four digits from the incoming call -->
        <template v-else>
          <div class="login__sent">
            {{ t('login.calling') }} <strong>+{{ phoneDigits }}</strong>
          </div>

          <label class="login__label" for="login-code">{{ t('login.code') }}</label>
          <input
            id="login-code"
            v-model="codeInput"
            class="input"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            :placeholder="t('login.codePlaceholder')"
          />

          <p class="login__hint">
            <template v-if="secondsBeforeResend > 0">
              {{ t('login.resendIn', [secondsBeforeResend]) }}
            </template>
            <button v-else type="button" class="login__link" @click="restart">
              {{ t('login.resend') }}
            </button>
          </p>

          <button type="button" class="login__link" @click="restart">
            {{ t('login.changeNumber') }}
          </button>
        </template>

        <p v-if="error" class="login__hint login__hint--bad">{{ error }}</p>

        <button class="btn btn-primary btn-block login__submit" :disabled="!canSubmit">
          {{ loading ? t('login.working') : codeSent ? t('login.verify') : t('login.sendCode') }}
        </button>
      </form>

      <div class="login__foot">
        <div class="seg login__seg">
          <label
            v-for="option in locales"
            :key="option"
            class="seg-opt login__seg-opt"
            :class="{ 'seg-opt--active': option === locale }"
            @click="setLocale(option)"
          >
            {{ option.toUpperCase() }}
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
 * Phone-and-code sign-in, replacing Auth0 Lock.
 *
 * The flow mirrors apps/mobile/src/pages/login/loginint.vue, because that is the
 * one that has been exercised against Vegetable.API in production:
 *
 *   1. GET  users/GetCaptcha/{key}          — an image captcha, keyed by a
 *                                             client-generated session key
 *   2. GET  users/SendVerificationCall/{phone}?key=&captcha=
 *                                           — validates the captcha, then places
 *                                             a call to the number
 *   3. POST users/authenticate              — { code, timeZone, country, user }
 *                                             returns the User and the token
 *
 * It is a *call*, not an SMS: GreenSms rings the number and the code is the last
 * four digits of the calling number (CallPasswordService.SendCallVerification).
 * The copy says so rather than asking the user to watch for a text.
 *
 * Dropped with Auth0, and not replaced: the `?companyid=` invite link, which
 * signed a new user up against an existing owner. It worked by writing
 * `company_id` into Auth0 user metadata through `users/updatemetadata`, and that
 * endpoint has never functioned — UserRepo.UpdateMetadata interpolates the
 * *unawaited task* from GetToken() into its Authorization header, so every call
 * has been rejected by Auth0. There is no equivalent on the phone path:
 * `users/authenticate` either finds a user by number or creates a whole new
 * owner. Adding staff to an existing owner needs `POST owner/user`, from inside
 * an authenticated session — a separate job, flagged rather than half-built.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import { apiClient } from '@/plugins/api'
import { useSessionStore } from '@/stores/session'
import { useOwnerStore } from '@/stores/owner'

/** Both from the mobile login, so the two clients agree on the wait. */
const CODE_LIFETIME = 120
const RESEND_AFTER = 60

const { t, locale, availableLocales } = useI18n()
const router = useRouter()
const session = useSessionStore()
const owner = useOwnerStore()

const locales = computed(() => availableLocales)

const phoneInput = ref('')
const captchaInput = ref('')
const codeInput = ref('')
const captchaImage = ref('')
const codeSent = ref(false)
const loading = ref(false)
const error = ref('')
const timer = ref(0)

let ticker = null

/**
 * The captcha is keyed by a string the client invents and then sends back with
 * the code request, so the server can match the answer to the image it drew.
 * One per page load is enough; refreshing the image reuses it.
 */
const sessionKey = ref('')

const parsed = computed(() =>
  phoneInput.value ? parsePhoneNumberFromString(phoneInput.value, 'RU') : null
)

const phoneValid = computed(() => Boolean(parsed.value?.isValid()))

/** What the API is given: calling code and national number, digits only. */
const phoneDigits = computed(() =>
  parsed.value ? `${parsed.value.countryCallingCode}${parsed.value.nationalNumber}` : ''
)

const secondsBeforeResend = computed(() => timer.value - (CODE_LIFETIME - RESEND_AFTER))

const canSubmit = computed(() => {
  if (loading.value) return false
  return codeSent.value ? codeInput.value.length >= 4 : phoneValid.value && Boolean(captchaInput.value)
})

function setLocale(next) {
  locale.value = next
}

function tick() {
  clearTimeout(ticker)
  if (timer.value <= 0) return
  ticker = setTimeout(() => {
    timer.value -= 1
    tick()
  }, 1000)
}

/**
 * The endpoint returns raw base64 with no data: prefix and no content type, so
 * the MIME has to come from the bytes. It is a GIF today — CDB.Captcha's
 * `GetEnDigitalCodeByte`, via Services/Captcha.cs — and declaring it as PNG
 * makes some browsers refuse to decode it, so this reads the magic instead of
 * assuming. Four characters, compared case-insensitively server-side.
 */
function dataUri(base64) {
  if (!base64) return ''
  const type = base64.startsWith('R0lGOD')
    ? 'gif'
    : base64.startsWith('iVBOR')
      ? 'png'
      : base64.startsWith('/9j/')
        ? 'jpeg'
        : 'gif'
  return `data:image/${type};base64,${base64}`
}

async function loadCaptcha() {
  captchaInput.value = ''
  try {
    const { data } = await apiClient.UsersService.getcaptcha(sessionKey.value)
    captchaImage.value = dataUri(data)
  } catch {
    captchaImage.value = ''
    error.value = t('login.captchaFailed')
  }
}

async function sendCode() {
  error.value = ''
  loading.value = true
  try {
    const response = await apiClient.UsersService.sendverificationcall(
      encodeURIComponent(phoneDigits.value),
      sessionKey.value,
      captchaInput.value
    )
    if (response?.status !== 200) throw new Error('rejected')
    codeSent.value = true
    codeInput.value = ''
    timer.value = CODE_LIFETIME
    tick()
  } catch {
    // A wrong captcha and an undeliverable number both come back 400, and the
    // body does not say which. The image is redrawn either way, because the
    // server has consumed the old one.
    error.value = t('login.sendFailed')
    await loadCaptcha()
  } finally {
    loading.value = false
  }
}

async function verify() {
  error.value = ''
  loading.value = true
  try {
    const { data } = await apiClient.UsersService.authenticate({
      code: codeInput.value,
      // Stored on a newly created owner and used server-side to resolve its
      // working hours, so it has to be an IANA name, not an offset. Admin has
      // no moment-timezone; Intl gives the same answer as `moment.tz.guess()`.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      country: parsed.value?.country ?? null,
      user: {
        allowNotifications: true,
        // A column on the User table, not a live integration — the mobile app
        // sends it empty too. Left in so the posted record matches the entity.
        auth0UserId: '',
        phoneNumber: phoneDigits.value,
        name: '',
        email: '',
        language: locale.value,
        // Admin is a browser, so it registers no device for push. The mobile
        // app fills this in with its FCM token.
        userData: []
      }
    })

    // A wrong code is not an error status: Authenticate returns null when the
    // cached code does not match, which arrives as an empty body.
    if (!data?.token) {
      error.value = t('login.codeWrong')
      return
    }

    session.signIn({ token: data.token, user: data.user, phoneNumber: phoneDigits.value })
    await owner.fetchAllOwnerData()
    router.push('/')
  } catch {
    error.value = t('login.codeWrong')
  } finally {
    loading.value = false
  }
}

function submit() {
  if (!canSubmit.value) return
  return codeSent.value ? verify() : sendCode()
}

/** Back to the number step, with a fresh captcha — the old one is spent. */
function restart() {
  codeSent.value = false
  codeInput.value = ''
  timer.value = 0
  clearTimeout(ticker)
  error.value = ''
  loadCaptcha()
}

onMounted(() => {
  sessionKey.value = `admin-${Math.random().toString(36).slice(2)}-${Date.now()}`
  loadCaptcha()
})

onUnmounted(() => clearTimeout(ticker))
</script>

<style scoped>
.login {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  background: var(--color-bg);
  color: var(--color-text);
}

/* The design's column, at its own width whatever the window is doing. */
.login__col {
  width: 375px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 20px 40px;
  box-sizing: border-box;
}

.login__hero {
  height: 184px;
  margin: 18px 6px 0;
  background-image: url('@/assets/background3.jpg');
  background-size: cover;
  background-position: center;
}

.login__masthead {
  margin-top: 34px;
}

.login__kicker {
  font: 400 10px/1 var(--font-body);
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.login__wordmark {
  margin-top: 9px;
  font: 600 44px/0.95 var(--font-heading);
  letter-spacing: 0.01em;
}

.login__busy {
  color: var(--color-text);
}

.login__carrot {
  color: var(--color-accent);
}

.login__tagline {
  margin: 8px 0 0;
  max-width: 290px;
  font: 400 13px/1.5 var(--font-body);
  color: var(--color-neutral-700);
}

.login__form {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
}

.login__label {
  margin-bottom: 8px;
  font: 400 10px/1 var(--font-body);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.login__label:not(:first-child) {
  margin-top: 18px;
}

.login__captcha {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.login__captcha-img {
  height: 40px;
  width: 120px;
  object-fit: contain;
  background: var(--color-surface);
  border: 1px solid var(--color-divider);
}

.login__captcha-img--empty {
  display: block;
}

.login__refresh {
  min-height: 40px;
  padding: 0 12px;
  font: 600 11px var(--font-heading);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.login__sent {
  font: 400 13px/1.5 var(--font-body);
  color: var(--color-neutral-700);
  margin-bottom: 18px;
}

.login__hint {
  margin: 10px 0 0;
  font: 400 12px/1.4 var(--font-body);
  color: var(--color-neutral-600);
}

.login__hint--bad {
  color: #b4453c;
}

.login__link {
  align-self: flex-start;
  margin-top: 10px;
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
  font: 400 12px var(--font-body);
  color: var(--color-accent);
  text-decoration: underline;
}

.login__submit {
  margin-top: 22px;
  min-height: 48px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 12px;
}

.login__foot {
  margin-top: 22px;
}

.login__seg {
  align-self: flex-start;
  display: inline-flex;
}

.login__seg-opt {
  min-height: 36px;
  padding: 0 16px;
  font: 600 11px var(--font-heading);
  letter-spacing: 0.1em;
}
</style>
