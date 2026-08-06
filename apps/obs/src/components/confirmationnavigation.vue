<template>
  <li class="uk-text-center uk-text-truncate" @click.stop.prevent>
    <a href="#">{{ $t('obs.navigation_confirmation') }}</a>
  </li>
</template>

<script>
// Ported unchanged from vegetable/Vegetable.Obs/components/confirmationnavigation.vue —
// the last step has nothing to reset back to.
export default {
  name: 'ObsConfirmationNavigation',
  props: { index: { type: Number, default: 0 } }
}
</script>
