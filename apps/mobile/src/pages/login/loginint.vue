<template>
  <view class="nv login-view">
    <view class="login-body flex-column">
      <!--
        The photograph is a framed blueprint object washed into the accent —
        the system's one image treatment. On webviews without mix-blend-mode
        the overlay is simply skipped and the photo shows through untinted.
      -->
      <view class="blueprint duotone login-hero">
        <text class="corner tl" />
        <text class="corner tr" />
        <text class="corner bl" />
        <text class="corner br" />
      </view>

      <view class="login-masthead">
        <text class="login-masthead__kicker">{{ $t('login.tagline-kicker') }}</text>
        <view class="login-wordmark">
          <text class="login-wordmark__busy">BUSY</text><text
            class="login-wordmark__carrot"
            >CARROT</text
          >
        </view>
        <text class="login-masthead__tagline">{{ $t('login.tagline') }}</text>
      </view>

      <!-- Step 2: the call has been placed, enter the digits -->
      <form v-if="isCodeSent" key="code" class="login-form">
        <view class="login-field">
          <text class="login-label">{{ $t('login.enterCode') }}</text>
          <text class="login-number">{{ displayNumber }}</text>
        </view>

        <input
          v-model="code"
          class="login-code"
          type="number"
          maxlength="4"
          placeholder="0000"
          @confirm="login"
        />

        <button
          class="login-submit"
          :disabled="code.length === 0"
          @click.stop="login"
        >
          {{ $t('login.verify') }}
        </button>

        <!--
          Resending needs a fresh captcha — the API rejects a bare resend — so
          the security field comes back with the resend action rather than the
          action standing alone.
        -->
        <view v-if="!showResendMessage" class="login-field login-field--resend">
          <text class="login-label">{{ $t('login.captcha-label') }}</text>
          <view class="login-captcha-row">
            <view
              v-if="captchaBase64"
              class="login-captcha"
              :style="`background-image: url(data:image/gif;base64,${captchaBase64});`"
              @click="refreshCaptcha"
            />
            <input
              v-model="captcha"
              :focus="isCaptchaFocused"
              class="login-input"
              :class="{ 'login-input--error': captchaError }"
              maxlength="8"
              :placeholder="$t('login.captcha-placeholder')"
              @confirm="getCode"
              @input="captchaError = false"
            />
          </view>
        </view>

        <view class="login-foot">
          <text v-if="showResendMessage" class="login-foot__note">
            {{ $t('login.resendRemainText', [secondsBeforeResend]) }}
          </text>
          <text
            v-else
            class="login-foot__action"
            :class="{ 'login-foot__action--off': !captcha }"
            @click="captcha && getCode()"
          >
            {{ $t('login.resendText') }}
          </text>

          <text class="login-foot__action" @click="resetTimer">
            {{ $t('login.changePhoneNumber') }}
          </text>
        </view>
      </form>

      <!-- Step 1: enter the phone number -->
      <form v-else key="number" class="login-form">
        <view class="login-field">
          <text class="login-label">{{ $t('login.phone-label') }}</text>
          <input-phone-number
            v-model="phoneNumber"
            :placeholder="$t('login.phone-placeholder')"
            @update="onNumberInput"
            @confirm="captcha ? getCode() : (isCaptchaFocused = true)"
          />
        </view>

        <view class="login-field">
          <text class="login-label">{{ $t('login.captcha-label') }}</text>
          <view class="login-captcha-row">
            <view
              v-if="captchaBase64"
              class="login-captcha"
              :style="`background-image: url(data:image/gif;base64,${captchaBase64});`"
              @click="refreshCaptcha"
            />
            <input
              v-model="captcha"
              :focus="isCaptchaFocused"
              class="login-input"
              :class="{ 'login-input--error': captchaError }"
              maxlength="8"
              :placeholder="$t('login.captcha-placeholder')"
              @confirm="getCode"
              @input="captchaError = false"
            />
          </view>
        </view>

        <view class="login-consent">
          <view
            class="consent-box"
            :class="{ 'consent-box--on': isPrivacyAccepted }"
            @click="isPrivacyAccepted = !isPrivacyAccepted"
          >
            <uni-icons v-if="isPrivacyAccepted" type="checkmarkempty" :size="11" color="#f2f2f3" />
          </view>
          <text class="login-consent__text" @click="isPrivacyAccepted = !isPrivacyAccepted">
            {{ $t('general-settings.privacy') }}
          </text>
          <text class="login-consent__link" @click.stop="openPrivacy">
            {{ $t('general-settings.privacy-link') }}
          </text>
        </view>

        <button
          class="login-submit"
          :disabled="!isNumberValid || !isPrivacyAccepted || sending || !captcha"
          @click.stop="getCode"
        >
          {{ $t('login.send-code') }}
        </button>
      </form>
    </view>

    <uni-popup ref="popup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ $t('general-settings.privacy-getui') }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="acceptPushConsent">
            {{ $t('common.agree') }}
          </text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import tz from 'moment-timezone'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import InputPhoneNumber from '@/components/app/cube-phone-number-input/InputPhoneNumber.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import Constants from '@/config'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useLogStore } from '@/stores/log'
