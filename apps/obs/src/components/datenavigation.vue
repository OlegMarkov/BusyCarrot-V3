<template>
  <li class="uk-text-center uk-text-truncate" @click.stop.prevent>
    <a v-if="bookingStore.selectedDate" class="obs-tab-link" @click="resetDate">{{ title }}</a>
    <a v-else href="#">{{ $t('obs.navigation_date_time') }}</a>
  </li>
</template>

<script>
// Ported from vegetable.web/src/Frontend/ui/src/components/datenavigation.vue.
//
// `selectedDateTime` used to be a third piece of state, written alongside the
// date and the time as a preformatted string — and never re-rendered when the
// language changed, so switching locale left the tab in the old one. It is
// derived from the date and time in the store now.
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useWizard } from '@/composables/wizard'

export default {
  name: 'ObsDateNavigation',
  props: { index: { type: Number, default: 0 } },

  setup() {
    return { wizard: useWizard() }
  },

  computed: {
    ...mapStores(useBookingStore),
    title() {
      return this.bookingStore.selectedDateTime ?? this.$t('obs.navigation_date_time')
    }
  },

  methods: {
    resetDate() {
      this.bookingStore.changeDate(null)
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
