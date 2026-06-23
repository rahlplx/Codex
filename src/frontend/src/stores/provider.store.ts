import { defineStore } from 'pinia';
import { ref } from 'vue';
import { gateway } from '@/api/gateway';

interface Provider {
  id: string;
  name: string;
  tier: string;
  status: string;
}

export const useProviderStore = defineStore('provider', () => {
  const providers = ref<Provider[]>([]);
  const loading = ref(false);

  async function fetchProviders() {
    loading.value = true;
    try {
      providers.value = await gateway.get<Provider[]>('/providers');
    } finally {
      loading.value = false;
    }
  }

  return { providers, loading, fetchProviders };
});
