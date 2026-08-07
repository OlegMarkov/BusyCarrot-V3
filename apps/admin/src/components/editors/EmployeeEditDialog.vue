<template>
  <app-dialog
    :model-value="modelValue"
    :title="isNew ? t('employee.new') : t('employee.edit')"
    :can-save="isValid"
    @update:model-value="$emit('update:modelValue', $event)"
    @save="save"
  >
    <div v-if="loading" class="loading">{{ t('common.loading') }}</div>

    <div v-else class="form">
      <div class="form__identity">
        <!--
          The design shows a person as framed initials. A photograph goes in the
          same frame rather than beside it, so the square stays the square.
        -->
        <avatar-picker v-model="employee.avatar" :initials="initials" />
        <div class="form__names">
          <div class="field">
            <label>{{ t('employee.firstName') }}</label>
            <input v-model="employee.firstName" class="input" maxlength="50" />
            <div v-if="touched && !employee.firstName" class="err">
              {{ t('validation.required') }}
            </div>
          </div>
          <div class="field">
            <label>{{ t('employee.lastName') }}</label>
            <input v-model="employee.lastName" class="input" maxlength="50" />
          </div>
        </div>
      </div>

      <div class="form__row">
        <div class="field">
          <label>{{ t('employee.phone') }}</label>
          <input v-model="employee.phone" class="input" />
        </div>
        <div class="field">
          <label>{{ t('employee.email') }}</label>
          <input v-model="employee.email" class="input" type="email" />
        </div>
      </div>

      <div class="field">
        <label>{{ t('employee.color') }}</label>
        <color-selector v-model="currentColor" />
      </div>

      <div class="field">
        <label>{{ t('employee.services') }}</label>
        <div class="opts">
          <label
            v-for="service in availableServices"
            :key="service.id"
            class="opt"
            @click.prevent="toggleService(service.id)"
          >
            <span class="opt__box" :class="{ 'opt__box--on': selectedServiceIds.includes(service.id) }">
              <lucide-icon v-if="selectedServiceIds.includes(service.id)" name="check" :size="12" />
            </span>
            <span class="opt__title">{{ service.title }}</span>
            <span class="opt__min">{{ service.durationInMinutes }} {{ t('calendar.min') }}</span>
          </label>
        </div>
      </div>
    </div>

    <template #actions>
      <button
        v-if="!isNew"
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
import AvatarPicker from '@/components/elements/AvatarPicker.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { apiClient } from '@/plugins/api'
import { useEmployeeStore } from '@/stores/employee'
import { useServiceStore } from '@/stores/service'

/**
 * Rebuilt from components/actions-panel/employee/EmployeeEdit.vue on the
 * Industry dialog. The save shape is carried over exactly — `employeeServices`
 * is rebuilt from the ticked ids as `{ service, employee }` links, which is
 * what Vegetable.API expects.
 *
 * Dropped with Vuetify: the fourteen per-field skeleton loaders (one plain
 * "loading" line now).
 *
 * The avatar came back as elements/AvatarPicker.vue, which crops on a canvas
 * rather than through `vue-advanced-cropper` — one field in one dialog did not
 * justify taking the dependency back. It writes the same thing the old editor
 * did: a data URL in `employee.avatar`.
 */
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  employeeId: { type: String, default: null }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { t } = useI18n()
const employees = useEmployeeStore()
const services = useServiceStore()

const employee = ref({})
const selectedServiceIds = ref([])
const loading = ref(true)
const touched = ref(false)

const isNew = computed(() => !employee.value.id || employee.value.id === EMPTY_GUID)
const isValid = computed(() => Boolean(employee.value.firstName?.trim()))

const availableServices = computed(() => services.activeServices ?? [])

const currentColor = computed({
  get: () => employee.value.color || 'red',
  set: (value) => {
    employee.value.color = value
  }
})

const initials = computed(
  () =>
    (employee.value.firstName?.charAt(0) ?? '') + (employee.value.lastName?.charAt(0) ?? '')
)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) {
      employee.value = {}
      selectedServiceIds.value = []
      loading.value = true
      return
    }
    touched.value = false
    await fetchEmployee(props.employeeId)
  }
)

async function fetchEmployee(id) {
  loading.value = true
  try {
    if (!id || id === EMPTY_GUID) {
      employee.value = { color: 'red' }
      selectedServiceIds.value = []
      return
    }
    const { data } = await apiClient.EmployeesService.get(id)
    employee.value = JSON.parse(JSON.stringify(data))
    selectedServiceIds.value = (data.employeeServices || [])
      .map((link) => link.service?.id)
      .filter(Boolean)
  } finally {
    loading.value = false
  }
}

function toggleService(id) {
  const index = selectedServiceIds.value.indexOf(id)
  if (index > -1) selectedServiceIds.value.splice(index, 1)
  else selectedServiceIds.value.push(id)
}

function close() {
  emit('update:modelValue', false)
}

async function save() {
  touched.value = true
  if (!isValid.value) return

  const record = { ...employee.value }
  delete record.employeeServices

  record.employeeServices = selectedServiceIds.value
    .map((id) => availableServices.value.find((service) => service.id === id))
    .filter(Boolean)
    .map((service) => ({ service, employee: record }))

  if (isNew.value) await employees.createEmployee(record)
  else await employees.updateEmployee(record.id, record)

  emit('saved')
  close()
}

async function remove() {
  if (isNew.value) return
  await employees.deleteEmployee(employee.value.id)
  emit('saved')
  close()
}
</script>

<style scoped>
.loading {
  padding: 24px 0;
  font: 400 12px var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.form__identity {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}

.form__names {
  flex: 1;
  display: flex;
  gap: var(--space-3);
}

.form__names .field {
  flex: 1;
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

.initials {
  width: 52px;
  height: 52px;
  flex: none;
  margin-top: 18px;
  border: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 17px var(--font-heading);
  color: var(--color-accent-700);
}

.opts {
  display: flex;
  flex-direction: column;
}

.opt {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 40px;
  padding: 6px 2px;
  cursor: pointer;
  border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
}

.opt__box {
  width: 17px;
  height: 17px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
}

.opt__box--on {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-bg);
}

.opt__title {
  flex: 1;
  font: 600 13.5px var(--font-heading);
}

.opt__min {
  font: 400 11px var(--font-body);
  color: var(--color-neutral-600);
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