import { whenPushClientId, openUrl, platform, isIOS } from '@/plugins/native'

const CODE_LIFETIME = 120
const RESEND_AFTER = 60

/**
 * Ported from vegetable.mobile.vue/pages/login/loginint.vue, then redrawn on
 * Industry per the "BusyCarrot mobile redesign" handoff (designs/, turn 2).
 *
 * Flow, unchanged: enter a phone number and a captcha → the API places a
 * verification call → enter the last four digits of the calling number →
 * `users/authenticate` returns a token and a user record → relaunch into the
 * dashboard. A countdown held in the user store gates resending.
 *
 * What the redesign changed is presentation only — the two steps, the store
 * calls, the captcha round-trip and the countdown arithmetic are as they were.
 * Three places where the design and this app's reality differ, resolved toward
 * the app:
 *
 *  - The prototype's captcha is four glyphs it draws and checks itself. Ours is
 *    a base64 GIF the API issues and the API verifies, so the 104 x 44 plate
 *    carries that image (tap to reroll) rather than drawn characters.
 *  - The prototype says "code sent to <number>", an SMS model. This product
 *    places a *call*; the code is the last four digits of the calling number,
 *    which is what the label says.
 *  - The prototype's resend is unconditional. Ours needs a fresh captcha, so
 *    the security field reappears alongside the resend action.
 *
 * Earlier port notes that still apply:
 *  - vuex dispatch/commit → Pinia store methods (`SET_TIMER` → `user.setTimer`)
 *  - `getApp().globalData.$t` → `$t`
 *  - `plus.runtime.*` / `plus.push.getClientInfo` → plugins/native.js
 *  - the Auth0 deep-link parsing in `onLoad` is gone: it read
 *    `plus.runtime.arguments` for an OAuth `code` and then only set `isLoading`,
 *    a data field this page never rendered. Dead with the rest of the Auth0
 *    flow — see the note in plugins/request.js.
 *  - FLAGGED (signed off): `isGetuiAccepted` no longer gates the submit button. It could only
 *    ever be set to true (by the consent popup on Android, immediately on iOS),
 *    because the checkbox that would let a user decline it was commented out —
 *    so dismissing the popup left the form permanently unsubmittable. The popup
 *    still shows and still records consent; it just cannot deadlock login now.
 */
