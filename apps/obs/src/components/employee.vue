<template>
  <li>
    <div>
      <h3 id="obs-employee-title" class="uk-text-center">{{ $t('obs.employee_title') }}</h3>
      <div class="uk-child-width-1-3@m uk-grid-small uk-grid-match uk-flex-center" uk-grid>
        <div v-for="employee in ownerStore.employees" :key="employee.id">
          <div
            class="uk-card uk-card-default uk-card-hover uk-card-body obs-employee obs-card"
            @click="selectEmployee(employee)"
          >
            <div
              v-if="bookingStore.selectedEmployee && bookingStore.selectedEmployee.id === employee.id"
              class="uk-card-badge uk-label uk-label-success"
            >
              {{ $t('obs.service_selected') }}
            </div>
            <div class="uk-grid-small uk-flex-middle" uk-grid>
              <div class="uk-width-auto">
                <img
                  class="uk-border-circle"
                  width="40"
                  height="40"
                  :src="employee.imageUrl || employeeImage"
                  alt=""
                />
              </div>
              <div class="uk-width-expand">
                <h4 class="uk-margin-remove-bottom">
                  {{ employee.firstName }} {{ employee.lastName }}
                </h4>
              </div>
            </div>
            <p v-if="employee.description">{{ employee.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

<script>
// Ported from vegetable.web/src/Frontend/ui/src/components/employee.vue.
//
// That copy could not have run: it committed the bare string 'changeEmployee',
// which had stopped being a mutation name when the store moved to the
// SET_EMPLOYEE constant, and its <img> src was `~/assets/...`, a webpack
// resolution that vue-cli did not apply to this project's config. Neither
// mattered in practice because PersonalPage never registered the component
// even though it pushed an 'employee' step.
//
// The "Lorem ipsum" placeholder paragraph is replaced by the employee's own
// description, shown only when the API returns one.
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useOwnerStore } from '@/stores/owner'
import { useWizard } from '@/composables/wizard'
import employeeImage from '@/assets/images/employee.jpg'

export default {
  name: 'ObsEmployee',
  props: { index: { type: Number, default: 0 } },

  setup() {
    return { wizard: useWizard(), employeeImage }
  },

  computed: {
    ...mapStores(useBookingStore, useOwnerStore)
  },

  methods: {
    selectEmployee(employee) {
      this.bookingStore.changeEmployee(employee)
      this.wizard.showStep(this.index + 1)
    }
  }
}
</script>

<style>
div.obs-employee:hover {
  cursor: pointer;
}
</style>
