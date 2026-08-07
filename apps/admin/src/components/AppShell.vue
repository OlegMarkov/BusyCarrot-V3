<template>
  <div class="shell">
    <!-- ── sidebar ── -->
    <aside class="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__mark">BusyCarrot</div>
        <div class="sidebar__owner">{{ ownerName }}</div>
      </div>

      <nav class="sidebar__nav">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="nav-item"
          :class="{ 'nav-item--active': item.name === current }"
        >
          <lucide-icon :name="item.icon" />
          <span class="nav-item__label">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="sidebar__foot">
        <div class="sidebar__foot-label">{{ t('nav.language') }}</div>
        <div class="seg">
          <label
            v-for="option in locales"
            :key="option"
            class="seg-opt"
            :class="{ 'seg-opt--active': option === locale }"
            @click="setLocale(option)"
          >
            <span class="sidebar__loc">{{ option.toUpperCase() }}</span>
          </label>
        </div>
      </div>

      <!-- The account row the design pins to the bottom of the sidebar. -->
      <div class="sidebar__account">
        <div class="sidebar__initials">{{ accountInitials }}</div>
        <div class="sidebar__account-id">
          <div class="sidebar__account-name">{{ accountName }}</div>
          <div class="sidebar__account-sub">{{ t('nav.account') }}</div>
        </div>
        <button
          class="sidebar__signout"
          type="button"
          :title="t('nav.sign-out')"
          :aria-label="t('nav.sign-out')"
          @click="signOut"
        >
          <lucide-icon name="logout" :size="15" />
        </button>
      </div>
    </aside>

    <!-- ── main ── -->
    <div class="main">
      <header class="topbar">
        <div class="topbar__id">
          <div class="topbar__shop">{{ ownerName }}</div>
          <h1 class="topbar__title">{{ pageTitle }}</h1>
          <div class="topbar__sub">{{ pageSub }}</div>
        </div>
        <div class="topbar__actions">
          <slot name="actions" />
        </div>
        <!--
          Under the breakpoint the sidebar becomes a bar of five tabs with no
          room for the brand or the language control, so both move up here —
          the shop name beside the title, the locale as the design's 38px
          bordered toggle at the top right.
        -->
        <button class="topbar__locale" @click="cycleLocale">{{ locale.toUpperCase() }}</button>
      </header>

      <div class="main__body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useOwnerStore } from '@/stores/owner'
import { useEmployeeStore } from '@/stores/employee'
import { useCustomerStore } from '@/stores/customer'
import { useScheduleStore } from '@/stores/schedule'
import { useServiceStore } from '@/stores/service'
import { logout } from '@/plugins/auth'
import LucideIcon from '@/components/ui/LucideIcon.vue'

/**
 * The desktop shell: a fixed sidebar, a title bar, and a content slot.
 *
 * Replaces the Vuetify `v-navigation-drawer` + `v-app-bar` + `v-main` layout.
 * The design gives the sidebar a fixed 216px and lets the main column flex, so
 * there is no drawer to open or close — the navigation is always present.
 */
const props = defineProps({
  pageTitle: { type: String, default: '' },
  pageSub: { type: String, default: '' }
})

const route = useRoute()
const { t, locale, availableLocales } = useI18n()
const owner = useOwnerStore()
const employees = useEmployeeStore()
const customers = useCustomerStore()
const schedules = useScheduleStore()
const services = useServiceStore()

const ownerName = computed(() => owner.owner?.title || '')

/**
 * The signed-in person, from the Auth0 profile. Falls back through the fields
 * a profile may or may not carry — `name` is optional, `email` is not always
 * present either on social connections.
 */
const accountName = computed(
  () => owner.user?.name || owner.user?.nickname || owner.user?.email || '—'
)

const accountInitials = computed(() => {
  const source = accountName.value
  if (!source || source === '—') return '—'
  return (
    source
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || '—'
  )
})

