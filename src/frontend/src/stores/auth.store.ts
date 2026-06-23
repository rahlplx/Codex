import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { gateway } from '@/api/gateway';
import type { AuthResponse } from '@codex/shared';

interface StoredUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<StoredUser | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  function setAuth(response: AuthResponse) {
    token.value = response.token;
    user.value = {
      id: response.user.id,
      email: response.user.email,
      displayName: response.user.displayName,
      role: response.user.role,
    };
    localStorage.setItem('codex_token', response.token);
    localStorage.setItem('codex_user', JSON.stringify(user.value));
  }

  function loadFromStorage() {
    const storedToken = localStorage.getItem('codex_token');
    const storedUser = localStorage.getItem('codex_user');
    if (storedToken && storedUser) {
      token.value = storedToken;
      user.value = JSON.parse(storedUser);
    }
  }

  async function login(email: string, password: string) {
    const res = await gateway.post<AuthResponse>('/auth/login', { email, password });
    setAuth(res);
  }

  async function register(email: string, password: string, displayName: string) {
    const res = await gateway.post<AuthResponse>('/auth/register', { email, password, displayName });
    setAuth(res);
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('codex_token');
    localStorage.removeItem('codex_user');
  }

  return { token, user, isAuthenticated, isAdmin, login, register, logout, loadFromStorage };
});
