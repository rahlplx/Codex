<script setup lang="ts">

defineProps<{
  provider: { id: string; name: string; tier: string; status: string };
}>();

const statusColor: Record<string, string> = {
  active: 'text-success',
  degraded: 'text-warning',
  down: 'text-error',
};
</script>

<template>
  <div class="p-4 bg-bg-secondary border border-border rounded-lg space-y-2">
    <div class="flex items-center justify-between">
      <h3 class="font-medium text-text-primary">{{ provider.name }}</h3>
      <span :class="['text-xs', statusColor[provider.status] ?? 'text-text-muted']">
        ● {{ provider.status }}
      </span>
    </div>
    <div class="text-xs text-text-muted">{{ provider.tier }}</div>
    <button class="text-xs text-text-secondary hover:text-error transition-colors">
      Disable
    </button>
  </div>
</template>
