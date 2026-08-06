<template>
  <div class="obs-languages">
    <button class="uk-button uk-button-default" type="button">{{ bookingStore.locale }}</button>
    <div uk-dropdown="mode: click; pos: bottom-justify">
      <ul class="uk-nav uk-dropdown-nav">
        <li
          v-for="locale in bookingStore.locales"
          :key="locale"
          :class="{ 'uk-active': locale === bookingStore.locale }"
        >
          <a href="#" @click.prevent="bookingStore.changeLocale(locale)">{{ locale }}</a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
// Ported from vegetable.web/src/Frontend/ui/src/components/localization.vue.
//
// The original set `this.$i18n.locale` in the component *and* committed
// changeLocale to the store, leaving two copies of the same fact. The store
// action now owns both, plus moment's locale — which the old code set from
// date.vue's data() and a watcher, so a language change before the calendar
// mounted did not reach moment at all.
import { mapStores } from 'pinia'
import { useBookingStore } from '@/stores/booking'

export default {
  name: 'ObsLocalization',
  computed: {
    ...mapStores(useBookingStore)
  }
}
</script>

<style>
.obs-languages .uk-dropdown {
  min-width: 0%;
}
</style>
