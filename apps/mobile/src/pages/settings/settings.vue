<template>
  <view class="nv flex flex-column overflow-hidden">
    <uni-nav-bar status-bar="true" fixed="true" :title="$t('general-settings.short-title')" />

    <scroll-view class="flex overflow-hidden" scroll-y :scroll-top="scrollTop" @scroll="onScroll">
      <uni-list>
        <view class="blueprint sub-plate" @click="navigateTo('/pages/settings/subscriptions')">
          <text class="corner tl" />
          <text class="corner tr" />
          <text class="corner bl" />
          <text class="corner br" />

          <view class="sub-plate__head">
            <view class="sub-plate__id">
              <text class="ind-kicker">{{ $t('general-settings.subscription') }}</text>
              <text class="sub-plate__name">{{ subscriptionName }}</text>
            </view>
            <view class="tag tag-accent">
              <text class="sub-plate__tag-text">{{ subscriptionBadgeText }}</text>
            </view>
          </view>

          <text class="sub-plate__note">{{ $t('general-settings.subscriptionNote') }}</text>
        </view>

        <text class="settings-label">{{ $t('general-settings.language') }}</text>
        <view class="seg settings-seg">
          <view
            v-for="option in languageOptions"
            :key="option.code"
            class="seg-opt"
            :class="{ 'seg-opt--active': option.code === currentLanguage }"
            @click="selectLanguage(option.code)"
          >
            <text
              class="seg-opt__text"
              :class="{ 'seg-opt__text--active': option.code === currentLanguage }"
              >{{ option.label }}</text
            >
          </view>
        </view>
        <uni-list-item
          :title="$t('general-settings.account')"
          :note="$t('general-settings.accountNote')"
          @click="navigateTo('/pages/settings/account')"
        />
        <uni-list-item
          :title="$t('general-settings.currency')"
          :note="$t('general-settings.currencyNote')"
          @click="navigateTo('/pages/settings/currencies')"
        />
        <uni-list-item
          :title="$t('general-settings.notifications')"
          :note="$t('general-settings.notificationsNote')"
          @click="navigateTo('/pages/settings/notification/notifications')"
        />
        <uni-list-item
          :disabled="!ownerHasActiveSubscription"
          :title="$t('general-settings.site-information')"
          :note="$t('general-settings.companyInfoNote')"
          @click="navigateCompanyInformation"
        />
        <uni-list-item
          :title="$t('general-settings.legalInformationTitle')"
          :note="$t('general-settings.legalInformationNote')"
          @click="navigateLegalInfo"
        />
      </uni-list>
    </scroll-view>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniList from '@/components/ui/uni-list/uni-list.vue'
import uniListItem from '@/components/ui/uni-list-item/uni-list-item.vue'
import Constants from '@/config'
import { useAppStore } from '@/stores/app'
import { useOwnerStore } from '@/stores/owner'
import { useSettingsStore } from '@/stores/settings'
import { getLocale } from '@/plugins/i18n'
import { openUrl, toast } from '@/plugins/native'

/**
 * Ported from vegetable.mobile.vue/pages/settings/settings.nvue.
 *
 * Changes:
 *  - the seven near-identical `navigateX()` methods collapse to `navigateTo(url)`;
 *    only the company-information and legal ones do anything extra
 *  - `plus.runtime.openURL` / `plus.nativeUI.toast` → plugins/native.js
 *  - `dom.scrollToElement(this.$refs.topElement)` → a bound `scroll-top`
 *  - the `owner` guards: every subscription computed dereferenced `this.owner`
 *    unconditionally, so this page threw whenever it was opened before the owner
 *    had loaded (a cold start straight onto the Settings tab)
 */
export default {
  components: { uniNavBar, uniList, uniListItem },
  data() {
    return {
      privacyUrl: Constants.getValue('ApiBaseUrl') + 'publicowner/privacypolicy',
      scrollTop: 0,
      currentScrollTop: 0
    }
  },
  computed: {
    ...mapState(useAppStore, ['tabIndex']),
    ...mapState(useOwnerStore, ['owner']),
    ...mapState(useSettingsStore, ['language']),

    /** The two locales the app ships, as the segmented control's options. */
    languageOptions() {
      return [
        { code: 'en', label: 'ENGLISH' },
        { code: 'ru', label: 'РУССКИЙ' }
      ]
    },
    currentLanguage() {
      return this.language || getLocale()
    },
    subscriptionName() {
      return this.owner?.subscription?.title || this.$t('general-settings.subscription-default')
    },

    ownerHasActiveSubscription() {
      return Boolean(this.owner?.hasActiveSubscription && this.owner?.subscriptionEndDate != null)
    },

    subscriptionBadgeText() {
      if (!this.owner) return this.$t('subscription.default')
      if (this.ownerHasActiveSubscription) return this.$t('subscription.active')
      if (this.owner.subscriptionEndDate != null) return this.$t('subscription.expired')
      return this.$t('subscription.default')
    },

    subscriptionStatusType() {
      if (!this.owner) return 'default'
      if (this.ownerHasActiveSubscription) return 'success'
      if (this.owner.subscriptionEndDate != null) return 'warning'
      return 'default'
    }
  },
  onTabItemTap(item) {
    if (this.tabIndex === item.index) this.gotoTop()
    useAppStore().setTabIndex(item.index)
  },
  methods: {
    /**
     * The design puts the language switch inline rather than behind its own
     * page; the dedicated languages page is still reachable and still works.
     */
    selectLanguage(code) {
      if (code === this.currentLanguage) return
      useSettingsStore().upsertLanguage(code)
    },

    navigateTo(url) {
      uni.navigateTo({ url })
    },

    navigateCompanyInformation() {
      if (this.ownerHasActiveSubscription) {
        uni.navigateTo({ url: '/pages/settings/companyInformation' })
      } else {
        toast(this.$t('general-settings.personal-site-not-available'))
      }
    },

    navigateLegalInfo() {
      openUrl(this.privacyUrl)
    },

    onScroll(event) {
      this.currentScrollTop = event.detail.scrollTop
    },

    gotoTop() {
      this.scrollTop = this.currentScrollTop || 1
      this.$nextTick(() => {
        this.scrollTop = 0
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.sub-plate {
  margin: 6px 6px 20px;
  padding: 14px;
}

.sub-plate__head {
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
}

.sub-plate__id {
  flex: 1;
}

.sub-plate__name {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 24px;
  line-height: 1.1;
  color: var(--color-text);
  margin-top: 6px;
}

.sub-plate__tag-text {
  font-family: var(--font-body);
  font-size: 11px;
  color: var(--color-accent-800);
}

.sub-plate__note {
  font-family: var(--font-body);
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-neutral-700);
  margin-top: 8px;
}

.settings-label {
  font-family: var(--font-body);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin: 0 0 8px 8px;
}

.settings-seg {
  margin: 0 6px 20px;
}

.seg-opt__text {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--color-text);
}

.seg-opt__text--active {
  color: var(--color-bg);
}
</style>
