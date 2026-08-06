<template>
  <li class="uk-text-center uk-text-truncate" @click.stop.prevent>
    <a v-if="bookingStore.selectedAddress" class="obs-tab-link" @click="resetAddress">{{ title }}</a>
    <a v-else href="#">{{ $t('obs.navigation_location') }}</a>
  </li>
</template>

<script>
// Ported from vegetable/Vegetable.Obs/components/locationnavigation.vue.
//
// The original bound @click to `resetAddress`, which it never defined — the
// other three navigation components all had their reset method, this one was
// missed. Clicking the address tab threw instead of stepping back. Implemented
// here to match its siblings.
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useWizard } from '@/composables/wizard'

export default {
  name: 'ObsLocationNavigation',
  props: { index: { type: Number, default: 0 } },

  setup() {
    return { wizard: useWizard() }
  },

  computed: {
    ...mapStores(useBookingStore),
    title() {
      const address = this.bookingStore.selectedAddress
      if (!address) return this.$t('obs.navigation_location')
      return address.description || address.city || address.state
    }
  },

  methods: {
    resetAddress() {
      this.bookingStore.changeAddress(null)
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
