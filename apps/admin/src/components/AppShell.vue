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
    </aside>

    <!-- ── main ── -->
    <div class="main">
      <header class="topbar">
        <div class="topbar__id">
          <h1 class="topbar__title">{{ pageTitle }}</h1>
          <div class="topbar__sub">{{ pageSub }}</div>
        </div>
        <div class="topbar__actions">
          <slot name="actions" />
        </div>
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
</style>