/**
 * Auth0's logout redirects the browser away, so there is no undo once it runs
 * and no in-app state left to tidy — hence the confirm.
 */
function signOut() {
  // eslint-disable-next-line no-alert
  if (!window.confirm(t('nav.sign-out-confirm'))) return
  logout()
}
const current = computed(() => route.name)
const locales = computed(() => availableLocales)

const navItems = computed(() => [
  { name: 'calendar', icon: 'calendar', label: t('nav.calendar') },
  { name: 'clients', icon: 'clients', label: t('nav.clients') },
  { name: 'services', icon: 'services', label: t('nav.services') },
  { name: 'hours', icon: 'hours', label: t('nav.hours') },
  { name: 'settings', icon: 'settings', label: t('nav.settings') }
])

function setLocale(next) {
  locale.value = next
}

/** The mobile toggle is one button rather than a segmented control, so it
    steps through the available locales instead of picking one. */
function cycleLocale() {
  const all = availableLocales
  const next = all[(all.indexOf(locale.value) + 1) % all.length]
  setLocale(next)
}

/**
 * The owner aggregate, the customers and the schedules are app-wide, so they
 * load here rather than in whichever section happens to be open. Loading them
 * per page meant a cold navigation straight to /hours or /clients found the
 * stores empty — Hours in particular then drew every day as closed.
 */
onMounted(async () => {
  // The owner store is persisted but the employee and service stores are not,
  // and they are populated as a side effect of this one call — so guarding on
  // `owner.owner` alone left them permanently empty after a reload. The guard
  // has to cover everything the call fills.
  const needsOwner =
    !owner.owner?.id || !employees.employees.length || !services.services.length
  if (needsOwner) await owner.fetchAllOwnerData()

  if (!customers.customers?.length) customers.fetchCustomers()

  const employeeId = employees.currentEmployeeId ?? employees.employees?.[0]?.id
  if (employeeId && !schedules.schedules.length) schedules.fetchSchedules(employeeId)
})

// referenced in the template
void props
</script>

<style scoped>
.shell {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
  color: var(--color-text);
}

/* — sidebar — */
.sidebar {
  width: 216px;
  flex: none;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-divider);
}

.sidebar__brand {
  height: 64px;
  flex: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 18px;
  border-bottom: 1px solid var(--color-divider);
}

.sidebar__mark {
  font: 600 18px/1 var(--font-heading);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.sidebar__owner {
  font: 400 10px/1.4 var(--font-body);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin-top: 4px;
}

.sidebar__nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 14px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  height: 44px;
  padding: 0 18px;
  cursor: pointer;
  text-decoration: none;
  color: var(--color-neutral-700);
  border-left: 2px solid transparent;
}

.nav-item:hover {
  background: color-mix(in srgb, var(--color-text) 4%, transparent);
}

/* The active item is marked by a rule on the leading edge and an accent tint —
   no pill, no fill; the sidebar stays a drawn object. */
.nav-item--active {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 9%, transparent);
  border-left-color: var(--color-accent);
}

.nav-item__label {
  font: 600 13px/1 var(--font-heading);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.sidebar__foot {
  flex: none;
  padding: 16px 18px;
  border-top: 1px solid var(--color-divider);
}

.sidebar__foot-label {
  font: 400 9.5px/1 var(--font-body);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin-bottom: 9px;
}

.sidebar__loc {
  font: 600 11px var(--font-heading);
  letter-spacing: 0.1em;
}

/* — the account row — */
.sidebar__account {
  flex: none;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 12px 18px;
  border-top: 1px solid var(--color-divider);
}

.sidebar__initials {
  width: 30px;
  height: 30px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-divider);
  font: 600 11px var(--font-heading);
  letter-spacing: 0.04em;
  color: var(--color-accent-700);
}

.sidebar__account-id {
  flex: 1;
  min-width: 0;
}

.sidebar__account-name {
  font: 600 12.5px/1.2 var(--font-heading);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__account-sub {
  font: 400 9px/1.3 var(--font-body);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-neutral-600);
  margin-top: 2px;
}

