<template>
  <li class="uk-text-center uk-text-truncate" @click.stop.prevent>
    <a
      v-if="bookingStore.hasSelectedServices"
      class="obs-tab-link"
      :uk-tooltip="titleTooltip"
      @click="resetService"
      >{{ title }}</a
    >
    <a v-else href="#">{{ $t('obs.navigation_service') }}</a>
  </li>
</template>

<script>
// Ported from vegetable.web/src/Frontend/ui/src/components/servicenavigation.vue.
//
// Two fixes:
//
//  - resetService committed RESET_SERVICES, but that constant and RESET_SERVICE
//    were both the string "resetServices", so the two mutations collided on one
//    key in the mutations object and the surviving one expected a service
//    argument. Called with none, `indexOf(undefined)` returned -1 and nothing
//    was cleared — the tab looked interactive and did nothing.
//  - The <li> carried a hardcoded `uk-active` class, so the service tab
//    rendered as the active one no matter which step the wizard was on.
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useWizard } from '@/composables/wizard'

export default {
  name: 'ObsServiceNavigation',
  props: { index: { type: Number, default: 0 } },

  setup() {
    return { wizard: useWizard() }
  },

  computed: {
    ...mapStores(useBookingStore),
    title() {
      const services = this.bookingStore.selectedServices
      if (!services.length) return this.$t('obs.navigation_service')
      return services.length > 1
        ? `${services[0].title} + ${services.length - 1}`
        : services[0].title
    },
    titleTooltip() {
      return this.bookingStore.selectedServices.map((service) => service.title).join(', ')
    }
  },

  methods: {
    resetService() {
      this.bookingStore.resetServices()
      this.wizard.showStep(this.index)
    }
  }
}
</script>

<style scoped>
#steps > li > a.obs-tab-link {
  color: #1e87f0;
}

#steps > li > a.obs-tab-link:hover {
  color: #0f6ecd;
  text-decoration: underline;
}
</style>
