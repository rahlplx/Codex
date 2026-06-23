<script setup lang="ts">
import { computed } from 'vue'

export interface ProviderCardData {
  id: string
  name: string
  tier: 'free' | 'freemium' | 'paid'
  status: 'healthy' | 'degraded' | 'error' | 'offline'
  latencyMs: number
  quota: { unlimited: boolean; remaining: number | null }
  modelCount: number
  canToggle?: boolean
  isRunning?: boolean
}

const props = defineProps<{
  provider: ProviderCardData
  selected?: boolean
}>()

const emit = defineEmits<{
  click: []
  toggle: []
}>()

const statusDot = computed(() => {
  switch (props.provider.status) {
    case 'healthy':  return 'bg-emerald-500'
    case 'degraded': return 'bg-amber-400'
    case 'error':    return 'bg-rose-500'
    default:         return 'bg-zinc-400'
  }
})

const statusLabel = computed(() => {
  switch (props.provider.status) {
    case 'healthy':  return 'Healthy'
    case 'degraded': return 'Degraded'
    case 'error':    return 'Error'
    default:         return 'Offline'
  }
})

const quotaLabel = computed(() => {
  if (props.provider.quota.unlimited) return '∞'
  if (props.provider.quota.remaining === null) return '?'
  if (props.provider.quota.remaining === 0) return 'Exhausted'
  return `${props.provider.quota.remaining.toLocaleString()} left`
})

const tierLabel = computed(() => props.provider.tier)
</script>

<template>
  <button
    type="button"
    class="provider-card"
    :class="{ 'is-selected': selected }"
    @click="emit('click')"
  >
    <div class="provider-card-header">
      <div class="provider-card-status">
        <span class="provider-card-dot" :class="statusDot" />
        <span class="provider-card-status-label">{{ statusLabel }}</span>
      </div>
      <span class="provider-card-tier">{{ tierLabel }}</span>
    </div>

    <div class="provider-card-name">{{ provider.name }}</div>

    <div class="provider-card-metrics">
      <span class="provider-card-pill">
        {{ provider.latencyMs > 0 ? `${provider.latencyMs}ms` : '—' }}
      </span>
      <span class="provider-card-pill">
        {{ quotaLabel }}
      </span>
      <span class="provider-card-pill">
        {{ provider.modelCount }} model{{ provider.modelCount !== 1 ? 's' : '' }}
      </span>
    </div>

    <div v-if="provider.canToggle" class="provider-card-actions">
      <button
        type="button"
        class="provider-card-toggle"
        :class="provider.isRunning ? 'is-running' : ''"
        @click.stop="emit('toggle')"
      >
        {{ provider.isRunning ? 'Stop' : 'Start' }}
      </button>
    </div>
  </button>
</template>

<style scoped>
@reference "tailwindcss";

.provider-card {
  @apply w-full text-left rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:border-zinc-300 hover:shadow cursor-pointer;
}

.provider-card.is-selected {
  @apply border-zinc-400 ring-1 ring-zinc-300;
}

.provider-card-header {
  @apply flex items-center justify-between gap-2 mb-1.5;
}

.provider-card-status {
  @apply flex items-center gap-1.5;
}

.provider-card-dot {
  @apply w-2 h-2 rounded-full flex-shrink-0;
}

.provider-card-status-label {
  @apply text-xs text-zinc-500;
}

.provider-card-tier {
  @apply rounded-full border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wide;
}

.provider-card-name {
  @apply text-sm font-medium text-zinc-900 mb-2;
}

.provider-card-metrics {
  @apply flex items-center gap-1.5 flex-wrap;
}

.provider-card-pill {
  @apply rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600;
}

.provider-card-actions {
  @apply mt-2.5 flex justify-end;
}

.provider-card-toggle {
  @apply rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-100;
}

.provider-card-toggle.is-running {
  @apply border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100;
}

/* Dark mode */
:root.dark .provider-card {
  @apply border-zinc-700 bg-zinc-800 hover:border-zinc-600;
}

:root.dark .provider-card.is-selected {
  @apply border-zinc-500 ring-zinc-600;
}

:root.dark .provider-card-status-label {
  @apply text-zinc-400;
}

:root.dark .provider-card-tier {
  @apply border-zinc-600 bg-zinc-700 text-zinc-400;
}

:root.dark .provider-card-name {
  @apply text-zinc-100;
}

:root.dark .provider-card-pill {
  @apply border-zinc-600 bg-zinc-700 text-zinc-300;
}

:root.dark .provider-card-toggle {
  @apply border-zinc-600 bg-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-600;
}

:root.dark .provider-card-toggle.is-running {
  @apply border-rose-800 bg-rose-950 text-rose-300 hover:border-rose-700;
}
</style>