.sidebar__signout {
  width: 30px;
  height: 30px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-divider);
  border-radius: 0;
  color: var(--color-neutral-700);
}

.sidebar__signout:hover {
  color: var(--color-danger, #8f4741);
  border-color: color-mix(in srgb, var(--color-text) 30%, transparent);
}

.seg-opt {
  min-height: 34px;
  padding: 0 14px;
}

/* — main — */
.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.topbar {
  height: 64px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 22px;
  border-bottom: 1px solid var(--color-divider);
}

.topbar__id {
  flex: 1;
  min-width: 0;
}

.topbar__title {
  font: 600 21px/1 var(--font-heading);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin: 0;
}

.topbar__sub {
  font: 400 11px/1.4 var(--font-body);
  color: var(--color-neutral-600);
  margin-top: 3px;
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main__body {
  flex: 1;
  min-height: 0;
  display: flex;
}

/* The shop name and the locale button belong to the mobile chrome only; on
   desktop the sidebar carries both. */
.topbar__shop,
.topbar__locale {
  display: none;
}

/* ──────────────────────────────────────────────────────────────────────────
   Below 1024px: the sidebar becomes a bottom tab bar and the page is one
   column. Nothing about the navigation changes — the same five destinations,
   the same active marker, moved to the edge a thumb can reach.
   ────────────────────────────────────────────────────────────────────────── */
@media (max-width: 1023.98px) {
  .shell {
    flex-direction: column;
    /* Mobile browsers report 100vh as the *unscrolled* height, so a bar pinned
       to the bottom of 100vh sits under the address bar. dvh tracks the visible
       viewport; the vh line stays first as the fallback. */
    height: 100vh;
    height: 100dvh;
  }

  /* DOM order keeps the navigation before the content for assistive tech; the
     visual order puts it last. */
  .main {
    order: 1;
    min-height: 0;
  }

  .sidebar {
    order: 2;
    width: 100%;
    flex-direction: row;
    border-right: 0;
    border-top: 1px solid var(--color-divider);
    /* iOS home indicator */
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .sidebar__brand,
  .sidebar__foot,
  /* The account row cannot ride in a bar of five tabs; sign-out moves to the
     Settings page, which is where it lives on the mobile layout. */
  .sidebar__account {
    display: none;
  }

  .sidebar__nav {
    flex: 1;
    flex-direction: row;
    padding: 0;
  }

  .nav-item {
    flex: 1 1 0;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    height: 56px;
    padding: 0 2px;
    border-left: 0;
    /* the active marker moves from the leading edge to the top edge */
    border-top: 2px solid transparent;
  }

  .nav-item--active {
    border-top-color: var(--color-accent);
  }

  .nav-item__label {
    font-size: 9px;
    letter-spacing: 0.08em;
  }

  .topbar {
    height: auto;
    min-height: 58px;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 8px;
    padding: 9px 14px 10px;
  }

  .topbar__id {
    /* leave room for the locale button, which sits on the same line */
    flex: 1 1 auto;
  }

  .topbar__shop {
    display: block;
    font: 400 9.5px/1 var(--font-body);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-neutral-600);
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .topbar__title {
    font-size: 19px;
  }

  .topbar__actions {
    /* the page's own actions drop to their own line rather than squeezing */
    order: 3;
    flex: 1 0 100%;
    flex-wrap: wrap;
    gap: 8px;
  }

  .topbar__locale {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    flex: none;
    padding: 0;
    background: transparent;
    border: 1px solid var(--color-divider);
    border-radius: 0;
    font: 600 11px/1 var(--font-heading);
    letter-spacing: 0.1em;
    color: var(--color-text);
    cursor: pointer;
  }

  .main__body {
    /* the sections lay out as one column and scroll as a page */
    flex-direction: column;
    overflow-y: auto;
  }
}
</style>
