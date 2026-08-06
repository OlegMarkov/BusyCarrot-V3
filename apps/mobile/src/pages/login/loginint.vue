<template>
  <view class="nv login-view">
    <view class="form flex-column">
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

      <!-- Step 2: the code has been sent, enter it -->
      <form v-if="isCodeSent" key="code" class="form">
        <view class="form-item">
          <text class="input-label">{{ $t('login.enterCode') }} {{ phoneNumber }}</text>
          <input v-model="code" class="input-text" type="number" @confirm="login" />
        </view>
        <view class="form-item">
          <button class="action-button" :disabled="code.length === 0" @click.stop="login">
            {{ $t('common.send') }}
          </button>
        </view>

        <view v-if="showResendMessage">
          <text>{{ $t('login.resendRemainText') }} {{ secondsBeforeResend }}</text>
        </view>
        <view v-else class="form-item">
          <view class="captcha-container">
            <view
              v-if="captchaBase64"
              class="captcha-image"
              :style="`background-image: url(data:image/gif;base64,${captchaBase64});`"
              @click="refreshCaptcha"
            />
            <view class="form-item" style="flex: 1; margin-left: 20rpx">
              <text class="input-label">{{ $t('login.captchaText') }}</text>
              <input
                v-model="captcha"
                :focus="isCaptchaFocused"
                :class="[captchaError ? 'captcha-input-error' : '', 'captcha-input']"
                maxlength="8"
                @confirm="getCode"
                @input="captchaError = false"
              />
            </view>
          </view>
          <button class="action-button" :disabled="!captcha" @click.stop="getCode">
            {{ $t('login.resendText') }}
          </button>
          <button class="action-button" @click="resetTimer">
            {{ $t('login.changePhoneNumber') }}
          </button>
        </view>
      </form>

      <!-- Step 1: enter the phone number -->
      <form v-else key="number" class="form">
        <view class="form-item">
          <text class="input-label">{{ $t('login.enterNumber') }}</text>
          <input-phone-number
            v-model="phoneNumber"
            class="cube-phone-number-input-inline"
            :placeholder="$t('customer.phone')"
            @update="onNumberInput"
            @confirm="captcha ? getCode() : (isCaptchaFocused = true)"
          />
        </view>

        <view class="captcha-container">
          <view
            v-if="captchaBase64"
            class="captcha-image"
            :style="`background-image: url(data:image/gif;base64,${captchaBase64});`"
            @click="refreshCaptcha"
          />
          <view class="form-item" style="flex: 1; margin-left: 20rpx">
            <text class="input-label">{{ $t('login.captchaText') }}</text>
            <input
              v-model="captcha"
              :focus="isCaptchaFocused"
              :class="[captchaError ? 'captcha-input-error' : '', 'captcha-input']"
              maxlength="8"
              @confirm="getCode"
              @input="captchaError = false"
            />
          </view>
        </view>

        <button
          class="action-button"
          :disabled="!isNumberValid || !isPrivacyAccepted || sending || !captcha"
          @click.stop="getCode"
        >
          {{ $t('common.send') }}
        </button>
      </form>

      <view v-if="!isCodeSent" class="form-item">
        <label>
          <view
            class="consent-box"
            :class="{ 'consent-box--on': isPrivacyAccepted }"
            @click="isPrivacyAccepted = !isPrivacyAccepted"
          >
            <uni-icons v-if="isPrivacyAccepted" type="checkmarkempty" :size="12" color="#f2f2f3" />
          </view>
          <text class="form-list-title" @click="isPrivacyAccepted = !isPrivacyAccepted">
            {{ $t('general-settings.privacy') }}
          </text>
          <text class="privacy-link" @click.stop="openPrivacy">
            {{ $t('general-settings.privacy-link') }}
          </text>
        </label>
      </view>
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
import { getPushClientId, openUrl, platform, isIOS } from '@/plugins/native'

const CODE_LIFETIME = 120
const RESEND_AFTER = 60

/**
 * Ported from vegetable.mobile.vue/pages/login/loginint.vue.
 *
 * Flow, unchanged: enter a phone number and a captcha → the API places a
 * verification call → enter the spoken code → `users/authenticate` returns a
 * token and a user record → relaunch into the dashboard. A countdown held in the
 * user store gates resending.
 *
 * Changes:
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
 *  - `<div>`/`<a>` → `<view>`/`<text>`; the `<style src>` block carries only the
 *    imported stylesheet, since an `src` attribute makes Vue ignore the block's
 *    own content and the rules written inline there were therefore dead. The
 *    ones that were actually doing something are re-declared in the scoped block.
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

    login() {
      const user = useUserStore()
      const cid = getPushClientId()

      user.setTimer(0)
      useLogStore().postLog({ level: 'info', text: `push client id: ${cid}` })

      const userDb = {
        allowNotifications: true,
        auth0UserId: '',
        phoneNumber: this.phoneNumber,
        name: '',
        email: '',
        language: this.language || uni.getSystemInfoSync().language.substring(0, 2),
        userData: [{ cid, platform: platform() }]
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
/* The page's submit buttons are the system's one solid object. */
.action-button {
  min-height: 50px;
  background-color: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 0;
  color: var(--color-bg);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: 22px;
}

/*
 * uni-app ships `uni-button[disabled]:not([type])` at specificity (0,2,1),
 * which outranks a plain scoped class — so the disabled state has to restate
 * the fill, or the button reverts to the platform's grey slab the moment the
 * form is incomplete.
 */
.action-button[disabled] {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-bg);
  opacity: 0.45;
}

.privacy-link {
  color: var(--color-accent);
  text-decoration: underline;
  font-family: var(--font-body);
  font-size: 12.5px;
}

.login-view {
  margin-top: 0;
  background-color: var(--color-bg);
}

.login-hero {
  background-image: url('@/static/background3.jpg');
  background-size: cover;
  background-position: center;
  height: 210px;
  margin: 16px 6px 0;
  flex-direction: column;
}

.login-masthead {
  margin-top: 30px;
  margin-bottom: 6px;
}

.login-masthead__kicker {
  font-family: var(--font-body);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.login-masthead__tagline {
  font-family: var(--font-body);
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-neutral-700);
  margin-top: 8px;
}

/* The consent mark: a filled accent square with a tick, matching the
   segmented control rather than the platform checkbox. */
.consent-box {
  width: 18px;
  height: 18px;
  border: 1px solid var(--color-divider);
  align-items: center;
  justify-content: center;
  margin-right: 9px;
}

.consent-box--on {
  border-color: var(--color-accent);
  background-color: var(--color-accent);
}

.login-wordmark {
  flex-direction: row;
  justify-content: flex-start;
  margin-top: 9px;
}

.login-wordmark__busy {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 44px;
  line-height: 0.95;
  letter-spacing: 0.01em;
  color: var(--color-text);
}

.login-wordmark__carrot {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 44px;
  line-height: 0.95;
  letter-spacing: 0.01em;
  color: var(--color-accent);
}

.privacy-link {
  color: $uni-color-primary;
  text-decoration: underline;
}
</style>
