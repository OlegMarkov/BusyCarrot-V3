<template>
  <app-dialog
    :model-value="modelValue"
    :title="t('settings.company')"
    :can-save="canSave"
    @update:model-value="$emit('update:modelValue', $event)"
    @save="save"
  >
    <div class="form">
      <div v-if="error" class="form__error">{{ error }}</div>

      <label class="field">
        <span class="field__label">{{ t('settings.title') }}</span>
        <input v-model="draft.title" class="input" maxlength="50" />
      </label>

      <label class="field">
        <span class="field__label">{{ t('settings.description') }}</span>
        <input v-model="draft.description" class="input" maxlength="500" />
      </label>

      <label class="field">
        <span class="field__label">{{ t('settings.alias') }}</span>
        <input v-model="draft.alias" class="input" maxlength="50" />
        <span class="field__hint">{{ obsBase }}{{ draft.alias || '…' }}</span>
      </label>

      <label class="field">
        <span class="field__label">{{ t('settings.currency') }}</span>
        <select v-model="currencyId" class="input">
          <option v-for="option in currencies" :key="option.id" :value="option.id">
            {{ option.currencyCode }} {{ option.symbol }}
          </option>
        </select>
      </label>

      <div class="field field--row">
        <span
          class="check"
          :class="{ 'check--on': draft.allowSite }"
          @click="draft.allowSite = !draft.allowSite"
        >
          <lucide-icon v-if="draft.allowSite" name="check" :size="12" />
        </span>
        <span class="check__label" @click="draft.allowSite = !draft.allowSite">
          {{ t('settings.allowSite') }}
        </span>
      </div>

      <!-- addresses -->
      <div class="section">
        <div class="section__head">
          <span class="field__label">{{ t('settings.addresses') }}</span>
          <button class="btn btn-secondary section__add" type="button" @click="addAddress">
            {{ t('settings.addAddress') }}
          </button>
        </div>

        <div v-for="(address, index) in draft.addresses" :key="index" class="blueprint address">
          <i class="corner tl" /><i class="corner tr" /><i class="corner bl" /><i class="corner br" />

          <div class="address__grid">
            <label class="field">
              <span class="field__label">{{ t('settings.addrDescription') }}</span>
              <input v-model="address.description" class="input" maxlength="50" />
            </label>
            <label class="field">
              <span class="field__label">{{ t('settings.addrCity') }}</span>
              <input v-model="address.city" class="input" maxlength="30" />
            </label>
            <label class="field">
              <span class="field__label">{{ t('settings.addrState') }}</span>
              <input v-model="address.state" class="input" maxlength="50" />
            </label>
            <label class="field">
              <span class="field__label">{{ t('settings.addrPostal') }}</span>
              <input v-model="address.postalCode" class="input" maxlength="10" />
            </label>
            <label class="field">
              <span class="field__label">{{ t('settings.addrStreet') }}</span>
              <input v-model="address.street" class="input" maxlength="50" />
            </label>
            <label class="field">
              <span class="field__label">{{ t('settings.addrUnit') }}</span>
              <input v-model="address.unit" class="input" maxlength="50" />
            </label>
          </div>

          <button class="btn btn-secondary address__remove" type="button" @click="removeAddress(index)">
            {{ t('common.delete') }}
          </button>
        </div>

        <div v-if="!draft.addresses.length" class="empty">{{ t('settings.noAddresses') }}</div>
      </div>
    </div>
  </app-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/components/ui/AppDialog.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import config from '@/config'
import { apiClient } from '@/plugins/api'
import { useOwnerStore } from '@/stores/owner'
import { useSettingsStore } from '@/stores/settings'

/**
 * The owner's company details.
 *
 * Vegetable.Admin had this as `actions-panel/general-settings.vue`, a fullscreen
 * Vuetify dialog. The desktop redesign dropped it and left the Settings page
 * able to *show* these values but not change them — this restores the editing.
 *
 * Same field set as the original: name, description, alias, currency, the
 * publish switch and the address list. It never edited phone numbers or social
 * links, and neither does this.
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const owner = useOwnerStore()
const settings = useSettingsStore()

const blank = () => ({
  title: '',
  description: '',
  alias: '',
  allowSite: false,
  currency: null,
  addresses: []
})

const draft = ref(blank())
const currencies = computed(() => settings.currencies ?? [])
const obsBase = computed(() => (config.ObsBaseUrl || '').replace(/^https?:\/\//, ''))

/** The select binds an id; the API wants the whole currency object back. */
const currencyId = computed({
  get: () => draft.value.currency?.id ?? null,
  set: (id) => {
    draft.value.currency = currencies.value.find((c) => c.id === id) ?? null
  }
})

const canSave = computed(
  () => Boolean(draft.value.title?.trim()) && Boolean(draft.value.alias?.trim())
)

/**
 * Re-seed on open, and deep-copy: the addresses are edited in place, and
 * binding them straight to the store would rewrite the owner record as the
 * user types, cancel or not.
 */
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    const record = owner.owner ?? {}
    draft.value = {
      ...blank(),
      ...JSON.parse(JSON.stringify(record)),
      addresses: JSON.parse(JSON.stringify(record.addresses ?? []))
    }
    if (!currencies.value.length) settings.fetchCurrencies()
  }
)

function addAddress() {
  draft.value.addresses.push({
    description: '',
    state: '',
    city: '',
    postalCode: '',
    street: '',
    unit: ''
  })
}

function removeAddress(index) {
  draft.value.addresses.splice(index, 1)
}

const error = ref('')

async function save() {
  if (!canSave.value) return
  error.value = ''
  try {
    const response = await apiClient.OwnerService.update(draft.value)
    // `owner/information` answers 200 with an empty body, so there is nothing
    // to read back — the draft is what was stored. Guard on a *non-empty* body
    // rather than on nullish, or an empty string wins the `??` and the store
    // ends up holding ''.
    const stored = response?.data && Object.keys(response.data).length ? response.data : draft.value
    owner.setOwner(stored)
    emit('update:modelValue', false)
  } catch (e) {
    // Without this the dialog just sat there on a failure with nothing said.
    error.value = e?.message || String(e)
    console.error('Failed to save the owner', e)
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form__error {
  padding: 9px 11px;
  border: 1px solid rgba(143, 71, 65, 0.4);
  font: 400 12px/1.4 var(--font-body);
  color: #8f4741;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field--row {
  flex-direction: row;
  align-items: center;
  gap: 9px;
}

.field__label {
  font: 400 9.5px/1 var(--font-body);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.field__hint {
  font: 400 11.5px/1.3 var(--font-body);
  color: var(--color-neutral-600);
}

.check {
  width: 17px;
  height: 17px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
  cursor: pointer;
  color: var(--color-bg);
}

.check--on {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.check__label {
  font: 400 13px/1.3 var(--font-body);
  cursor: pointer;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 6px;
  border-top: 1px solid var(--color-divider);
}

.section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section__add {
  min-height: 32px;
  padding: 0 12px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.address {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.address__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.address__remove {
  align-self: flex-start;
  min-height: 32px;
  padding: 0 12px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.empty {
  padding: 18px 0;
  text-align: center;
  font: 400 12px var(--font-body);
  color: var(--color-neutral-600);
}

@media (max-width: 1023.98px) {
  .address__grid {
    grid-template-columns: 1fr;
  }
}
</style>
