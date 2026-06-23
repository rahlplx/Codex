<script setup lang="ts">
import type { ModelScore } from '@codex/shared';

defineProps<{ rankings: ModelScore[] }>();
</script>

<template>
  <section class="p-4 bg-bg-secondary border border-border rounded-lg space-y-3">
    <h2 class="text-sm font-medium text-text-secondary uppercase tracking-wider">Model Rankings</h2>

    <div v-if="rankings.length === 0" class="text-text-muted text-sm">No ranking data yet</div>

    <div v-for="(r, i) in rankings" :key="r.modelId" class="flex items-center gap-3">
      <span class="text-xs text-text-muted w-6 text-right">#{{ i + 1 }}</span>
      <span class="text-sm text-text-primary w-40 truncate">{{ r.modelId }}</span>
      <div class="flex-1 bg-bg-tertiary rounded-full h-3">
        <div class="bg-accent rounded-full h-3" :style="{ width: r.compositeScore + '%' }" />
      </div>
      <span class="text-sm font-medium text-text-primary w-8 text-right">{{ Math.round(r.compositeScore) }}</span>
    </div>
  </section>
</template>
