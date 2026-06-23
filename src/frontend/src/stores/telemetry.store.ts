import { defineStore } from 'pinia';
import { ref } from 'vue';
import { gateway } from '@/api/gateway';
import type { ModelScore, DailyUsage, ProviderReliability, ProviderSpeed } from '@codex/shared';

export const useTelemetryStore = defineStore('telemetry', () => {
  const rankings = ref<ModelScore[]>([]);
  const usage = ref<DailyUsage[]>([]);
  const reliability = ref<ProviderReliability[]>([]);
  const speed = ref<ProviderSpeed[]>([]);
  const loading = ref(false);

  async function fetchAll() {
    loading.value = true;
    try {
      const [r, u, rel, s] = await Promise.all([
        gateway.get<ModelScore[]>('/telemetry/rankings'),
        gateway.get<DailyUsage[]>('/telemetry/usage'),
        gateway.get<ProviderReliability[]>('/telemetry/reliability'),
        gateway.get<ProviderSpeed[]>('/telemetry/speed'),
      ]);
      rankings.value = r;
      usage.value = u;
      reliability.value = rel;
      speed.value = s;
    } finally {
      loading.value = false;
    }
  }

  return { rankings, usage, reliability, speed, loading, fetchAll };
});
