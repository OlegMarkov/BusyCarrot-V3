import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'

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

/*
 * Ported from vegetable/Vegetable.Admin/middleware/auth.js. The original used
 * window.location.replace('/login'); router.push keeps SPA navigation instead.
 *
 * The guard reads the session token rather than an `authenticated` flag, so
 * "signed in" and "able to call the API" are the same condition and cannot drift
 * apart. The dev bypass that used to sit here is gone with Auth0: sign-in now
 * works against a local API, and `AllowTestVerificationCode` in
 * appsettings.Local.json accepts 123456 for any number containing 123456.
 */
router.beforeEach((to) => {
  const session = useSessionStore()

  if (!session.isAuthenticated && to.name !== 'login') {
    return { name: 'login' }
  }

  // Nothing to do on the login page once there is a session.
  if (session.isAuthenticated && to.name === 'login') {
    return { name: 'calendar' }
  }
})
