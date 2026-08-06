<template>
  <li class="uk-text-center uk-text-truncate" @click.stop.prevent>
    <a v-if="bookingStore.selectedEmployee" class="obs-tab-link" @click="resetEmployee">{{
      title
    }}</a>
    <a v-else href="#">{{ $t('obs.navigation_employee') }}</a>
  </li>
</template>

<script>
// Ported from vegetable/Vegetable.Obs/components/employeenavigation.vue —
// vegetable.web left this one untouched, still on string mutation names.
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useWizard } from '@/composables/wizard'

export default {
  name: 'ObsEmployeeNavigation',
  props: { index: { type: Number, default: 0 } },

  setup() {
    return { wizard: useWizard() }
  },

  computed: {
    ...mapStores(useBookingStore),
    title() {
      const employee = this.bookingStore.selectedEmployee
      return employee ? employee.firstName : this.$t('obs.navigation_employee')
    }
  },

  methods: {
    resetEmployee() {
      this.bookingStore.changeEmployee(null)
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