export default {
  components: { uniPopup, InputPhoneNumber, uniIcons },
  data() {
    return {
      phoneNumber: '',
      code: '',
      isNumberValid: false,
      isPrivacyAccepted: true,
      isPushConsentAccepted: false,
      ticker: null,
      privacyUrl: Constants.getValue('ApiBaseUrl') + 'publicowner/privacypolicy',
      sending: false,
      captcha: '',
      isCaptchaFocused: false,
      captchaError: false,
      country: null
    }
  },
  computed: {
    ...mapState(useUserStore, ['timer', 'captchaBase64']),
    ...mapState(useSettingsStore, ['language']),
    isCodeSent() {
      return this.timer > 0
    },
    showResendMessage() {
      return this.timer > CODE_LIFETIME - RESEND_AFTER
    },
    secondsBeforeResend() {
      return this.timer - (CODE_LIFETIME - RESEND_AFTER)
    },
    /**
     * `phoneNumber` is the digits the API is given — calling code and national
     * number concatenated, no punctuation. The code step echoes it back so the
     * number being called is visible while the call comes in.
     */
    displayNumber() {
      return this.phoneNumber ? `+${this.phoneNumber}` : ''
    }
  },
  watch: {
    timer(value) {
      if (value <= 0) return
      clearTimeout(this.ticker)
      this.ticker = setTimeout(() => {
        useUserStore().setTimer(this.timer - 1)
      }, 1000)
    }
  },
  onLoad() {
    this.refreshCaptcha()
  },
  onReady() {
    if (isIOS()) {
      this.acceptPushConsent()
    } else if (!this.isPushConsentAccepted) {
      this.$refs.popup.open()
    }
  },
  onUnload() {
    clearTimeout(this.ticker)
  },
  methods: {
    onNumberInput(details) {
      if (!details) return
      this.isNumberValid = details.valid
      if (this.isNumberValid) {
        this.phoneNumber = details.countryCallingCode + details.nationalNumber
        this.country = details.country
      }
    },

    getCode() {
      if (!this.isNumberValid) return

      const user = useUserStore()
      this.sending = true
      this.code = ''
      user.setTimer(0)
      user.clearSession()

      user
        .sendCallCode({
          phoneNumber: encodeURIComponent(this.phoneNumber),
          captcha: this.captcha
        })
        .then((result) => {
          if (result && result.status === 200) {
            user.setTimer(CODE_LIFETIME)
          } else {
            this.captchaError = true
          }
        })
        .catch(() => {
          this.captchaError = true
        })
        .finally(() => {
          this.refreshCaptcha()
          this.sending = false
        })
    },

    openPrivacy() {
      openUrl(this.privacyUrl)
    },

    resetTimer() {
      useUserStore().setTimer(0)
      this.refreshCaptcha()
    },

    acceptPushConsent() {
      this.isPushConsentAccepted = true
      this.$refs.popup.close()
    },

    refreshCaptcha() {
      useUserStore().getCaptcha()
      this.captcha = ''
    },

    async login() {
      const user = useUserStore()

      // Awaited: on Capacitor this is an FCM token that arrives after a round
      // trip to Google, and the user can finish typing a four-digit code first.
      const cid = await whenPushClientId()

      user.setTimer(0)
      useLogStore().postLog({ level: 'info', text: `push client id: ${cid}` })

      const userDb = {
        allowNotifications: true,
        auth0UserId: '',
        phoneNumber: this.phoneNumber,
        name: '',
        email: '',
        language: this.language || uni.getSystemInfoSync().language.substring(0, 2),
        // Only claim a registration when there is actually one to claim.
        // Posting `{ cid: null }` persisted an empty row that nothing could
        // ever match or clean up; the dashboard registers this device on its
        // next load anyway, once the token exists.
        userData: cid ? [{ cid, platform: platform() }] : []
      }

      user
        .authenticate({
          code: this.code,
          timeZone: tz.tz.guess(),
          country: this.country,
          user: userDb
        })
        .then((result) => {
          if (!result) return
          // `authenticate` already stored the token; this mirrors the original's
          // explicit re-set plus recording which number this device logged in as.
          user.setAccessToken(result.token)
          user.setUserLocal(this.phoneNumber)
          uni.reLaunch({ url: '/pages/index/index' })
        })
    }
  }
}
</script>

<style lang="scss" src="@/components/app/cube-phone-number-input/scss/cube-phone-number-input-inline.scss"></style>

<style lang="scss" scoped>
.login-view {
  margin-top: 0;
  background-color: var(--color-bg);
}

.login-body {
  padding-bottom: 28px;
}

/* — hero — */

.login-hero {
  background-image: url('@/static/background3.jpg');
  background-size: cover;
  background-position: center;
  height: 184px;
  margin: 18px 6px 0;
  flex-direction: column;
}

/* — masthead — */

.login-masthead {
  margin-top: 34px;
  padding: 0 20px;
}

