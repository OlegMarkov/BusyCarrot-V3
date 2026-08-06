<template>
  <div v-if="ownerStore.loading" class="uk-flex uk-flex-center uk-flex-middle uk-height-viewport">
    <span uk-spinner="ratio: 2"></span>
  </div>

  <div
    v-else-if="ownerStore.error"
    class="uk-flex uk-flex-column uk-flex-center uk-flex-middle uk-height-viewport"
  >
    <h1 class="uk-heading-small">{{ $t('obs.alias_not_found') }}</h1>
    <p class="uk-text-meta">{{ alias }}</p>
  </div>

  <div v-else-if="owner">
    <div uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky">
      <nav class="uk-navbar-container" uk-navbar>
        <div class="uk-navbar-left">
          <ul class="uk-navbar-nav">
            <li class="uk-active">
              <a class="uk-text-lead" href="#">{{ owner.title }}</a>
            </li>
          </ul>
        </div>

        <div class="uk-navbar-right">
          <div class="uk-navbar-item">
            <a class="uk-button uk-button-secondary" href="#wizard" uk-toggle>
              {{ $t('obs.book_online') }}
            </a>
            <localization />
          </div>
        </div>
      </nav>
    </div>

    <div class="uk-flex-center" uk-grid>
      <div>
        <div class="uk-text-lead uk-margin">{{ owner.title }}</div>
        <div class="uk-text-uppercase">{{ owner.description }}</div>

        <div class="uk-margin">
          <a
            v-for="social in socialNetworks"
            :key="social.id"
            :href="social.href"
            class="uk-button uk-button-text uk-margin-small-right"
            target="_blank"
            rel="noopener"
            >{{ social.label }}</a
          >
        </div>

        <hr />

        <div class="uk-visible@s">
          <form class="uk-form-horizontal uk-margin-medium" @submit.prevent>
            <div v-if="phoneNumber" class="uk-margin">
              <label class="uk-form-label">{{ $t('obs.phone') }}</label>
              <div class="uk-form-controls">
                <p>{{ phoneNumber }}</p>
              </div>
            </div>
            <div v-if="address" class="uk-margin">
              <label class="uk-form-label">{{ $t('obs.address') }}</label>
              <div class="uk-form-controls">
                <p>{{ address }}</p>
                <a v-if="canShowMap" class="uk-button uk-button-text" href="#modal-map" uk-toggle>
                  {{ $t('obs.show_on_map') }}
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>

    <div class="uk-flex-center" uk-grid>
      <a class="uk-button uk-button-secondary" href="#wizard" uk-toggle>
        {{ $t('obs.book_online') }}
      </a>
    </div>

    <div class="uk-flex-center" uk-grid>
      <div
        class="uk-position-relative uk-visible-toggle uk-light uk-width-4-5"
        tabindex="-1"
        uk-slider="center: true"
      >
        <ul
          class="uk-slider-items uk-grid uk-grid-match"
          uk-height-viewport="offset-top: true; offset-bottom: 30"
        >
          <li v-for="(photo, photoIndex) in gallery" :key="photoIndex" class="uk-width-3-4">
            <div class="uk-cover-container">
              <img :src="photo" alt="" uk-cover />
            </div>
          </li>
        </ul>

        <a
          class="uk-position-center-left uk-position-small uk-hidden-hover"
          href="#"
          uk-slidenav-previous
          uk-slider-item="previous"
        ></a>
        <a
          class="uk-position-center-right uk-position-small uk-hidden-hover"
          href="#"
          uk-slidenav-next
          uk-slider-item="next"
        ></a>
      </div>
    </div>

    <div class="uk-flex-center" uk-grid>
      <ul class="uk-comment-list uk-width-1-2">
        <li v-for="service in ownerStore.services" :key="service.id" @click="selectService(service)">
          <article class="uk-comment uk-comment-primary uk-visible-toggle" tabindex="-1">
            <header class="uk-comment-header uk-position-relative">
              <div class="uk-grid-medium uk-flex-middle" uk-grid>
                <div class="uk-width-expand">
                  <h4 class="uk-comment-title uk-margin-remove">
                    <a class="uk-link-reset" href="#">{{ service.title }}</a>
                  </h4>
                  <p class="uk-comment-meta uk-margin-remove-top">
                    {{ service.durationInMinutes }} {{ $t('obs.minutes') }}
                  </p>
                </div>
              </div>
              <div class="uk-position-top-right uk-position-small">
                <span class="uk-link-muted">{{ service.cost }} {{ currencySymbol }}</span>
              </div>
            </header>
            <div class="uk-comment-body">
              <p>{{ service.description }}</p>
            </div>
          </article>
        </li>
      </ul>
    </div>

    <div v-if="canShowMap" id="modal-map" class="uk-modal-full" uk-modal>
      <div class="uk-modal-dialog uk-modal-body">
        <button class="uk-modal-close-default" type="button" uk-close></button>
        <h2 class="uk-modal-title">{{ address }} | {{ owner.title }}</h2>
        <div id="map" style="width: 87vw; height: 87vh"></div>
      </div>
    </div>

    <div id="wizard" uk-offcanvas="mode: none; overlay: true; flip: true;">
      <div class="uk-offcanvas-bar">
        <button class="uk-offcanvas-close" type="button" uk-close></button>

        <h3 class="uk-text-center">{{ $t('obs.book_online') }}</h3>
        <p class="uk-text-center">{{ owner.title }}</p>

        <div>
          <ul uk-accordion class="uk-hidden@s">
            <li>
              <a class="uk-accordion-title" href="#"></a>
              <div class="uk-accordion-content">
                <ul
                  class="obs-tab-right"
                  uk-tab="swiping: false; animation: uk-animation-slide-right-small; connect: .uk-switcher"
                >
                  <component
                    :is="`${step}navigation`"
                    v-for="(step, stepIndex) in bookingStore.steps"
                    :key="step"
                    :index="stepIndex"
                  />
                </ul>
              </div>
            </li>
          </ul>

          <ul
            id="steps"
            class="uk-visible@s"
            :class="navigationClass"
            uk-tab="swiping: false; animation: uk-animation-slide-right-small; connect: .uk-switcher"
          >
            <component
              :is="`${step}navigation`"
              v-for="(step, stepIndex) in bookingStore.steps"
              :key="step"
              :index="stepIndex"
            />
          </ul>

          <ul uk-switcher="swiping: false" class="uk-switcher uk-margin">
            <component
              :is="step"
              v-for="(step, stepIndex) in bookingStore.steps"
              :key="step"
              :index="stepIndex"
            />
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/*
 * Ported from vegetable.web/src/Frontend/ui/src/PersonalPage.vue.
 *
 * Changes beyond the mechanical Vuex -> Pinia one:
 *
 *  - The alias comes from the route, not from a hidden <div id="moniker"> the
 *    ASP.NET host rendered (see src/router/index.js).
 *  - All five step components are registered. The original registered only
 *    service, date and confirmation while still pushing 'location' and
 *    'employee' steps for owners with more than one of either, which rendered
 *    as unresolved dynamic components.
 *  - `navigationClass` was hardcoded to `uk-child-width-1-3` with the real
 *    expression commented out beside it, so a wizard with four or five steps
 *    laid its tabs out three to a row.
 *  - The map is loaded through plugins/maps.js, guarded on a configured key.
 *    The original called `ymaps.ready(...)` unconditionally inside the owner
 *    fetch, and its host page never loaded the Yandex script — so that line
 *    threw a ReferenceError on every page view, inside a promise nobody
 *    awaited.
 *  - The social links were three near-identical <a> blocks matched on numeric
 *    type, with the URL built as 'http://' + url; that downgrades any link the
 *    owner saved with a scheme (it becomes http://https://...). Table-driven
 *    and scheme-preserving here.
 */
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'
import { useOwnerStore } from '@/stores/owner'
import { useWizard } from '@/composables/wizard'
import { isMapConfigured, loadMaps, parsePoints } from '@/plugins/maps'

