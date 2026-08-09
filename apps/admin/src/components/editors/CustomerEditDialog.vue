<template>
  <app-dialog
    :model-value="modelValue"
    :title="customer.id ? t('clients.edit') : t('clients.new')"
    :can-save="isValid"
    @update:model-value="$emit('update:modelValue', $event)"
    @save="save"
  >
    <div class="form">
      <div class="form__row">
        <div class="field">
          <label>{{ t('clients.firstName') }}</label>
          <input v-model="customer.firstName" class="input" maxlength="50" />
          <div v-if="touched && errors.firstName" class="err">{{ t(errors.firstName) }}</div>
        </div>

        <div class="field">
          <label>{{ t('clients.lastName') }}</label>
          <input v-model="customer.lastName" class="input" maxlength="50" />
          <div v-if="touched && errors.lastName" class="err">{{ t(errors.lastName) }}</div>
        </div>
      </div>

      <div class="field">
        <label>{{ t('clients.phone') }}</label>
        <input v-model="customer.phone" class="input" maxlength="20" inputmode="tel" />
        <div v-if="touched && errors.phone" class="err">{{ t(errors.phone) }}</div>
      </div>

      <div class="field">
        <label>{{ t('clients.email') }}</label>
        <input v-model="customer.email" class="input" maxlength="100" inputmode="email" />
        <div v-if="touched && errors.email" class="err">{{ t(errors.email) }}</div>
      </div>

      <div class="field">
        <label>{{ t('clients.notes') }}</label>
        <textarea v-model="customer.notes" class="input" maxlength="500" rows="2" />
      </div>

      <label class="check">
        <input v-model="customer.sendConfirmationSms" type="checkbox" />
        <span>{{ t('clients.sendSms') }}</span>
      </label>
    </div>

    <template #actions>
      <button
        v-if="customer.id"
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
import { useCustomerStore } from '@/stores/customer'

/**
 * The admin app had no way to add or edit a client. ClientsPage rendered the
 * list and an "Add client" button with no handler behind it, and no editor
 * existed — so the button looked live and did nothing. This is that editor.
 *
 * Validation mirrors apps/mobile/src/validation/customer.js field for field,
 * because the same records are edited from both clients and it would be worse
 * for one of them to accept a name the other rejects. Implemented directly
 * rather than pulling validate.js into admin for four rules.
 *
 * Phone is not required: OwnerRepo stores an empty string when it is absent,
 * and walk-ins get recorded without one. It is still the field the API matches
 * on in CreateOrUpdateCustomer, so a client saved without one cannot later be
 * recognised as the same person.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  customerId: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { t } = useI18n()
const customers = useCustomerStore()

const NAME_PATTERN = /^[A-Za-zА-Яа-яЁё\s-]+$/
const PHONE_PATTERN = /^[0-9()+\s-]+$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const newCustomer = () => ({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  notes: '',
  sendConfirmationSms: false,
  isDeleted: false
})

const customer = ref(newCustomer())
const touched = ref(false)

const errors = computed(() => {
  const value = customer.value
  const result = {}

  const firstName = value.firstName?.trim() ?? ''
  if (!firstName) result.firstName = 'validation.required'
  else if (!NAME_PATTERN.test(firstName)) result.firstName = 'validation.onlyLetters'

  const lastName = value.lastName?.trim() ?? ''
  if (lastName && !NAME_PATTERN.test(lastName)) result.lastName = 'validation.onlyLetters'

  const phone = value.phone?.trim() ?? ''
  if (phone && !PHONE_PATTERN.test(phone)) result.phone = 'validation.format'

  const email = value.email?.trim() ?? ''
  if (email && !EMAIL_PATTERN.test(email)) result.email = 'validation.format'

  return result
})

const isValid = computed(() => Object.keys(errors.value).length === 0)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    touched.value = false

    // Seeded from the whole stored record, not a subset. The update endpoint
    // replaces the row, so fields this form does not show still have to travel
    // back — see the note on updateCustomer in the store.
    const existing = props.customerId ? customers.getCustomerById(props.customerId) : null
    customer.value = existing ? { ...existing } : newCustomer()
  }
)

function close() {
  emit('update:modelValue', false)
}

async function save() {
  touched.value = true
  if (!isValid.value) return

  if (customer.value.id) await customers.updateCustomer(customer.value.id, customer.value)
  else await customers.createCustomer(customer.value)

  emit('saved')
  close()
}

async function remove() {
  if (!customer.value.id) return
  await customers.deleteCustomer(customer.value.id)
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

.check {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font: 400 13px var(--font-body);
  cursor: pointer;
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

.dlg-btn--left {
  margin-right: auto;
}
</style>
