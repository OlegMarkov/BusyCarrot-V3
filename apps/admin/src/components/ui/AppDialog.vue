<template>
  <teleport to="body">
    <div v-if="modelValue" class="dialog-backdrop" @click.self="close">
      <div class="dialog app-dialog" role="dialog" aria-modal="true">
        <div class="app-dialog__head">
          <div class="dialog-title app-dialog__title">{{ title }}</div>
          <button class="app-dialog__close" type="button" @click="close">
            <lucide-icon name="close" :size="14" />
          </button>
        </div>

        <div class="app-dialog__body">
          <slot />
        </div>

        <div class="dialog-actions app-dialog__actions">
          <slot name="actions">
            <button class="btn btn-secondary app-dialog__btn" type="button" @click="close">
              {{ t('common.cancel') }}
            </button>
            <button
              class="btn btn-primary app-dialog__btn"
              type="button"
              :disabled="!canSave"
              @click="$emit('save')"
            >
              {{ saveLabel || t('common.save') }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import LucideIcon from '@/components/ui/LucideIcon.vue'

/**
 * The modal every editor uses, built on the design system's own
 * `.dialog-backdrop` / `.dialog` pair — square, hairline-bordered, at the top
 * elevation. Replaces Vuetify's `v-dialog`.
 *
 * Teleported to `<body>` so a dialog opened from deep inside the shell is not
 * trapped by the shell's `overflow: hidden`.
 */
defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  saveLabel: { type: String, default: '' },
  canSave: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'save'])
const { t } = useI18n()

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.app-dialog {
  width: min(560px, 100%);
  max-height: 86vh;
}

.app-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.app-dialog__title {
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 16px;
}

.app-dialog__close {
  width: 30px;
  height: 30px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid var(--color-divider);
  background: transparent;
  color: inherit;
}

.app-dialog__close:hover {
  background: color-mix(in srgb, var(--color-text) 7%, transparent);
}

.app-dialog__body {
  overflow: auto;
  padding: var(--space-2) 0;
}

.app-dialog__actions {
  border-top: 1px solid var(--color-divider);
  padding-top: var(--space-3);
}

.app-dialog__btn {
  min-height: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 11px;
}

/* ──────────────────────────────────────────────────────────────────────────
   Below 1024px the editors present as bottom sheets, the same way the
   calendar's rail does — the design's mobile container for a modal.
   Scoped styles cannot reach the teleported backdrop's own rules, so the
   backdrop is realigned from :deep() on the element this component owns.
   ────────────────────────────────────────────────────────────────────────── */
@media (max-width: 1023.98px) {
  .app-dialog {
    width: 100%;
    max-width: none;
    max-height: 88vh;
    max-height: 88dvh;
    margin: 0;
    border-bottom: 0;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
}
</style>

<style>
/* Unscoped: `.dialog-backdrop` comes from the design system's stylesheet and is
   teleported outside this component's tree, so a scoped rule would not apply.
   Kept to the one property that has to change — how the panel is parked. */
@media (max-width: 1023.98px) {
  .dialog-backdrop {
    align-items: flex-end;
    padding: 0;
  }
}
</style>
