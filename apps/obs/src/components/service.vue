<template>
  <li>
    <div>
      <h3 class="uk-text-center">{{ $t('obs.service_title') }}</h3>
      <div class="uk-child-width-1-3@m uk-grid-small uk-grid-match uk-flex-center" uk-grid>
        <div v-for="service in ownerStore.services" :key="service.id">
          <div
            class="uk-card uk-card-default uk-card-hover obs-service obs-card"
            @click="selectService(service)"
          >
            <div
              v-if="bookingStore.isServiceSelected(service)"
              class="uk-card-badge uk-label uk-label-success"
            >
              {{ $t('obs.service_selected') }}
            </div>
            <div class="uk-card-body">
              <h4 class="uk-text-center uk-card-title">{{ service.title }}</h4>
              <p>{{ service.description }}</p>
              <p>
                {{ $t('obs.service_cost') }} {{ service.cost }} {{ currencySymbol }}<br />
                {{ $t('obs.service_duration') }} {{ service.durationInMinutes }}
                {{ $t('obs.minutes') }}
              </p>
            </div>
            <div class="uk-card-media-bottom">
              <img :src="serviceImage" alt="" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="bookingStore.hasSelectedServices" class="nextbutton-container">
      <a href="" class="link-simulator floating" @click.prevent="goNextStep">
        <span uk-icon="icon: forward; ratio: 1.5" class="my-float"></span>
      </a>
    </div>
  </li>
</template>

<script>
// Ported from vegetable.web/src/Frontend/ui/src/components/service.vue —
// the multi-select version, where tapping a card toggles it and a floating
// forward button advances.
//
// Two things changed. The cost was rendered as a hardcoded `$` regardless of
// the owner's currency, which the API does return; and duration was rendered
// from `service.duration`, the .NET TimeSpan, which serialises as "00:30:00".
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useOwnerStore } from '@/stores/owner'
import { useWizard } from '@/composables/wizard'
import serviceImage from '@/assets/images/service.jpg'

export default {
  name: 'ObsService',
  props: { index: { type: Number, default: 0 } },

  setup() {
    return { wizard: useWizard(), serviceImage }
  },

  computed: {
    ...mapStores(useBookingStore, useOwnerStore),
    currencySymbol() {
      return this.ownerStore.owner?.currency?.symbol ?? ''
    }
  },

  methods: {
    selectService(service) {
      const wasSelected = this.bookingStore.isServiceSelected(service)
      this.bookingStore.toggleService(service)

      if (!wasSelected) {
        this.wizard.notify(this.$t('obs.service_selected_notification') + service.title)
      }
    },

    goNextStep() {
      this.wizard.showStep(this.index + 1)
    }
  }
}
</script>

<style>
div.obs-service:hover {
  cursor: pointer;
}

.floating {
  position: fixed;
  width: 60px;
  height: 60px;
  bottom: 40px;
  background-color: #25d366;
  color: #fff;
  border-radius: 50px;
  text-align: center;
  font-size: 30px;
  box-shadow: 2px 2px 3px #999;
  z-index: 100000;
  right: 15px;
}

.my-float {
  margin-top: 16px;
}

.nextbutton-container {
  position: sticky;
}

.uk-label-success {
  background: #25d366 !important;
  color: #fff !important;
}
</style>