import ObsLocalization from '@/components/localization.vue'
import location from '@/components/location.vue'
import locationnavigation from '@/components/locationnavigation.vue'
import service from '@/components/service.vue'
import servicenavigation from '@/components/servicenavigation.vue'
import employee from '@/components/employee.vue'
import employeenavigation from '@/components/employeenavigation.vue'
import date from '@/components/date.vue'
import datenavigation from '@/components/datenavigation.vue'
import confirmation from '@/components/confirmation.vue'
import confirmationnavigation from '@/components/confirmationnavigation.vue'

import photo from '@/assets/images/photo.jpg'
import dark from '@/assets/images/dark.jpg'
import light from '@/assets/images/light.jpg'
import photo2 from '@/assets/images/photo2.jpg'
import photo3 from '@/assets/images/photo3.jpg'

// SocialNetwork.type as stored by Vegetable.API; the labels match what the
// owner-side apps show.
const SOCIAL_NETWORKS = {
  1: 'facebook',
  2: 'linkedin',
  3: 'twitter',
  5: 'youtube',
  8: 'vk',
  10: 'pinterest',
  11: 'instagram'
}

export default {
  name: 'PersonalPage',

  components: {
    localization: ObsLocalization,
    location,
    locationnavigation,
    service,
    servicenavigation,
    employee,
    employeenavigation,
    date,
    datenavigation,
    confirmation,
    confirmationnavigation
  },

  props: { alias: { type: String, required: true } },

  setup() {
    return { wizard: useWizard(), gallery: [photo, dark, light, photo2, photo3] }
  },

  computed: {
    ...mapStores(useBookingStore, useOwnerStore),

    owner() {
      return this.ownerStore.owner
    },

    currencySymbol() {
      return this.owner?.currency?.symbol ?? ''
    },

    phoneNumber() {
      return this.owner?.phoneNumbers?.[0]?.number ?? ''
    },

    address() {
      const address = this.ownerStore.primaryAddress
      if (!address) return ''
      const parts = [
        address.city ? this.$t('obs.city') + address.city : '',
        address.street ? this.$t('obs.street') + address.street : '',
        address.unit
      ]
      return parts.filter(Boolean).join(', ')
    },

    coordinates() {
      return parsePoints(this.ownerStore.primaryAddress?.points)
    },

    canShowMap() {
      return isMapConfigured() && Boolean(this.coordinates)
    },

    socialNetworks() {
      return (this.owner?.socialNetworks ?? [])
        .filter((social) => SOCIAL_NETWORKS[social.type] && social.url)
        .map((social) => ({
          id: social.id,
          label: SOCIAL_NETWORKS[social.type],
          href: /^https?:\/\//i.test(social.url) ? social.url : `http://${social.url}`
        }))
    },

    navigationClass() {
      return `uk-child-width-1-${this.bookingStore.steps.length || 1}`
    }
  },

  async created() {
    const owner = await this.ownerStore.fetchOwner(this.alias)
    if (owner) this.bookingStore.buildSteps(owner)
  },

  methods: {
    // Tapping a service on the landing page selects it and opens the wizard.
    selectService(service) {
      if (!this.bookingStore.isServiceSelected(service)) {
        this.bookingStore.toggleService(service)
      }
      this.wizard.showOffcanvas('#wizard')
    },

    async renderMap() {
      if (!this.canShowMap) return
      try {
        const ymaps = await loadMaps(this.bookingStore.locale === 'ru' ? 'ru_RU' : 'en_US')
        const map = new ymaps.Map('map', { center: this.coordinates, zoom: 13 })
        map.geoObjects.add(
          new ymaps.Placemark(
            this.coordinates,
            { balloonContent: this.owner.title, iconCaption: this.owner.title },
            { preset: 'islands#greenDotIconWithCaption' }
          )
        )
      } catch (error) {
        console.warn('[obs] map unavailable:', error.message)
      }
    }
  },

  watch: {
    // The map container only exists once the owner has rendered, and Yandex
    // needs a laid-out element to measure.
    canShowMap: {
      immediate: true,
      handler(value) {
        if (value) this.$nextTick(() => this.renderMap())
      }
    }
  }
}
</script>

