<template>
  <li>
    <div>
      <h3 class="uk-text-center">{{ $t('obs.confirmation_title') }}</h3>

      <div class="uk-grid-small" uk-grid>
        <div v-for="field in fields" :key="field" class="uk-width-1-2@s">
          <input
            v-model="form[field]"
            class="uk-input"
            :class="{ 'obs-form-error': errorFor(field) }"
            type="text"
            :name="field"
            :placeholder="$t(`obs.confirmation_${placeholders[field]}`)"
            @blur="touch(field)"
          />
          <span v-show="errorFor(field)" class="uk-text-danger obs-error-text">
            {{ errorFor(field) }}
          </span>
        </div>

        <div class="uk-flex uk-flex-center uk-width-1-1">
          <button
            class="uk-button uk-button-primary"
            :disabled="booking"
            @click.stop.prevent="book"
          >
            {{ $t('obs.confirmation_book') }}
          </button>
        </div>

        <div v-if="bookingError" class="uk-width-1-1">
          <div class="uk-alert-danger uk-text-center" uk-alert>{{ bookingError }}</div>
        </div>
      </div>

      <!-- The reservation is held server-side against a command key until the
           code is verified; nothing is written before that. -->
      <div id="modal-verification" class="obs-modal" uk-modal="stack: true; bg-close: false">
        <div class="obs-modal-dialog uk-modal-dialog">
          <button class="uk-modal-close-default" type="button" uk-close></button>
          <div class="uk-modal-body">
            <div class="uk-text-center uk-margin-medium-bottom">
              <div class="obs-modal-title">{{ $t('obs.confirmation_phone_confirmation') }}</div>

              <div v-if="telegramUrl" class="obs-modal-description">
                {{ $t('obs.confirmation_telegram_text') }}
                <p>
                  <a class="uk-button uk-button-primary" :href="telegramUrl" target="_blank"
                    rel="noopener">{{ $t('obs.confirmation_telegram_open') }}</a>
                </p>
              </div>
              <div v-else class="obs-modal-description">
                {{ $t('obs.confirmation_verification_code_text') }} {{ form.phoneNumber }}
                <a class="uk-modal-close">{{ $t('obs.confirmation_change_phone') }}</a>
              </div>
            </div>

            <div class="uk-grid-small uk-child-width-expand@s" uk-grid>
              <div>
                <input
                  v-model="code"
                  class="uk-input"
                  type="text"
                  :placeholder="$t('obs.confirmation_code_placeholder')"
                />
                <span v-show="invalidCode" class="uk-text-danger obs-error-text">
                  {{ $t('obs.confirmation_code_invalid') }}
                </span>
              </div>
              <div>
                <button
                  class="uk-button uk-button-primary uk-width-1-1 uk-margin-small-bottom"
                  :disabled="verifying || !code"
                  @click="verifyCode"
                >
                  {{ $t('obs.confirmation_confirmation') }}
                </button>
              </div>
            </div>
          </div>

          <div class="uk-modal-footer">
            <span v-if="!canResend" class="obs-modal-description">
              {{ $t('obs.confirmation_resend_text', { seconds: countdown }) }}
            </span>
            <p v-else class="uk-text-left">
              <button class="uk-button uk-button-text" type="button" @click="resend">
                {{ $t('obs.confirmation_new_code') }}
              </button>
            </p>
          </div>
        </div>
      </div>

      <div id="modal-confirmation" class="obs-modal" uk-modal="stack: true; bg-close: false">
        <div class="obs-modal-dialog uk-modal-dialog uk-modal-body">
          <div class="uk-text-center uk-margin-medium-bottom">
            <div class="obs-modal-title">{{ $t('obs.booking_confirmation_title') }}</div>
            <div class="obs-modal-description">
              {{ $t('obs.booking_confirmation_text', { name: form.firstName, email: form.email }) }}
            </div>
          </div>

          <div class="obs-modal-description">
            <span class="uk-margin-small-right" uk-icon="icon: check; ratio: 0.8"></span>
            <span>{{ serviceSummary }}</span>
            <br />
            <span class="uk-margin-small-right" uk-icon="icon: user; ratio: 0.8"></span>
            <span v-if="bookingStore.selectedEmployee">{{
              bookingStore.selectedEmployee.firstName
            }}</span>
            <br />
            <span class="uk-margin-small-right" uk-icon="icon: clock; ratio: 0.8"></span>
            <span>{{ bookingStore.selectedDateTime }}</span>
            <br />
            <span class="uk-margin-small-right" uk-icon="icon: location; ratio: 0.8"></span>
            <span v-if="bookingStore.selectedAddress">{{ addressSummary }}</span>

            <p class="uk-text-right">
              <button class="uk-button uk-button-text" type="button" @click="restart">
                {{ $t('obs.booking_confirmation_exit') }}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

<script>
/*
 * Ported from vegetable.web/src/Frontend/ui/src/components/confirmation.vue,
 * with the booking call it never had.
 *
 * What the original did: POST no reservation. `book()` sent an email code via
 * `owner/sendverification/{email}`, `verifyCode()` checked it against
 * `owner/verifycode/{email}/{code}`, and on success it showed the "your booking
 * has been completed" modal and committed the customer's first name to the
 * store. No reservation endpoint was ever called, so nothing was booked.
 * Both of those `owner/*` routes are also on the [AuthorizeOwner] controller,
 * so anonymously they answer 401 — the success path could not run either.
 *
 * What happens now (Vegetable.API PublicOwnerController):
 *   1. PUT publicowner/reservation/{alias} holds the reservation against a
 *      command key and sends a code to the customer's *phone*, via Telegram.
 *   2. GET publicowner/verifycode/{phone} checks the code and is what actually
 *      writes the reservation.
 * A customer the bot does not know yet gets a `tlgUrl` to subscribe first.
 *
 * The four validators were 200 lines of copy-pasted array splicing, one block
 * per field with the same error-add/error-remove logic inlined each time. They
 * are a validator map here; the messages and the on-blur/on-input behaviour are
 * unchanged.
 */
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useOwnerStore } from '@/stores/owner'
import { useWizard } from '@/composables/wizard'

