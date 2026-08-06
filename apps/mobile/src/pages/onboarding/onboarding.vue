<template>
  <view class="background">
    <view class="uni-margin-wrap">
      <swiper class="swiper" :current="current" :disable-touch="true">
        <swiper-item v-for="(step, index) in steps" :key="step.key">
          <view class="swiper-item">
            <view class="form">
              <!-- Welcome -->
              <template v-if="step.key === 'welcome'">
                <view class="header">
                  <text>{{ $t('onboarding.welcome-step-header') }}</text>
                  <text style="color: #28a745">Busy</text><text style="color: #f2a007">Carrot</text>
                </view>
                <image class="centered" src="@/static/carrot-nobackground.png" />
              </template>

              <!-- Final step -->
              <template v-else-if="step.key === 'finish'">
                <view class="centered-text header">
                  <text>{{ $t('onboarding.finish-step-header') }}</text>
                </view>
                <text class="finish-button" @click="complete">
                  {{ $t('onboarding.finish-step-actionButton') }}
                </text>
              </template>

              <!-- The five "go set this up" steps -->
              <template v-else>
                <view class="header">
                  <text>{{ $t(`onboarding.${step.key}-step-header`) }}</text>
                </view>
                <view class="description">
                  <text>{{ $t(`onboarding.${step.key}-step-description`) }}</text>
                </view>
                <view class="image-container">
                  <image :src="step.image" />
                </view>
              </template>

              <view v-if="step.action">
                <button class="action-button" @click="step.action()">
                  {{ $t(`onboarding.${step.key}-step-actionButton`) }}
                </button>
              </view>

              <image
                v-if="step.key !== 'finish'"
                class="next-button"
                src="@/static/icons/straight-right-arrow.png"
                @click="nextStep"
              />
              <image
                v-if="index > 1"
                class="prev-button"
                src="@/static/icons/straignht-left-arrow.png"
                @click="prevStep"
              />
            </view>
          </view>
        </swiper-item>
      </swiper>
    </view>
  </view>
</template>

<script>
import moment from 'moment'
import { mapState } from 'pinia'
import { useScheduleStore } from '@/stores/schedule'
import { useUserStore } from '@/stores/user'
import { useOwnerStore } from '@/stores/owner'

const SCHEDULE_TYPES = Object.freeze({ Week: 0, Switch: 1, Custom: 2 })

/**
 * Ported from vegetable.mobile.vue/pages/onboarding/onboarding.vue.
 *
 * A seven-slide walkthrough shown once, after the first login, until the user
 * record has `onboardingCompleted`. Each middle slide deep-links into the screen
 * it is describing and advances the carousel.
 *
 * The original repeated the same slide markup seven times; it is a `v-for` over
 * a `steps` descriptor here, since only the i18n key, the image and the action
 * differed. Slide order, copy keys and navigation targets are unchanged.
 *
 * Other changes:
 *  - `<h2>`/`<h5>` → `<view>`/`<text>`: they are not uni-app components and did
 *    not render as headings on the app target anyway
 *  - `uniSwiperDot` was imported but never used — dropped
 *  - `getApp().globalData.$t` → `$t`; vuex → Pinia
 *  - `setupSchedule` guards against there being no weekly/rotating schedule; the
 *    original indexed `generalSchedules[0].id` straight away and would throw on
 *    an account that only had custom schedules.
 */
export default {
  data() {
    return {
      current: 0
    }
  },
  computed: {
    ...mapState(useScheduleStore, ['schedules']),
    ...mapState(useUserStore, ['userDb']),
    steps() {
      return [
        { key: 'welcome' },
        {
          key: 'schedule',
          image: '/static/icons/calendarSchedule.svg',
          action: this.setupSchedule
        },
        { key: 'service', image: '/static/icons/cart.svg', action: this.setupService },
        { key: 'customer', image: '/static/icons/like.svg', action: this.setupCustomer },
        {
          key: 'reservation',
          image: '/static/icons/calendarReservation.svg',
          action: this.setupReservation
        },
        { key: 'site', image: '/static/global.png', action: this.setupSite },
        { key: 'finish' }
      ]
    }
  },
  onLoad() {
    useOwnerStore().fetchAllOwnerData()
  },
  methods: {
    setupSchedule() {
      const general = this.schedules.find(
        (schedule) =>
          schedule.scheduleType === SCHEDULE_TYPES.Week ||
          schedule.scheduleType === SCHEDULE_TYPES.Switch
      )
      if (general) {
        uni.navigateTo({ url: `/pages/settings/schedule/edit?id=${general.id}` })
      }
      this.nextStep()
    },

    setupService() {
      uni.navigateTo({ url: '/pages/service/edit' })
      this.nextStep()
    },

    setupCustomer() {
      uni.navigateTo({ url: '/pages/customer/edit' })
      this.nextStep()
    },

    setupReservation() {
      uni.navigateTo({ url: `/pages/reservation/edit?date=${moment().format('YYYY-MM-DD')}` })
      this.nextStep()
    },

    setupSite() {
      uni.navigateTo({ url: '/pages/settings/companyInformation' })
      this.nextStep()
    },

    nextStep() {
      if (this.current < this.steps.length - 1) this.current += 1
    },

    prevStep() {
      if (this.current > 0) this.current -= 1
    },

    complete() {
      const user = useUserStore()
      if (user.userDb) {
        user.userDb.onboardingCompleted = true
        user.updateUser(user.userDb)
      }
      uni.reLaunch({ url: '/pages/index/index' })
    }
  }
}
</script>

<style lang="scss" scoped>
.uni-margin-wrap {
  width: 690rpx;
  margin: 0 30rpx;
}

.swiper {
  height: 1200rpx;
}

.swiper-item {
  height: 300rpx;
  text-align: center;
  margin-top: 200rpx;
}

.header {
  font-size: $uni-font-size-title;
  align-items: center;
  justify-content: center;
}

.centered {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.centered-text {
  display: flex;
  justify-content: center;
  align-items: center;
}

.action-button {
  position: fixed;
  bottom: 5rpx;
  color: white;
  width: 120px;
  background-color: #28a745;
  left: $uni-spacing-col-xxlg;
  right: $uni-spacing-col-xxlg;
  border-radius: 25px;
}

.next-button {
  width: 50px;
  height: 50px;
  right: 20rpx;
  position: fixed;
  bottom: 5rpx;
}

.prev-button {
  width: 50px;
  height: 50px;
  left: 20rpx;
  position: fixed;
  bottom: 5rpx;
}

.background {
  background-image: url('@/static/background-intro3.png');
}

.description {
  margin-top: 50rpx;
}

.image-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-container image {
  width: 150px;
  height: 150px;
  margin-top: 30rpx;
}

.finish-button {
  width: 220rpx;
  height: 220rpx;
  background-color: $uni-color;
  border-radius: 50%;
  font-size: 35rpx;
  line-height: 220rpx;
  color: white;
  text-align: center;
  position: fixed;
  top: 60%;
  left: 50%;
  transform: translate(-50%, -60%);
}

.finish-button:after {
  content: '';
  width: 220rpx;
  height: 220rpx;
  background-color: $uni-color;
  border-radius: 50%;
  position: fixed;
  top: 60%;
  left: 50%;
  transform: translate(-50%, -60%);
  animation: pulse 2s ease 0s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: translate(-50%, -60%) scale(1);
  }
  80% {
    opacity: 0;
    transform: translate(-50%, -60%) scale(1.5);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -60%) scale(2);
  }
}
</style>
