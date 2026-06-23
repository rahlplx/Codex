import { useAuthStore } from '@/stores/auth.store';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();
  const error = ref<string | null>(null);
  const loading = ref(false);

  async function login(email: string, password: string) {
    error.value = null;
    loading.value = true;
    try {
      await store.login(email, password);
      router.push('/');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed';
    } finally {
      loading.value = false;
    }
  }

  async function register(email: string, password: string, displayName: string) {
    error.value = null;
    loading.value = true;
    try {
      await store.register(email, password, displayName);
      router.push('/');
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Registration failed';
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    store.logout();
    router.push('/login');
  }

  return { error, loading, login, register, logout };
}
