<template>
  <section class="splash">
    <h1>{{ t('home.title') }}</h1>
    <p class="text-muted">{{ t('home.description') }}</p>
  </section>
</template>

<script setup>
// Ported from vegetable/Vegetable.Obs/pages/index.vue. Reached only at the
// site root; a real visitor always arrives at /{alias}.
//
// Restyled off UIkit's flex/heading utilities onto the Organic tokens when the
// redesign removed UIkit from obs.
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.splash {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  text-align: center;
  padding: var(--space-8) var(--space-4);
}
</style>
