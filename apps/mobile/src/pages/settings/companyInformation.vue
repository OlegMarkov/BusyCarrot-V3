<template>
  <view v-if="owner" class="nv view">
    <uni-nav-bar
      left-icon="arrowleft"
      right-icon="checkmarkempty"
      status-bar="true"
      fixed="true"
      :title="$t('general-settings.site-information')"
      @clickLeft="navigateBack"
      @clickRight="save"
    />

    <form class="form">
      <view class="form-item">
        <text class="input-label">{{ $t('general-settings.company-logo') }}</text>

        <image v-if="primaryImage" class="company-logo" mode="aspectFit" :src="primaryImage.url" />
        <view v-else class="company-logo company-logo--empty" @click="selectImage">
          <text style="color: #7a7e83">{{ $t('common.no-image') }}</text>
        </view>

        <button v-if="primaryImage" type="warn" @click="deleteImage">
          {{ $t('common.delete') }}
        </button>
        <button type="default" @click="selectImage">{{ $t('common.upload') }}</button>
      </view>

      <view class="form-item">
        <text class="input-label">{{ $t('general-settings.company-title') }}</text>
        <input v-model="owner.title" class="input-text" type="text" />
      </view>

      <view class="form-item">
        <text class="input-label">{{ $t('general-settings.company-description') }}</text>
        <input v-model="owner.description" class="input-text" type="text" />
      </view>

      <view class="form-item">
        <text class="input-label">{{ $t('general-settings.alias') }}</text>
        <input v-model="owner.alias" class="input-text" type="text" />
      </view>

      <view
        v-for="link in navigationLinks"
        :key="link.url"
        class="form-item"
        @click="navigateTo(link.url)"
      >
        <text class="input-label">{{ link.label }}</text>
        <view class="flex-row form-list">
          <view><text class="form-list-title">{{ link.value }}</text></view>
          <view><uni-icons :size="20" class="uni-icon-wrapper" color="#333" type="arrowright" /></view>
        </view>
      </view>

      <view class="form-item">
        <text class="input-label">{{ $t('general-settings.turn-on-personal-web-site') }}</text>
        <switch color="#118C3C" :checked="owner.allowSite" @change="pwsSwitch" />
      </view>

      <view class="form-item">
        <text class="input-label">{{ $t('general-settings.personal-web-site') }}</text>
        <input class="input-text" type="text" :value="pwsUrl" :disabled="true" />
      </view>

      <view class="form-item">
        <text class="input-label">{{ $t('general-settings.disable-reservation-at-same-day') }}</text>
        <switch
          color="#118C3C"
          :checked="owner.disableReservationAtSameDay"
          @change="atSameDaySwitch"
        />
      </view>
    </form>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import { pathToBase64 } from 'image-tools'
import uniNavBar from '@/components/ui/uni-nav-bar/uni-nav-bar.vue'
import uniIcons from '@/components/ui/uni-icons/uni-icons.vue'
import Constants from '@/config'
import { useOwnerStore } from '@/stores/owner'
import { useImageStore } from '@/stores/image'
import { toast } from '@/plugins/native'

/**
 * Ported from vegetable.mobile.vue/pages/settings/companyInformation.nvue.
 *
 * The public-site settings: logo, name, description, the alias that forms the
 * site URL, and links out to address / social links / gallery / currency.
 * Saving checks the alias is not already taken.
 *
 * Changes:
 *  - `plus.nativeUI.toast` → `toast()`; vuex → Pinia
 *  - the four near-identical "navigate to sub-page" rows become a `v-for` over
 *    `navigationLinks`
 *  - `selectImage` had the same `pathToBase64().then(upload)` block duplicated in
 *    both branches of an if/else; the delete-first case now just awaits
 *  - `addressTitle` read `owner.addresses[0]` unguarded and fell off the end
 *    returning `undefined` when neither description nor street was set
 *  - `owner.currency.name` in the template is guarded — this page is reachable
 *    from Settings before the owner has finished loading
 *  - `backup` was assigned in `onLoad` without being declared in `data`
 *  - `uni.$off` for the currency listener was missing entirely, so every visit
 *    to this page left another handler attached; it is removed on unload now
 *  - the `user` component was imported and registered for a commented-out tag
 */