.login-masthead__kicker {
  font-family: var(--font-body);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.login-wordmark {
  flex-direction: row;
  justify-content: flex-start;
  margin-top: 9px;
}

.login-wordmark__busy,
.login-wordmark__carrot {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 44px;
  line-height: 0.95;
  letter-spacing: 0.01em;
}

.login-wordmark__busy {
  color: var(--color-text);
}

.login-wordmark__carrot {
  color: var(--color-accent);
}

.login-masthead__tagline {
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-neutral-700);
  margin-top: 8px;
  max-width: 290px;
}

/* — form —
   The design sets the form's rhythm at a 20px gap between fields; uni-app's
   flex gap support is uneven across webviews, so it is a margin on the field. */

.login-form {
  padding: 26px 20px 0;
}

.login-field {
  margin-bottom: 20px;
}

/*
 * The system's small form label. Deliberately local rather than the shared
 * `.field-label` in industry.scss: the design specifies 9.5px / .18em here,
 * and the shared class (10px / .14em) is worn by screens this pass has not
 * re-checked. Worth folding together once the rest of the redesign lands.
 */
.login-label {
  font-family: var(--font-body);
  font-size: 9.5px;
  line-height: 1;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin-bottom: 7px;
}

.login-input {
  min-height: 44px;
  padding: 6px 10px;
  font-family: var(--font-body);
  font-size: 14px;
  letter-spacing: 0.04em;
  color: var(--color-text);
  background-color: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 0;
  box-sizing: border-box;
  flex: 1;
}

.login-input--error {
  border-color: var(--color-danger);
}

/* — the captcha plate —
   104 x 44 in the design. Ours carries the GIF the API issues rather than
   drawn glyphs; tapping it asks for a new one. */

.login-captcha-row {
  flex-direction: row;
  align-items: stretch;
}

.login-captcha {
  width: 104px;
  height: 44px;
  flex-shrink: 0;
  margin-right: 8px;
  border: 1px solid var(--color-divider);
  border-radius: 0;
  background-color: var(--color-neutral-100);
  background-size: cover;
  background-position: center;
  box-sizing: border-box;
}

/* — consent — */

.login-consent {
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 22px;
}

/* A filled accent square with a tick, matching the segmented control rather
   than the platform checkbox. */
.consent-box {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border: 1px solid var(--color-divider);
  align-items: center;
  justify-content: center;
  margin-right: 9px;
}

.consent-box--on {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
}

.login-consent__text {
  font-family: var(--font-body);
  font-size: 12.5px;
  line-height: 1.3;
  color: var(--color-text);
}

.login-consent__link {
  font-family: var(--font-body);
  font-size: 12.5px;
  line-height: 1.3;
  color: var(--color-accent-700);
  text-decoration: underline;
  margin-left: 4px;
}

/* — the code step — */

.login-number {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 16px;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: var(--color-text);
}

/*
 * The four digits, set large and widely tracked. `letter-spacing` puts its
 * space after the last glyph too, which throws a centred string off by half a
 * step — the matching `text-indent` pushes it back.
 */
.login-code {
  height: 66px;
  text-align: center;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 34px;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  color: var(--color-text);
  background-color: var(--color-surface);
  border: 1px solid var(--color-divider);
  border-radius: 0;
  box-sizing: border-box;
}

.login-field--resend {
  margin-top: 20px;
  margin-bottom: 0;
}

/* The row under the button: countdown or resend on the left, change-number on
   the right, over a hairline. */
.login-foot {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--color-rule);
}

.login-foot__note {
  font-family: var(--font-body);
  font-size: 12.5px;
  color: var(--color-neutral-600);
}

.login-foot__action {
  font-family: var(--font-body);
  font-size: 12.5px;
  color: var(--color-accent-700);
  text-decoration: underline;
}

.login-foot__action--off {
  color: var(--color-neutral-500);
  opacity: 0.6;
}

/* — the submit — the system's one solid object — */

.login-submit {
  min-height: 48px;
  background-color: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 0;
  color: var(--color-bg);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 4px;
}

/*
 * uni-app ships `uni-button[disabled]:not([type])` at specificity (0,2,1),
 * which outranks a plain scoped class — so the disabled state has to restate
 * the fill, or the button reverts to the platform's grey slab the moment the
 * form is incomplete.
 */
.login-submit[disabled] {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg);
  opacity: 0.45;
}
</style>
