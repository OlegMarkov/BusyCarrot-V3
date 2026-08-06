<template>
  <view class="nv">
    <uni-nav-bar :fixed="true" status-bar="true" left-icon="arrowleft" @clickLeft="goBack">
      <search-input @input="onSearchInput" />
      <template #right>
        <view>
          <checkbox-group @change="checkAll">
            <checkbox value="CheckAll" color="#118C3C" />
          </checkbox-group>
        </view>
      </template>
    </uni-nav-bar>

    <view class="uni-list contact-list">
      <checkbox-group @change="checkboxChange">
        <view v-for="contact in visibleContacts" :key="contact.id" class="uni-list-item">
          <view class="uni-list-item__container" @click="checkContact(contact)">
            <view class="uni-list-item__content">
              <text class="uni-list-item__content-title">{{ contact.displayName }}</text>
              <text class="uni-list-item__content-note">{{ formatPhone(contact) }}</text>
            </view>
            <view class="uni-list-item__extra">
              <checkbox :value="contact.displayName" :checked="contact.isChecked" color="#118C3C" />
            </view>
          </view>
        </view>
      </checkbox-group>
    </view>

    <button v-if="readyToImport.length > 0" class="import-button" type="primary" @click="doImport">
      {{ $t('customer.import') }} ({{ readyToImport.length }})
    </button>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import searchInput from '@/components/app/search-input.vue'
import { useCustomerStore } from '@/stores/customer'
import { useReservationStore } from '@/stores/reservation'
import { getPhoneContacts } from '@/plugins/native'

const digitsOnly = (value) => String(value || '').replace(/\D/g, '')

/**
 * Ported from vegetable.mobile.vue/pages/customer/contactImportList.nvue.
 *
 * Reads the phone's address book, hides anyone already saved as a customer,
 * and bulk-imports the ticked entries.
 *
 * Changes:
 *  - `plus.contacts.getAddressBook` with its two nested callbacks →
 *    `getPhoneContacts()` from plugins/native.js, which is promisified
 *  - `slot="right"` → `#right` (Vue 3 dropped the `slot` attribute)
 *  - `@tap.native` on a `<view>` → `@click`. `.native` does not exist in Vue 3,
 *    and on a plain element it was redundant even in Vue 2 — it was also
 *    duplicated by an `@click` on the child, so a tap toggled the row twice and
 *    cancelled itself out.
 *  - `IsChecked` / `IsVisible` → `isChecked` / `isVisible`, and the
 *    `this.contacts = [...this.contacts]` reassignments after every mutation are
 *    gone; those existed because Vue 2 could not see new properties added to an
 *    object, which Vue 3's proxy reactivity handles.
 *  - `_.sortBy` → `Array.prototype.sort`; `formatFirstName` / `formatLastName`
 *    were never called; the `uniPopup` import and the bare `var Contacts` at the
 *    top of the module were unused
 *  - the customer phone comparison skips customers with no phone number, which
 *    previously threw inside the filter (`a.phone.replace` on null)
 */
