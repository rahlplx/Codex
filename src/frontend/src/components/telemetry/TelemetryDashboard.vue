<script setup lang="ts">
import { onMounted } from 'vue';
import { useTelemetryStore } from '@/stores/telemetry.store';
import ModelRankings from './ModelRankings.vue';
import UsageChart from './UsageChart.vue';

const telemetryStore = useTelemetryStore();

onMounted(() => {
  telemetryStore.fetchAll();
});
</script>

<template>
  <div class="max-w-4xl mx-auto p-6 space-y-6">
    <h1 class="text-xl font-semibold">Telemetry</h1>

    <ModelRankings :rankings="telemetryStore.rankings" />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <section class="p-4 bg-bg-secondary border border-border rounded-lg space-y-3">
        <h2 class="text-sm font-medium text-text-secondary uppercase tracking-wider">Reliability</h2>
        <div v-if="telemetryStore.reliability.length === 0" class="text-text-muted text-sm">No data yet</div>
        <div v-for="r in telemetryStore.reliability" :key="r.providerId" class="flex items-center gap-2">
          <span class="text-sm text-text-primary w-24 truncate">{{ r.providerId }}</span>
          <div class="flex-1 bg-bg-tertiary rounded-full h-2">
            <div class="bg-success rounded-full h-2" :style="{ width: r.successRate + '%' }" />
          </div>
          <span class="text-xs text-text-muted w-12 text-right">{{ r.successRate.toFixed(1) }}%</span>
        </div>
      </section>

      <section class="p-4 bg-bg-secondary border border-border rounded-lg space-y-3">
        <h2 class="text-sm font-medium text-text-secondary uppercase tracking-wider">Speed (p50)</h2>
        <div v-if="telemetryStore.speed.length === 0" class="text-text-muted text-sm">No data yet</div>
        <div v-for="s in telemetryStore.speed" :key="s.providerId" class="flex items-center gap-2">
          <span class="text-sm text-text-primary w-24 truncate">{{ s.providerId }}</span>
          <div class="flex-1 bg-bg-tertiary rounded-full h-2">
            <div class="bg-accent rounded-full h-2" :style="{ width: Math.min(100, (1000 - s.p50Ms) / 10) + '%' }" />
          </div>
          <span class="text-xs text-text-muted w-16 text-right">{{ s.p50Ms }}ms</span>
        </div>
      </section>
    </div>

    <UsageChart :usage="telemetryStore.usage" />

    <section class="p-4 bg-bg-secondary border border-border rounded-lg">
      <h2 class="text-sm font-medium text-text-secondary uppercase tracking-wider mb-3">Savings</h2>
      <p class="text-text-primary text-sm">Total cost this week: <span class="font-medium">$0.00</span> (100% free)</p>
    </section>
  </div>
</template>
