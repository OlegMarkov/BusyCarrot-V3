import { createRouter, createWebHistory } from 'vue-router'

/**
 * Obs is one page: an owner's public booking site, addressed by alias
 * (busycarrot.com/{alias}).
 *
 * In vegetable.web the alias never came from the URL at all — the ASP.NET host
 * rendered it into a hidden <div id="moniker"> and main.js did
 * `provide('moniker', document.getElementById('moniker').innerText)`. Standing
 * the app up outside that host means taking it from the route, which is also
 * what makes a booking page reachable by direct link.
 */
const routes = [
  { path: '/', name: 'home', component: () => import('@/pages/Home.vue') },
  {
    path: '/:alias',
    name: 'owner',
    component: () => import('@/pages/PersonalPage.vue'),
    props: true
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/pages/NotFound.vue') }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