export default {
  components: { uniNavBar, uniIcons },
  data() {
    return {
      backup: {}
    }
  },
  computed: {
    ...mapState(useOwnerStore, ['owner']),
    ...mapState(useImageStore, ['primaryImage']),

    pwsUrl() {
      return this.owner?.alias ? Constants.getValue('ObsBaseUrl') + this.owner.alias : ''
    },

    addressTitle() {
      const address = this.owner?.addresses?.[0]
      return address?.description || address?.street || ''
    },

    socialLinkTitle() {
      return (this.owner?.socialNetworks || [])
        .filter((link) => link.url)
        .map((link) => this.$t(`general-settings.social-link-${link.type}`))
        .join(' ')
    },

    navigationLinks() {
      return [
        {
          url: '/pages/settings/address',
          label: this.$t('general-settings.address'),
          value: this.addressTitle
        },
        {
          url: '/pages/settings/socialLinks',
          label: this.$t('general-settings.socialLinks'),
          value: this.socialLinkTitle
        },
        {
          url: '/pages/settings/mainGallery',
          label: this.$t('general-settings.gallery'),
          value: this.$t('general-settings.gallery-short-description')
        },
        {
          url: `/pages/settings/currencies?currency=${this.owner?.currency?.id ?? ''}`,
          label: this.$t('general-settings.currency'),
          value: this.owner?.currency?.name || ''
        }
      ]
    }
  },
  onLoad() {
    this.backup = { ...this.owner }

    this.onCurrencyUpdated = (data) => {
      useOwnerStore().owner.currency = data.currency
    }
    uni.$on('update:currency', this.onCurrencyUpdated)
  },
  onUnload() {
    uni.$off('update:currency', this.onCurrencyUpdated)
  },
  methods: {
    navigateTo(url) {
      uni.navigateTo({ url })
    },

    navigateBack() {
      if (JSON.stringify(this.backup) !== JSON.stringify(this.owner)) {
        useOwnerStore().fetchOwner()
      }
      uni.navigateBack()
    },

    /** The alias becomes part of the public URL, so it has to be unique. */
    async save() {
      const owners = useOwnerStore()

      if (this.owner.allowSite && !this.owner.alias) {
        toast(this.$t('general-settings.alias-validation'))
        return
      }

      if (this.owner.alias) {
        const result = await owners.verifyDuplicateAlias(this.owner.alias)
        if (result?.data) {
          toast(this.$t('general-settings.alias-duplicate'))
          return
        }
      }

      owners.updateOwner(this.owner)
      uni.navigateBack()
    },

    selectImage() {
      uni.chooseImage({
        count: 1,
        sourceType: ['album', 'camera'],
        success: async (res) => {
          const images = useImageStore()
          // Only one primary image is allowed, so replace rather than add.
          if (this.primaryImage) await images.deleteImage(this.primaryImage.id)

          try {
            const base64 = await pathToBase64(res.tempFilePaths[0])
            images.uploadImage({ isPrimary: true, ImageBase64: base64 })
          } catch (error) {
            console.error(error)
          }
        }
      })
    },

    deleteImage() {
      useImageStore().deleteImage(this.primaryImage.id)
    },

    pwsSwitch() {
      this.owner.allowSite = !this.owner.allowSite
    },

    atSameDaySwitch() {
      this.owner.disableReservationAtSameDay = !this.owner.disableReservationAtSameDay
    }
  }
}
</script>

<style lang="scss" scoped>
.company-logo {
  height: 400rpx;
  flex: 1;
  margin-bottom: 10px;
  background-color: #eeeeee;
}

.company-logo--empty {
  flex-direction: row;
  justify-content: center;
  align-items: center;
  text-align: center;
}
</style>
