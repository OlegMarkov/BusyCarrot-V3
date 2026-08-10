<template>
  <app-shell :page-title="t('nav.settings')" :page-sub="ownerName">
    <div class="page">
      <div class="page__main">
        <div
          v-for="row in rows"
          :key="row.key"
          class="row"
          :class="{ 'row--static': !row.go }"
          @click="row.go && row.go()"
        >
          <div class="row__main">
            <div class="row__title">{{ row.title }}</div>
            <div class="row__note">{{ row.note }}</div>
          </div>
          <span class="row__value">{{ row.value }}</span>
          <lucide-icon v-if="row.go" name="chevron-right" :size="15" class="row__chevron" />
        </div>

        <!--
          Sign-out lives in the sidebar's account row on desktop. Below the
          breakpoint the sidebar is five tabs with nowhere to put it, so it
          appears here instead — one control, never two.
        -->
        <div class="row row--signout" @click="signOut">
          <div class="row__main">
            <div class="row__title">{{ t('nav.sign-out') }}</div>
            <div class="row__note">{{ accountName }}</div>
          </div>
          <lucide-icon name="logout" :size="15" class="row__chevron" />
        </div>
      </div>

      <employees-dialog v-model="employeesOpen" />
      <owner-edit-dialog v-model="companyOpen" />
      <notification-settings-dialog v-model="notifOpen" />

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
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'
import EmployeesDialog from '@/components/editors/EmployeesDialog.vue'
import OwnerEditDialog from '@/components/editors/OwnerEditDialog.vue'
import NotificationSettingsDialog from '@/components/editors/NotificationSettingsDialog.vue'
import config from '@/config'
import { useOwnerStore } from '@/stores/owner'
import { useEmployeeStore } from '@/stores/employee'
import { useSessionStore } from '@/stores/session'

const { t } = useI18n()
const router = useRouter()
const owner = useOwnerStore()
const employees = useEmployeeStore()
const session = useSessionStore()

/** Same source as the sidebar's account row. */
const accountName = computed(() => session.displayName)

function signOut() {
  // eslint-disable-next-line no-alert
  if (!window.confirm(t('nav.sign-out-confirm'))) return
  session.signOut()
  router.push({ name: 'login' })
}

const ownerName = computed(() => owner.owner?.title ?? '')

/** The owner's own listed number if any, otherwise the phone this session signed in with. */
const accountNumber = computed(() => {
  const owned = owner.owner?.phoneNumbers?.[0]?.number
  if (owned) return owned
  return session.phoneNumber ? `+${session.phoneNumber}` : ''
})

const employeesOpen = ref(false)
const companyOpen = ref(false)
const notifOpen = ref(false)

/**
 * The privacy policy is a server-rendered page on the API host, the same one
 * the mobile app links to. Opened in a new tab rather than embedded.
 */
function openPrivacy() {
  const base = (config.ApiBaseUrl || '').replace(/\/?$/, '/')
  window.open(`${base}publicowner/privacypolicy`, '_blank', 'noopener')
}

/*
 * Every row now resolves to an action, except `account`, which is deliberately
 * static: the phone number is the login identity and the original admin never
 * let it be edited. A row with no `go` renders without a chevron and does not
 * respond to a click, rather than looking tappable and doing nothing.
 *
 * `currency` and `site` open the company dialog because that is where those
 * fields are edited — currency is a select in it, and the alias and the publish
 * switch are the "site" — so the rows deep-link to the one place they live.
 */
const rows = computed(() => [
  {
    key: 'company',
    title: t('settings.company'),
    note: t('settings.companyNote'),
    value: owner.owner?.title ?? '',
    go: () => {
      companyOpen.value = true
    }
  },
  {
    key: 'account',
    title: t('settings.account'),
    note: t('settings.accountNote'),
    value: accountNumber.value
  },
  {
    key: 'currency',
    title: t('settings.currency'),
    note: t('settings.currencyNote'),
    value: owner.owner?.currency
      // `currencyCode`, not `code` — the stub used the latter and this read
      // "undefined ₽" against a real API.
      ? `${owner.owner.currency.currencyCode} ${owner.owner.currency.symbol}`
      : '',
    go: () => {
      companyOpen.value = true
    }
  },
  {
    key: 'notifications',
    title: t('settings.notifications'),
    note: t('settings.notificationsNote'),
    value: '',
    go: () => {
      notifOpen.value = true
    }
  },
  {
    key: 'site',
    title: t('settings.site'),
    note: owner.owner?.alias ? `busycarrot.com/${owner.owner.alias}` : t('settings.siteNote'),
    value: owner.owner?.alias ? t('settings.live') : '',
    go: () => {
      companyOpen.value = true
    }
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
    value: '',
    go: openPrivacy
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

/* A row that only shows a value — no chevron, no hover, no pointer. */
.row--static {
  cursor: default;
}

.row--static:hover {
  background: transparent;
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

/* Sign-out is the sidebar's job on desktop; this row only exists below the
   breakpoint, where the sidebar has become a tab bar. */
.row--signout {
  display: none;
}

.row--signout .row__title {
  color: var(--color-accent-700);
}

/* ──────────────────────────────────────────────────────────────────────────
   Below 1024px — the design's single breakpoint.
   ────────────────────────────────────────────────────────────────────────── */
@media (max-width: 1023.98px) {
  .page {
    flex-direction: column;
    gap: 22px;
    padding: 14px 14px 26px;
  }

  .page__main,
  .sub {
    width: 100%;
    max-width: none;
  }

  .row--signout {
    display: flex;
  }
}
</style>
