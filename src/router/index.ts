import { createRouter, createWebHashHistory } from 'vue-router'
import { useVaultStore } from '../stores/vault'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/dashboard',
      component: () => import('../views/ResearchDashboard.vue'),
      meta: { requiresVault: true },
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresVault) {
    const vault = useVaultStore()
    if (!vault.activeVault) {
      return { path: '/' }
    }
  }
})