const EMAIL_PATTERN =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const PHONE_PATTERN = /^[0-9]+$/

const RESEND_SECONDS = 60

export default {
  name: 'ObsConfirmation',
  props: { index: { type: Number, default: 0 } },

  setup() {
    return { wizard: useWizard() }
  },

  data() {
    return {
      fields: ['firstName', 'lastName', 'email', 'phoneNumber'],
      placeholders: {
        firstName: 'first_name',
        lastName: 'last_name',
        email: 'email',
        phoneNumber: 'phone'
      },
      form: { firstName: '', lastName: '', email: '', phoneNumber: '' },
      touched: {},
      submitted: false,
      booking: false,
      verifying: false,
      code: '',
      invalidCode: false,
      telegramUrl: null,
      countdown: RESEND_SECONDS,
      canResend: false,
      timer: null
    }
  },

  computed: {
    ...mapStores(useBookingStore, useOwnerStore),

    validators() {
      return {
        firstName: (value) =>
          value ? null : this.$t('obs.confirmation_first_name_required'),
        lastName: (value) => (value ? null : this.$t('obs.confirmation_last_name_required')),
        email: (value) => {
          if (!value) return this.$t('obs.confirmation_email_required')
          return EMAIL_PATTERN.test(value) ? null : this.$t('obs.confirmation_email_invalid')
        },
        phoneNumber: (value) => {
          if (!value) return this.$t('obs.confirmation_phone_required')
          return PHONE_PATTERN.test(value) ? null : this.$t('obs.confirmation_phone_invalid')
        }
      }
    },

    errors() {
      return this.fields.reduce((errors, field) => {
        errors[field] = this.validators[field](this.form[field])
        return errors
      }, {})
    },

    isValid() {
      return this.fields.every((field) => !this.errors[field])
    },

    serviceSummary() {
      return this.bookingStore.selectedServices.map((service) => service.title).join(', ')
    },

    addressSummary() {
      const address = this.bookingStore.selectedAddress
      if (!address) return ''
      return [address.city, address.street, address.unit].filter(Boolean).join(', ')
    },

    bookingError() {
      const error = this.bookingStore.bookingError
      if (!error) return ''
      if (error === 'captcha-not-configured') return this.$t('obs.booking_error_captcha')
      if (error === 'missing-command-key') return this.$t('obs.booking_error_generic')
      // The API reports refusals as { errorMessage } with a 400.
      return error.data?.errorMessage || this.$t('obs.booking_error_generic')
    }
  },

  beforeUnmount() {
    this.stopCountdown()
  },

  methods: {
    touch(field) {
      this.touched[field] = true
    },

    // Errors stay hidden until the field is touched or the form is submitted,
    // which is what the original's watchers achieved.
    errorFor(field) {
      if (!this.submitted && !this.touched[field]) return ''
      return this.errors[field] || ''
    },

    async book() {
      this.submitted = true
      this.bookingStore.bookingError = null
      if (!this.isValid || this.booking) return

      this.booking = true
      try {
        const result = await this.bookingStore.createReservation(this.form)
        if (!result) return

        this.code = ''
        this.invalidCode = false
        this.telegramUrl = result.type === 'NoTlg' ? result.tlgUrl : null
        this.wizard.showModal('#modal-verification')
        this.startCountdown()
      } finally {
        this.booking = false
      }
    },

    async verifyCode() {
      if (this.verifying) return

      this.verifying = true
      try {
        const confirmed = await this.bookingStore.verifyCode(this.form.phoneNumber, this.code)
        this.invalidCode = !confirmed
        if (confirmed) {
          this.stopCountdown()
          this.wizard.hideModal('#modal-verification')
          this.wizard.showModal('#modal-confirmation')
        }
      } finally {
        this.verifying = false
      }
    },

    // Re-sending means re-holding the reservation: the API mints a new command
    // key and a new code together, so this repeats the create call.
    async resend() {
      this.code = ''
      this.invalidCode = false
      const result = await this.bookingStore.createReservation(this.form)
      if (result) {
        this.telegramUrl = result.type === 'NoTlg' ? result.tlgUrl : null
        this.startCountdown()
      }
    },

    startCountdown() {
      this.stopCountdown()
      this.canResend = false
      this.countdown = RESEND_SECONDS

      this.timer = setInterval(() => {
        this.countdown -= 1
        if (this.countdown <= 0) {
          this.stopCountdown()
          this.canResend = true
        }
      }, 1000)
    },

    // The original never cleared its interval on unmount — only when the
    // countdown reached zero or a new one started — so a component torn down
    // mid-countdown left a timer ticking against a dead instance.
    stopCountdown() {
      if (this.timer) clearInterval(this.timer)
      this.timer = null
    },

    restart() {
      window.location.reload()
    }
  }
}
</script>

<style>
.obs-modal {
  background: #ffffffed !important;
}

.obs-modal-title {
  font-size: 25px;
  font-weight: 300;
}

.obs-modal-description {
  font-size: 14px;
}

.obs-modal-dialog {
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08) !important;
  border: 1px solid #e5e5e5 !important;
}

.obs-error-text {
  font-size: 14px;
}

.obs-form-error,
.obs-form-error:focus {
  border-color: #f0506e;
}
</style>
