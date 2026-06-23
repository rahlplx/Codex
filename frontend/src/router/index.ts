import { createRouter, createWebHashHistory } from 'vue-router'
import { useCodexAgent } from '../composables/useCodexAgent'

const EmptyRouteView = {
  render: () => null,
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: EmptyRouteView,
    },
    {
      path: '/thread/:threadId',
      name: 'thread',
      component: EmptyRouteView,
    },
    {
      path: '/skills',
      name: 'skills',
      component: EmptyRouteView,
    },
    {
      path: '/automations',
      name: 'automations',
      component: EmptyRouteView,
    },
    {
      path: '/chat',
      name: 'chat',
      component: EmptyRouteView,
    },
    {
      path: '/providers',
      name: 'providers',
      component: EmptyRouteView,
    },
    {
      path: '/models',
      name: 'models',
      component: EmptyRouteView,
    },
    {
      path: '/telemetry',
      name: 'telemetry',
      component: EmptyRouteView,
    },
    {
      path: '/admin',
      name: 'admin',
      component: EmptyRouteView,
      meta: { requiresAdmin: true },
    },
    {
      path: '/new-thread',
      redirect: { name: 'home' },
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAdmin) {
    const { isAdmin } = useCodexAgent()
    if (!isAdmin.value) return { name: 'home' }
  }
})

export default router
