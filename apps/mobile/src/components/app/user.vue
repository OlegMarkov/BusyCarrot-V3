<template>
  <view class="nv">
    <form class="form">
      <view class="form-item">
        <text class="input-label">{{ $t('general-settings.address-phonenumber') }}</text>
        <input class="input-text" type="text" :value="userDb.phoneNumber" :disabled="true" />
      </view>
      <view class="form-item">
        <button type="default" @click.stop="logout">{{ $t('user.logout') }}</button>
      </view>
      <view class="form-item">
        <button type="warn" @click.stop="deleteOwner">{{ $t('common.deleteOwner') }}</button>
      </view>
    </form>

    <uni-popup ref="popup" type="center" :mask-click="true">
      <view class="modal-dialog">
        <text class="modal-dialog-content">{{ popupTitle }}</text>
        <view class="modal-dialog-group-button">
          <text class="modal-dialog-button" @click="close">{{ $t('common.no') }}</text>
          <text class="modal-dialog-button" @click="confirm">{{ $t('common.yes') }}</text>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { mapState } from 'pinia'
import uniPopup from '@/components/ui/uni-popup/uni-popup.vue'
import { useUserStore } from '@/stores/user'
import { useOwnerStore } from '@/stores/owner'
import { useAppStore } from '@/stores/app'
import { useEmployeeStore } from '@/stores/employee'
import { useScheduleStore } from '@/stores/schedule'
import { useServiceStore } from '@/stores/service'
import { useCustomerStore } from '@/stores/customer'
import { useReservationStore } from '@/stores/reservation'
import { useImageStore } from '@/stores/image'
import { getPushClientId } from '@/plugins/native'

/**
 * Ported from vegetable.mobile.vue/components/app/user.nvue.
 *
 * The account screen's body: the signed-in phone number, Log out, and Delete
 * account. Both destructive actions share one confirmation dialog, distinguished
 * by `isDeleteAction`.
 *
 * Changes:
 *  - the nine `RESET_*` commits become `reset()` calls on each store, collected
 *    in `resetAllStores()`
 *  - `plus.push.getClientInfo()` → `getPushClientId()`
 *  - `created()` checked `if (!this.ownerDb)`, a property that exists nowhere,
 *    so the guard was always true and `FETCH_USER` always ran. It now checks
 *    `userDb`, which is what the template actually reads.
 *  - the `uniPopupDialog` import was never rendered; dropped
 */
export default {
  name: 'UserSettings',
  components: { uniPopup },
  data() {
    return {
      popupTitle: '',
      isDeleteAction: false
    }
  },
  computed: {
    ...mapState(useUserStore, ['user', 'userDb'])
  },
  created() {
    if (!this.userDb) useUserStore().fetchUser()
  },
  methods: {
    logout() {
      this.popupTitle = this.$t('general-settings.logout-confirm')
      this.isDeleteAction = false
      this.$refs.popup.open()
    },

    deleteOwner() {
      this.popupTitle = this.$t('common.deleteOwnerMessage')
      this.isDeleteAction = true
      this.$refs.popup.open()
    },

    close() {
      this.$refs.popup.close()
    },

    async confirm() {
      this.$refs.popup.close()

      // Logging out just unregisters this device from push; deleting removes
      // the whole owner account.
      if (this.isDeleteAction) {
        await useOwnerStore().deleteOwner()
      } else {
        await useUserStore().deleteUserData(getPushClientId())
      }

      this.resetAllStores()
      uni.redirectTo({ url: '/pages/login/loginint' })
    },

    resetAllStores() {
      useAppStore().reset()
      useUserStore().clearSession()
      useOwnerStore().reset()
      useEmployeeStore().reset()
      useScheduleStore().reset()
      useServiceStore().reset()
      useCustomerStore().reset()
      useReservationStore().reset()
      useImageStore().reset()
    }
  }
}
</script>
