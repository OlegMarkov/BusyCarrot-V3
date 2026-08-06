import { createRouter, createWebHistory } from 'vue-router'
import { useOwnerStore } from '@/stores/owner'
import { devAuthEnabled, seedDevSession } from '@/plugins/dev-auth'

/**
 * The desktop design is a five-section app behind a sidebar, so each section is
 * its own route rather than a tab of one Dashboard page. `/` redirects to the
 * calendar, which is what the old Dashboard showed.
 */
const routes = [
  { path: '/login', name: 'login', component: () => import('@/pages/Login.vue') },
  { path: '/', redirect: { name: 'calendar' } },
  { path: '/calendar', name: 'calendar', component: () => import('@/pages/CalendarPage.vue') },
  { path: '/clients', name: 'clients', component: () => import('@/pages/ClientsPage.vue') },
  { path: '/services', name: 'services', component: () => import('@/pages/ServicesPage.vue') },
  { path: '/hours', name: 'hours', component: () => import('@/pages/HoursPage.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/pages/SettingsPage.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})

// Ported from vegetable/Vegetable.Admin/middleware/auth.js. The original used
// window.location.replace('/login'); router.push keeps SPA navigation instead.
router.beforeEach((to) => {
  const owner = useOwnerStore()

  // Dev only, and compiled out of production builds — see plugins/dev-auth.js.
  if (devAuthEnabled) {
    seedDevSession(owner)
    // /login renders the Auth0 widget, which is the thing being avoided.
    return to.name === 'login' ? { name: 'calendar' } : true
  }

  if (!owner.authenticated && to.name !== 'login') {
    return { name: 'login' }
  }
})
