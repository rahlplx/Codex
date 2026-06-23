import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/components/auth/LoginPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/components/auth/RegisterPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      name: 'chat',
      component: () => import('@/components/chat/ChatView.vue'),
      meta: { auth: true },
    },
    {
      path: '/thread/:id',
      name: 'thread',
      component: () => import('@/components/chat/ChatView.vue'),
      meta: { auth: true },
    },
    {
      path: '/providers',
      name: 'providers',
      component: () => import('@/components/providers/ProviderDashboard.vue'),
      meta: { auth: true },
    },
    {
      path: '/telemetry',
      name: 'telemetry',
      component: () => import('@/components/telemetry/TelemetryDashboard.vue'),
      meta: { auth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/components/auth/UserSettings.vue'),
      meta: { auth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/components/auth/AdminPanel.vue'),
      meta: { auth: true, role: 'admin' },
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.auth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.meta.guest && auth.isAuthenticated) {
    return { name: 'chat' };
  }

  if (to.meta.role && auth.user?.role !== to.meta.role) {
    return { name: 'chat' };
  }
});

export { router };
