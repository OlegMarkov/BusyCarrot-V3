<template>
  <app-shell :page-title="t('nav.settings')" :page-sub="ownerName">
    <div class="page">
      <div class="page__main">
        <div v-for="row in rows" :key="row.key" class="row" @click="row.go && row.go()">
          <div class="row__main">
            <div class="row__title">{{ row.title }}</div>
            <div class="row__note">{{ row.note }}</div>
          </div>
          <span class="row__value">{{ row.value }}</span>
          <lucide-icon name="chevron-right" :size="15" class="row__chevron" />
        </div>
      </div>

      <employees-dialog v-model="employeesOpen" />

      <div class="blueprint sub">
        <i class="corner tl" /><i class="corner tr" /><i class="corner bl" /><i class="corner br" />
        <div class="sub__head">
          <div>
            <div class="sub__kicker">{{ t('settings.subscription') }}</div>
            <div class="sub__name">{{ subscriptionName }}</div>
          </div>
          <span class="tag tag-accent">{{ subscriptionState }}</span>
        </div>
        <div class="sub__note">{{ subscriptionNote }}</div>
        <button class="btn btn-primary sub__cta">{{ t('settings.renew') }}</button>
      </div>
    </div>
  </app-shell>
</template>

<script setup>
import { computed, ref } from 'vue'
import moment from 'moment'
import { useI18n } from 'vue-i18n'
import AppShell from '@/components/AppShell.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import EmployeesDialog from '@/components/editors/EmployeesDialog.vue'
import { useOwnerStore } from '@/stores/owner'
import { useEmployeeStore } from '@/stores/employee'

const { t } = useI18n()
const owner = useOwnerStore()
const employees = useEmployeeStore()

const ownerName = computed(() => owner.owner?.title ?? '')
const employeesOpen = ref(false)

const rows = computed(() => [
  {
    key: 'account',
    title: t('settings.account'),
    note: t('settings.accountNote'),
    value: owner.owner?.phoneNumbers?.[0]?.number ?? ''
  },
  {
    key: 'currency',
    title: t('settings.currency'),
    note: t('settings.currencyNote'),
    value: owner.owner?.currency
      ? `${owner.owner.currency.code} ${owner.owner.currency.symbol}`
      : ''
  },
  {
    key: 'notifications',
    title: t('settings.notifications'),
    note: t('settings.notificationsNote'),
    value: ''
  },
  {
    key: 'site',
    title: t('settings.site'),
    note: owner.owner?.alias ? `busycarrot.com/${owner.owner.alias}` : t('settings.siteNote'),
    value: owner.owner?.alias ? t('settings.live') : ''
  },
  {
    key: 'employees',
    title: t('settings.employees'),
    note: t('settings.employeesNote'),
    value: String(employees.activeEmployees?.length ?? 0),
    go: () => {
      employeesOpen.value = true
    }
  },
  {
    key: 'legal',
    title: t('settings.legal'),
    note: t('settings.legalNote'),
    value: ''
  }
])

/*
 * The owner record carries no subscription object in the API's aggregate, so
 * this reads what is there and falls back to the free tier rather than
 * inventing a plan name.
 */
const subscription = computed(() => owner.owner?.subscription ?? null)
const subscriptionName = computed(() => subscription.value?.title ?? t('settings.planDefault'))
const subscriptionState = computed(() =>
  subscription.value ? t('settings.active') : t('settings.free')
)
const subscriptionNote = computed(() => {
  if (!subscription.value) return t('settings.freeNote')
  const until = subscription.value.expiredAt
    ? moment(subscription.value.expiredAt).format('DD.MM.YYYY')
    : '—'
  return `${t('settings.renews')} ${until}`
})
</script>

<style scoped>
.page {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 22px 26px 30px;
  display: flex;
  gap: 26px;
  align-items: flex-start;
}

.page__main {
  flex: 1;
  min-width: 0;
  max-width: 620px;
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 2px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
  cursor: pointer;
}

.row:hover {
  background: color-mix(in srgb, var(--color-text) 4%, transparent);
}

.row__main {
  flex: 1;
}

.row__title {
  font: 600 15px/1.2 var(--font-heading);
}

.row__note {
  font: 400 11.5px/1.4 var(--font-body);
  color: var(--color-neutral-600);
  margin-top: 3px;
}

.row__value {
  font: 400 12.5px var(--font-body);
  color: var(--color-neutral-600);
}

.row__chevron {
  color: var(--color-neutral-500);
}

.sub {
  width: 320px;
  flex: none;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.sub__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.sub__kicker {
  font: 400 9.5px/1 var(--font-body);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
}

.sub__name {
  font: 600 26px/1.1 var(--font-heading);
  margin-top: 6px;
}

.sub__note {
  font: 400 12.5px/1.5 var(--font-body);
  color: var(--color-neutral-700);
}

.sub__cta {
  min-height: 44px;
  margin-top: 4px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 12px;
}
</style>
