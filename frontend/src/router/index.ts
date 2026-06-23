import { createRouter, createWebHashHistory } from 'vue-router'

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
      beforeEnter: () => {
        const raw = localStorage.getItem('codex_agent_user')
        if (!raw) return { name: 'home' }
        try {
          const user = JSON.parse(raw)
          if (user.role !== 'admin') return { name: 'home' }
        } catch {
          return { name: 'home' }
        }
      },
    },
    {
      path: '/new-thread',
      redirect: { name: 'home' },
    },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
})

export default router
