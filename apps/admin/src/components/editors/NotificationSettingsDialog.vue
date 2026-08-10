<template>
  <app-dialog
    :model-value="modelValue"
    :title="t('settings.notifications')"
    :can-save="!loading && !saving"
    @update:model-value="$emit('update:modelValue', $event)"
    @save="save"
  >
    <div class="form">
      <div v-if="error" class="form__error">{{ error }}</div>

      <div v-if="loading" class="form__loading">{{ t('common.loading') }}</div>

      <template v-else>
        <div class="field field--row">
          <span
            class="check"
            :class="{ 'check--on': draft.allowNotifications }"
            @click="draft.allowNotifications = !draft.allowNotifications"
          >
            <lucide-icon v-if="draft.allowNotifications" name="check" :size="12" />
          </span>
          <span class="check__label" @click="draft.allowNotifications = !draft.allowNotifications">
            {{ t('settings.allowNotifications') }}
          </span>
        </div>

        <label class="field">
          <span class="field__label">{{ t('settings.dailyTime') }}</span>
          <input
            v-model="dailyTime"
            type="time"
            step="60"
            class="input"
            :disabled="!draft.allowNotifications"
          />
          <span class="field__hint">{{ t('settings.dailyTimeNote') }}</span>
        </label>
      </template>
    </div>
  </app-dialog>
</template>

<script setup>
/**
 * The owner's notification preferences — a toggle and the time of the daily
 * digest. These live on the User record, not the Owner: Vegetable.Admin never
 * had this screen at all, but the mobile app does
 * (pages/settings/notification/settings.nvue), editing exactly these two fields
 * and saving through the same PUT owner/user.
 *
 * The Settings page showed a "notifications" row that did nothing; this is what
 * it opens.
 */
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '@/components/ui/AppDialog.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import { apiClient } from '@/plugins/api'
import { useSessionStore } from '@/stores/session'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
const session = useSessionStore()

const loading = ref(false)
const saving = ref(false)
const error = ref('')

/**
 * The whole fetched User, not just the two fields shown. PUT owner/user is a
 * full replace — OwnerRepo.UpdateUser calls `_context.User.Update(user)` — so
 * anything omitted would be written back as its default. Holding the record
 * lets save() send it back intact with only these two changed, the same as the
 * client-editor and reservation-edit paths.
 */
const record = ref(null)
const draft = ref({ allowNotifications: true, dailyNotificationTime: '09:00:00' })

/**
 * The API stores DailyNotificationTime as a TimeSpan, which Newtonsoft
 * serialises as "HH:mm:ss". `<input type="time">` wants "HH:mm". Convert both
 * ways, and default an empty/invalid value to 09:00 rather than showing blank.
 */
const dailyTime = computed({
  get: () => {
    const value = draft.value.dailyNotificationTime || '09:00:00'
    const [h, m] = String(value).split(':')
    return `${(h ?? '09').padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`
  },
  set: (value) => {
    const [h, m] = String(value).split(':')
    if (h === undefined || m === undefined) return
    draft.value.dailyNotificationTime = `${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`
  }
})

watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return
    error.value = ''
    // The session only carries what authenticate echoed back, which may predate
    // a change made on another device — fetch the current record before editing.
    loading.value = true
    try {
      const { data } = await apiClient.UsersService.fetch(session.phoneNumber)
      record.value = data
      draft.value = {
        allowNotifications: data?.allowNotifications ?? true,
        dailyNotificationTime: data?.dailyNotificationTime ?? '09:00:00'
      }
    } catch (e) {
      error.value = e?.message || String(e)
    } finally {
      loading.value = false
    }
  }
)

async function save() {
  if (loading.value || saving.value || !record.value) return
  error.value = ''
  saving.value = true
  try {
    await apiClient.UsersService.update({
      ...record.value,
      allowNotifications: draft.value.allowNotifications,
      dailyNotificationTime: draft.value.dailyNotificationTime
    })
    // Keep the session's cached copy in step so a reopen shows the new values.
    session.user = { ...(session.user ?? {}), ...draft.value }
    emit('update:modelValue', false)
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form__error {
  padding: 9px 11px;
  border: 1px solid rgba(143, 71, 65, 0.4);
  font: 400 12px/1.4 var(--font-body);
  color: #8f4741;
}

.form__loading {
  padding: 18px 0;
  text-align: center;
  font: 400 12px var(--font-body);
  color: var(--color-neutral-600);
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

.input:disabled {
  opacity: 0.5;
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
</style>
