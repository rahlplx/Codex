<script setup lang="ts">
import { onMounted } from 'vue';
import { useProviderStore } from '@/stores/provider.store';
import ProviderCard from './ProviderCard.vue';
import HealthSummaryBar from './HealthSummaryBar.vue';

const providerStore = useProviderStore();

onMounted(() => {
  providerStore.fetchProviders();
});
</script>

<template>
  <div class="max-w-4xl mx-auto p-6 space-y-6">
    <h1 class="text-xl font-semibold">Providers</h1>

    <HealthSummaryBar :providers="providerStore.providers" />

    <section class="space-y-3">
      <h2 class="text-sm font-medium text-text-secondary uppercase tracking-wider">Free Providers</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <ProviderCard
          v-for="provider in providerStore.providers.filter(p => p.tier === 'free')"
          :key="provider.id"
          :provider="provider"
        />
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-medium text-text-secondary uppercase tracking-wider">Your API Keys</h2>
      <div class="p-8 bg-bg-secondary border border-border rounded-lg text-center">
        <p class="text-text-muted text-sm mb-4">No API keys configured yet</p>
        <button class="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded transition-colors text-sm">
          + Add API Key
        </button>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-medium text-text-secondary uppercase tracking-wider">Community Routers</h2>
      <div class="p-8 bg-bg-secondary border border-border rounded-lg text-center">
        <p class="text-text-muted text-sm">No routers configured. Add Docker sidecars via docker-compose.</p>
      </div>
    </section>
  </div>
</template>