<style scoped>
@media (min-width: 960px) {
  .uk-offcanvas-bar {
    width: 50%;
  }
}
</style>

<style>
.obs-card {
  border: 1px solid #e5e5e5;
}

#steps > li > a.obs-tab-link {
  color: #1e87f0;
}

#steps > li > a.obs-tab-link:hover {
  color: #0f6ecd;
  text-decoration: underline;
}

.obs-tab-right::before {
  top: 0;
  bottom: 0;
  left: 0;
  right: auto;
  border-left: 1px solid #e5e5e5;
  border-bottom: none;
}

.uk-accordion-title::after {
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20ratio%3D%221%22%3E%20%3Cpolyline%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%221.03%22%20points%3D%2216%207%2010%2013%204%207%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
}

.uk-open > .uk-accordion-title::after {
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2230%22%20height%3D%2230%22%20viewBox%3D%220%200%2020%2020%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20ratio%3D%221%22%3E%20%3Cpolyline%20fill%3D%22none%22%20stroke%3D%22%23000%22%20stroke-width%3D%221.03%22%20points%3D%224%2013%2010%207%2016%2013%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
}

@media (max-width: 640px) {
  .obs-tab-right {
    flex-direction: column;
    margin-left: 0;
  }

  .obs-tab-right > * {
    padding-left: 0;
  }

  .obs-tab-right > * > a {
    text-align: left;
    border-left: 1px solid transparent;
    border-bottom: none;
  }

  .uk-tab > * > a {
    text-transform: none;
    font-size: 1rem;
  }
}
</style>
