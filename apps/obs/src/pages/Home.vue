<template>
  <section class="uk-flex uk-flex-column uk-flex-center uk-flex-middle uk-height-viewport">
    <h1 class="uk-heading-medium">{{ t('home.title') }}</h1>
    <h2 class="uk-text-lead">{{ t('home.description') }}</h2>
  </section>
</template>

<script setup>
// Ported from vegetable/Vegetable.Obs/pages/index.vue. Reached only at the
// site root; a real visitor always arrives at /{alias}.
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
