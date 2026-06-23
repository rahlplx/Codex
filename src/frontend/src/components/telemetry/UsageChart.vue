<script setup lang="ts">
import { computed } from 'vue';
import type { DailyUsage } from '@codex/shared';

const props = defineProps<{ usage: DailyUsage[] }>();

const maxRequests = computed(() =>
  Math.max(1, ...props.usage.map((u) => u.totalRequests)),
);
</script>

<template>
  <section class="p-4 bg-bg-secondary border border-border rounded-lg space-y-3">
    <h2 class="text-sm font-medium text-text-secondary uppercase tracking-wider">Daily Usage</h2>

    <div v-if="usage.length === 0" class="text-text-muted text-sm">No usage data yet</div>

    <div v-for="day in usage" :key="day.date" class="flex items-center gap-3">
      <span class="text-xs text-text-muted w-20">{{ day.date }}</span>
      <div class="flex-1 bg-bg-tertiary rounded-full h-3">
        <div
          class="bg-accent rounded-full h-3"
          :style="{ width: (day.totalRequests / maxRequests) * 100 + '%' }"
        />
      </div>
      <span class="text-xs text-text-muted w-10 text-right">{{ day.totalRequests }}</span>
    </div>
  </section>
</template>
