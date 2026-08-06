<template>
  <app-dialog
    :model-value="modelValue"
    :title="service.id ? t('services.edit') : t('services.new')"
    :can-save="isValid"
    @update:model-value="$emit('update:modelValue', $event)"
    @save="save"
  >
    <div class="form">
      <div class="field">
        <label>{{ t('services.title') }}</label>
        <input v-model="service.title" class="input" maxlength="50" />
        <div v-if="touched && !service.title" class="err">{{ t('validation.required') }}</div>
      </div>

      <div class="field">
        <label>{{ t('services.description') }}</label>
        <textarea v-model="service.description" class="input" maxlength="200" rows="2" />
      </div>

      <div class="form__row">
        <div class="field">
          <label>{{ t('services.duration') }}</label>
          <select v-model.number="service.durationInMinutes" class="input">
            <option v-for="minutes in DURATIONS" :key="minutes" :value="minutes">
              {{ minutes }} {{ t('calendar.min') }}
            </option>
          </select>
          <div v-if="touched && !service.durationInMinutes" class="err">
            {{ t('validation.required') }}
          </div>
        </div>

        <div class="field">
          <label>{{ t('services.cost') }}</label>
          <input v-model.number="service.cost" class="input" type="number" min="0" />
        </div>
      </div>

      <div class="field">
        <label>{{ t('services.color') }}</label>
        <color-selector v-model="service.color" />
      </div>
    </div>

    <template #actions>
      <button
        v-if="service.id"
        class="btn btn-secondary btn-danger dlg-btn dlg-btn--left"
        type="button"
        @click="remove"
      >
        {{ t('common.delete') }}
      </button>
      <button class="btn btn-secondary dlg-btn" type="button" @click="close">
        {{ t('common.cancel') }}
      </button>
      <button class="btn btn-primary dlg-btn" type="button" :disabled="!isValid" @click="save">
        {{ t('common.save') }}
      </button>
    </template>
  </app-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/components/ui/AppDialog.vue'
import ColorSelector from '@/components/elements/ColorSelector.vue'
import { useServiceStore } from '@/stores/service'

/**
 * Rebuilt from components/actions-panel/service/ServiceEdit.vue on the Industry
 * dialog. The logic is carried over unchanged, including the two fixes the Vue 3
 * port made: the default is a factory rather than a module-level object two
 * dialogs could scribble on, and the draft is re-seeded every time the dialog
 * opens so reopening it for a different service does not show the previous one.
 *
 * Validation was Vuetify's `v-form` + rules; it is an explicit `isValid` here,
 * with messages shown only once the user has tried to save.
 */
const DURATIONS = [15, 30, 45, 60, 90, 120]

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  serviceId: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { t } = useI18n()
const services = useServiceStore()

const newService = () => ({
  durationInMinutes: 30,
  title: '',
  description: '',
  cost: 0,
  usersCount: 1,
  currencyCode: '',
  color: 'red'
})

const service = ref(newService())
const touched = ref(false)

const isValid = computed(
  () => Boolean(service.value.title?.trim()) && Number(service.value.durationInMinutes) > 0
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    touched.value = false
    const existing = props.serviceId ? services.getServiceById(props.serviceId) : null
    service.value = existing ? { ...existing } : newService()
  }
)

function close() {
  emit('update:modelValue', false)
}

async function save() {
  touched.value = true
  if (!isValid.value) return

  if (service.value.id) await services.updateService(service.value.id, service.value)
  else await services.createService(service.value)

  emit('saved')
  close()
}

async function remove() {
  if (!service.value.id) return
  await services.deleteService(service.value.id)
  emit('saved')
  close()
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.form__row {
  display: flex;
  gap: var(--space-3);
}

.form__row .field {
  flex: 1;
}

.field {
  margin-bottom: 0;
}

.err {
  font: 400 11px var(--font-body);
  color: #8f4741;
  margin-top: 4px;
}

.dlg-btn {
  min-height: 40px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 11px;
}

/* Destructive action sits away from the confirming pair. */
.dlg-btn--left {
  margin-right: auto;
}
</style>
