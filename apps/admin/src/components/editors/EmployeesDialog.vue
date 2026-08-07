<template>
  <app-dialog
    :model-value="modelValue"
    :title="t('settings.employees')"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="list">
      <div v-for="employee in list" :key="employee.id" class="row" @click="edit(employee.id)">
        <!-- The photograph fills the same square the initials occupy. -->
        <div class="row__initials">
          <img v-if="employee.avatar" :src="employee.avatar" class="row__avatar" alt="" />
          <template v-else>{{ initialsOf(employee) }}</template>
        </div>
        <div class="row__main">
          <div class="row__name">{{ nameOf(employee) }}</div>
          <div class="row__note">{{ employee.phone || employee.email || '—' }}</div>
        </div>
        <lucide-icon name="chevron-right" :size="15" class="row__chevron" />
      </div>

      <div v-if="!list.length" class="empty">{{ t('employee.none') }}</div>
    </div>

    <template #actions>
      <button class="btn btn-secondary dlg-btn dlg-btn--left" type="button" @click="edit(null)">
        {{ t('employee.add') }}
      </button>
      <button class="btn btn-secondary dlg-btn" type="button" @click="close">
        {{ t('common.close') }}
      </button>
    </template>
  </app-dialog>

  <employee-edit-dialog
    v-model="editing"
    :employee-id="editingId"
    @saved="$emit('saved')"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/components/ui/AppDialog.vue'
import EmployeeEditDialog from '@/components/editors/EmployeeEditDialog.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { useEmployeeStore } from '@/stores/employee'

/**
 * The employee roster.
 *
 * The desktop design has no employees section — it shows an "Employees" row in
 * Settings with a count and a chevron, and stops there. This is the smallest
 * thing that makes that row lead somewhere: the list behind it, and the editor
 * behind each entry, both in the system's own dialog. It replaces the old
 * actions-panel `EmployeesList` + `EmployeeInList` pair.
 */
defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'saved'])

const { t } = useI18n()
const employees = useEmployeeStore()

const editing = ref(false)
const editingId = ref(null)

const list = computed(() => employees.activeEmployees ?? [])

const nameOf = (employee) =>
  [employee.firstName, employee.lastName].filter(Boolean).join(' ') || '—'

const initialsOf = (employee) =>
  [employee.firstName, employee.lastName]
    .filter(Boolean)
    .map((part) => part.trim().charAt(0).toUpperCase())
    .join('') || '—'

function edit(id) {
  editingId.value = id
  editing.value = true
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 2px;
  cursor: pointer;
  border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
}

.row:hover {
  background: color-mix(in srgb, var(--color-text) 4%, transparent);
}

.row__initials {
  width: 34px;
  height: 34px;
  flex: none;
  border: 1px solid var(--color-divider);
  display: flex;
  align-items: center;
  justify-content: center;
  font: 600 12px var(--font-heading);
  color: var(--color-accent-700);
  overflow: hidden;
}

.row__avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.row__main {
  flex: 1;
  min-width: 0;
}

.row__name {
  font: 600 14px/1.2 var(--font-heading);
}

.row__note {
  font: 400 11px/1.4 var(--font-body);
  color: var(--color-neutral-600);
}

.row__chevron {
  color: var(--color-neutral-500);
}

.empty {
  padding: 24px 0;
  text-align: center;
  font: 400 11.5px var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
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
