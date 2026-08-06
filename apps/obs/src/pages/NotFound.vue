<template>
  <section class="uk-flex uk-flex-column uk-flex-center uk-flex-middle uk-height-viewport">
    <h1 class="uk-heading-medium">404</h1>
    <p class="uk-text-lead">{{ t('obs.alias_not_found') }}</p>
  </section>
</template>

<script setup>
// Ported from vegetable/Vegetable.Obs/pages/404.vue, whose heading was the
// hardcoded English string "Alias not found - 404".
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
