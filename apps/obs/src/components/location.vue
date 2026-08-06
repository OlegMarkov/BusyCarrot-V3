<template>
  <li>
    <div>
      <h3 class="uk-text-center">{{ $t('obs.location_title') }}</h3>
      <div class="uk-child-width-1-3@m uk-grid-small uk-grid-match uk-flex-center" uk-grid>
        <div v-for="address in ownerStore.addresses" :key="address.id">
          <div
            class="uk-card uk-card-default uk-card-hover uk-card-body obs-location obs-card"
            @click="selectAddress(address)"
          >
            <div
              v-if="isSelected(address)"
              class="uk-card-badge uk-label uk-label-success"
            >
              {{ $t('obs.service_selected') }}
            </div>
            <h4 class="uk-margin-remove-bottom">{{ address.description || address.city }}</h4>
            <p class="uk-margin-remove-top">{{ format(address) }}</p>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

<script>
/*
 * There was nothing to port here: location.vue in both Vegetable.Obs and
 * vegetable.web is the placeholder `<li>address</li>`, and its one method
 * called `this.store.commit(...)` — missing the `$`, so it would have thrown
 * had anything called it.
 *
 * It is reachable, though: the wizard adds a 'location' step whenever an owner
 * has more than one address. In vegetable.web that step also had no component
 * registered against it, so it rendered as an unresolved
 * <component :is="'location'">. This gives the step the same card treatment the
 * service and employee steps use.
 */
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useOwnerStore } from '@/stores/owner'
import { useWizard } from '@/composables/wizard'

export default {
  name: 'ObsLocation',
  props: { index: { type: Number, default: 0 } },

  setup() {
    return { wizard: useWizard() }
  },

  computed: {
    ...mapStores(useBookingStore, useOwnerStore)
  },

  methods: {
    isSelected(address) {
      return this.bookingStore.selectedAddress?.id === address.id
    },

    format(address) {
      const parts = [
        address.city ? this.$t('obs.city') + address.city : '',
        address.street ? this.$t('obs.street') + address.street : '',
        address.unit
      ]
      return parts.filter(Boolean).join(', ')
    },

    selectAddress(address) {
      this.bookingStore.changeAddress(address)
      this.wizard.showStep(this.index + 1)
    }
  }
}
</script>

<style>
div.obs-location:hover {
  cursor: pointer;
}
</style>