export default {
  components: { uniNavBar, searchInput },
  data() {
    return {
      contacts: []
    }
  },
  computed: {
    ...mapState(useCustomerStore, ['customers']),
    readyToImport() {
      return this.contacts.filter((contact) => contact.isChecked)
    },
    visibleContacts() {
      return this.contacts.filter((contact) => contact.isVisible)
    }
  },
  onShow() {
    uni.setNavigationBarTitle({ title: 'Address book' })
  },
  onLoad() {
    this.loadContacts()
  },
  methods: {
    onSearchInput(text) {
      this.filterContacts(text)
    },

    goBack() {
      uni.navigateBack()
    },

    checkAll(event) {
      const checked = event.detail.value.length > 0
      this.contacts.forEach((contact) => {
        if (contact.isVisible) contact.isChecked = checked
      })
    },

    checkboxChange(event) {
      this.contacts.forEach((contact) => {
        if (contact.isVisible) {
          contact.isChecked = event.detail.value.includes(contact.displayName)
        }
      })
    },

    checkContact(contact) {
      contact.isChecked = !contact.isChecked
    },

    async loadContacts() {
      uni.showToast({ title: this.$t('customer.gettingcontact'), duration: 2000 })

      try {
        const contacts = await getPhoneContacts()
        uni.showToast({ title: this.$t('customer.importfiltering'), duration: 2000 })
        this.contacts = [...contacts].sort((a, b) =>
          (a.displayName || '').localeCompare(b.displayName || '')
        )
        this.filterContacts('')
      } catch (error) {
        uni.showToast({
          title: `Failed to get address book object: ${error?.message || error}`,
          duration: 2000
        })
      }
    },

    /**
     * Marks contacts visible when they match the search, have a phone number,
     * are not already an active customer, and are the first with that number.
     */
    filterContacts(text) {
      const terms = text.trim().toLowerCase().split(' ').filter(Boolean)

      let matches = this.contacts.filter((contact) => {
        if (!contact?.phoneNumbers?.length) return false

        const names = contact.displayName.trim().toLowerCase().split(' ')
        const phone = contact.phoneNumbers[0].value.toLowerCase()

        return terms.every(
          (term) => names.some((name) => name.includes(term)) || phone.includes(term)
        )
      })

      const activeCustomerNumbers = this.customers
        .filter((customer) => customer.isDeleted === false && customer.phone)
        .map((customer) => digitsOnly(customer.phone))

      if (activeCustomerNumbers.length > 0) {
        matches = matches.filter(
          (contact) => !activeCustomerNumbers.includes(digitsOnly(contact.phoneNumbers[0].value))
        )
      }

      const visibleIds = new Set(this.distinctByNumber(matches).map((contact) => contact.id))
      this.contacts.forEach((contact) => {
        contact.isVisible = visibleIds.has(contact.id)
      })
    },

    /** One entry per phone number — address books duplicate people freely. */
    distinctByNumber(contacts) {
      const seen = new Set()
      return contacts.filter((contact) => {
        const number = digitsOnly(contact.phoneNumbers[0].value)
        if (seen.has(number)) return false
        seen.add(number)
        return true
      })
    },

    doImport() {
      const mapped = this.readyToImport.map((contact) => ({
        firstName: contact.displayName,
        phone: this.formatPhone(contact)
      }))

      useCustomerStore().importCustomers(mapped)
      useReservationStore().fetchReservations()
      uni.navigateBack()
    },

    formatPhone(contact) {
      return contact?.phoneNumbers?.length ? contact.phoneNumbers[0].value : ''
    }
  }
}
</script>

<style lang="scss" scoped>
.contact-list {
  margin-bottom: 46px;
}

.import-button {
  background-color: rgba(17, 140, 60, 0.6);
  border-radius: 18rpx;
  position: fixed;
  left: $uni-spacing-col-base;
  right: $uni-spacing-col-base;
  /* #ifdef H5 */
  bottom: var(--window-bottom);
  /* #endif */
  /* #ifndef H5 */
  bottom: $uni-spacing-row-base;
  /* #endif */
}

.uni-list-item {
  font-size: 32rpx;
  position: relative;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 30rpx;
}

.uni-list-item__container {
  position: relative;
  display: flex;
  flex-direction: row;
  padding: 24rpx 30rpx;
  padding-left: 0;
  flex: 1;
  justify-content: space-between;
  align-items: center;
  border-top-color: #e5e5e5;
  border-top-style: solid;
  border-top-width: 0.5px;
}

.uni-list-item__content {
  display: flex;
  flex: 1;
  overflow: hidden;
  flex-direction: column;
  color: #3b4144;
}

.uni-list-item__content-title {
  font-size: 28rpx;
  color: #3b4144;
  overflow: hidden;
}

.uni-list-item__content-note {
  margin-top: 6rpx;
  color: #999;
  font-size: 24rpx;
  overflow: hidden;
}

.uni-list-item__extra {
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
}
</style>
