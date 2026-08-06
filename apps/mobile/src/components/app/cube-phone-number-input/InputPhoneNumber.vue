<template>
  <view class="cube-phone-number-input">
    <picker
      class="country-code-selector"
      :value="selectedIndex"
      :range="countriesSorted"
      :range-key="locale"
      @change="onCountry"
    >
      <view class="uni-input">{{ countriesSorted[selectedIndex]?.[locale] }}</view>
    </picker>
    <input
      ref="input"
      type="tel"
      class="phone-number-input"
      :class="inputClass"
      :placeholder="placeholder"
      v-bind="$attrs"
      :value="phoneNumberFormatted"
      @input="onInput"
      @confirm="$emit('confirm', $event)"
    />
  </view>
</template>

<script>
import {
  parsePhoneNumber,
  parseIncompletePhoneNumber,
  formatIncompletePhoneNumber,
  ParseError
} from 'libphonenumber-js/max'
import countriesList from './assets/countries.json'
import { getLocale } from '@/plugins/i18n'

/**
 * Ported from
 * vegetable.mobile.vue/components/app/cube-phone-number-input/components/InputPhoneNumber.vue.
 *
 * Country picker + phone field, emitting parsed details as you type. The only
 * consumer is pages/login/loginint.vue, which listens on `@update` for
 * `{ valid, countryCallingCode, nationalNumber, country }`.
 *
 * Vue 3 changes:
 *  - `v-model` is `modelValue` / `update:modelValue`, not `value` / `input`
 *  - `<div>` → `<view>`
 *  - `i18n.locale` → `getLocale()` (vue-i18n v9)
 *  - the unused `t()` computed (the getApp().globalData.$t hack) is gone
 *
 * As-you-type formatting is enabled (signed off). The original bound
 * `:value="phoneNumberFormatted"`, but that computed returned
 * `this.phoneNumber.nationalNumber` — and `phoneNumber` is a string (the result
 * of `parseIncompletePhoneNumber`), so `.nationalNumber` was always `undefined`
 * and the binding never applied. The author's intent was in the line commented
 * out beside it: `formatIncompletePhoneNumber(...)`. That is what the computed
 * does now, so the field reads "(999) 123-45-67" as you type.
 *
 * Two consequences worth knowing:
 *
 *  - the input is `type="tel"`, not `type="number"`. It has to be: a formatted
 *    number contains parentheses, spaces and dashes, and assigning that to an
 *    `<input type="number">` leaves the field blank. `tel` still raises a
 *    numeric keypad.
 *  - nothing about the submitted value changes. loginint builds the number it
 *    sends from `countryCallingCode` + `nationalNumber` off the `@update`
 *    payload (loginint.vue:225), never from the field's text.
 *
 * The original also emitted `nationalNumberFormatted: this.phoneNumberFormatted`
 * in that payload — always `undefined`, for the same reason, and no consumer
 * read it. It stays dropped.
 */
export default {
  name: 'InputPhoneNumber',
  inheritAttrs: false,
  emits: ['update:modelValue', 'update', 'valid', 'country', 'error', 'confirm'],
  props: {
    modelValue: { type: String, default: '' },
    country: { type: String, default: 'RU' },
    countries: { type: Array, default: () => countriesList },
    inputClass: { type: [String, Array, Object], default: null },
    placeholder: { type: String, default: 'Phone number' },
    validityErrorMessage: { type: String, default: 'Invalid phone number' }
  },
  data() {
    return {
      selectedCountry: this.country,
      phoneNumber: this.modelValue,
      selectedIndex: 0
    }
  },
  computed: {
    countriesSorted() {
      return Array.from(this.countries).sort((a, b) => a.code.localeCompare(b.code))
    },
    locale() {
      return getLocale()
    },
    /** What the field displays: the digits so far, grouped for the country. */
    phoneNumberFormatted() {
      return formatIncompletePhoneNumber(this.phoneNumber || '', this.selectedCountry)
    }
  },
  mounted() {
    // Preselect the country whose `locale` matches the active UI language.
    const localeCountry = this.countries.find((item) => item.locale === this.locale)
    if (localeCountry) {
      this.selectedIndex = this.countriesSorted.findIndex(
        (item) => item.code === localeCountry.code
      )
    }

    if (this.modelValue) {
      this.$emit('update:modelValue', this.phoneNumber)
      this.parse()
    }

    this.onCountry({ detail: { value: this.selectedIndex } })
  },
  methods: {
    focus() {
      this.$refs.input.focus()
    },

    onCountry(event) {
      this.selectedIndex = event.detail.value
      this.selectedCountry = this.countriesSorted[this.selectedIndex].code
      this.$emit('country', this.selectedCountry)
      this.parse()
    },

    onInput(event) {
      let value = event.detail ? event.detail.value : event.target.value

      if (!this.selectedCountry && value.length && value[0] !== '!') {
        value = '+' + value
      }

      const number = parseIncompletePhoneNumber(value)

      // Workaround for the `(xxx)` backspace issue: when deleting the last digit
      // of a formatted group, the reparsed value comes back unchanged, so drop a
      // character explicitly.
      this.phoneNumber =
        number === this.phoneNumber &&
        formatIncompletePhoneNumber(number, this.selectedCountry).indexOf(value) === 0
          ? number.slice(0, -1)
          : number

      this.$emit('update:modelValue', this.phoneNumber)
      this.parse()
    },

    parse() {
      try {
        const phoneNumber = parsePhoneNumber(this.phoneNumber, {
          defaultCountry: this.selectedCountry,
          extract: false
        })

        const details = {
          country: phoneNumber.country,
          countryCallingCode: phoneNumber.countryCallingCode,
          number: phoneNumber.number,
          numberFormatted: phoneNumber.formatInternational(),
          nationalNumber: phoneNumber.nationalNumber,
          uri: phoneNumber.getURI(),
          possible: phoneNumber.isPossible(),
          valid: phoneNumber.isValid(),
          type: phoneNumber.getType()
        }

        if (phoneNumber.country) {
          this.selectedCountry = phoneNumber.country
          this.$emit('country', this.selectedCountry)
        }

        this.$emit('update', details)
        this.$emit('valid', details.valid)
        return details
      } catch (error) {
        this.$emit('update', null)
        this.$emit('valid', false)
        this.$emit('error', error instanceof ParseError ? this.validityErrorMessage : error)
        return null
      }
    }
  }
}
</script>
