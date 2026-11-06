import { createRouter, createWebHashHistory } from 'vue-router'

export const routes = [
  {
    path: '/',
    component: () => import('../views/ProjectListView.vue'),
  },
  {
    path: '/projects/:id',
    component: () => import('../views/ResearchDashboard.vue'),
    props: true,
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
