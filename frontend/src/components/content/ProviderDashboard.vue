<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import ProviderCard, { type ProviderCardData } from './ProviderCard.vue'
import IconTablerServer from '../icons/IconTablerServer.vue'
import IconTablerBrain from '../icons/IconTablerBrain.vue'

type Tab = 'cli' | 'routers' | 'savings'

const activeTab = ref<Tab>('cli')
const providers = ref<ProviderCardData[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const selectedId = ref<string | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null

const FALLBACK_CLI: ProviderCardData[] = [
  { id: 'opencode-zen', name: 'OpenCode Zen', tier: 'free', status: 'offline', latencyMs: 0, quota: { unlimited: true, remaining: null }, modelCount: 0 },
  { id: 'nemotron', name: 'Nemotron', tier: 'free', status: 'offline', latencyMs: 0, quota: { unlimited: true, remaining: null }, modelCount: 0 },
  { id: 'openrouter-free', name: 'OpenRouter Free', tier: 'freemium', status: 'offline', latencyMs: 0, quota: { unlimited: false, remaining: null }, modelCount: 0 },
  { id: 'antigravity', name: 'Antigravity', tier: 'free', status: 'offline', latencyMs: 0, quota: { unlimited: true, remaining: null }, modelCount: 0 },
  { id: 'kilocode', name: 'KiloCode', tier: 'freemium', status: 'offline', latencyMs: 0, quota: { unlimited: false, remaining: null }, modelCount: 0 },
]

const FALLBACK_ROUTERS: ProviderCardData[] = [
  { id: '9router', name: '9Router', tier: 'free', status: 'offline', latencyMs: 0, quota: { unlimited: true, remaining: null }, modelCount: 0, canToggle: true, isRunning: false },
  { id: 'clirelay', name: 'CliRelay', tier: 'free', status: 'offline', latencyMs: 0, quota: { unlimited: true, remaining: null }, modelCount: 0, canToggle: true, isRunning: false },
  { id: 'cliproxyapi', name: 'CLIProxyAPI', tier: 'free', status: 'offline', latencyMs: 0, quota: { unlimited: true, remaining: null }, modelCount: 0, canToggle: true, isRunning: false },
  { id: 'aiclient2api', name: 'AIClient2API', tier: 'free', status: 'offline', latencyMs: 0, quota: { unlimited: true, remaining: null }, modelCount: 0, canToggle: true, isRunning: false },
]

const CLI_IDS = new Set(FALLBACK_CLI.map(p => p.id))
const ROUTER_IDS = new Set(FALLBACK_ROUTERS.map(p => p.id))

const cliProviders = computed(() => {
  const live = providers.value.filter(p => CLI_IDS.has(p.id))
  if (live.length > 0) return live
  return FALLBACK_CLI
})

const routerProviders = computed(() => {
  const live = providers.value.filter(p => ROUTER_IDS.has(p.id))
  if (live.length > 0) return live
  return FALLBACK_ROUTERS
})

const savingsStats = computed(() => {
  const total = providers.value.reduce((acc, p) => {
    if (p.quota.remaining !== null && !p.quota.unlimited) {
      acc += p.quota.remaining
    }
    return acc
  }, 0)
  const healthy = providers.value.filter(p => p.status === 'healthy').length
  return { healthy, total: providers.value.length, quotaKnown: total }
})

async function fetchProviders() {
  isLoading.value = true
  loadError.value = null
  try {
    const res = await fetch('/api/providers')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    providers.value = Array.isArray(data) ? data : []
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load providers'
  } finally {
    isLoading.value = false
  }
}

function handleToggle(provider: ProviderCardData) {
  const idx = providers.value.findIndex(p => p.id === provider.id)
  if (idx >= 0) {
    providers.value[idx] = { ...providers.value[idx], isRunning: !providers.value[idx].isRunning }
  }
}

onMounted(() => {
  fetchProviders()
  pollTimer = setInterval(fetchProviders, 30_000)
})

onUnmounted(() => {
  if (pollTimer !== null) clearInterval(pollTimer)
})
</script>

<template>
  <div class="provider-dashboard">
    <div class="provider-dashboard-tabs">
      <button
        v-for="tab in ([{ id: 'cli', label: 'Direct CLIs' }, { id: 'routers', label: 'Routers' }, { id: 'savings', label: 'Savings' }] as const)"
        :key="tab.id"
        type="button"
        class="provider-tab-btn"
        :class="{ 'is-active': activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <p v-if="loadError" class="provider-dashboard-error">
      {{ loadError }} — showing cached data
    </p>

    <!-- Tab: Direct CLIs -->
    <div v-if="activeTab === 'cli'" class="provider-dashboard-panel">
      <p class="provider-dashboard-hint">Free and freemium CLI adapters. Start the backend to see live health data.</p>
      <div class="provider-card-grid">
        <ProviderCard
          v-for="p in cliProviders"
          :key="p.id"
          :provider="p"
          :selected="selectedId === p.id"
          @click="selectedId = selectedId === p.id ? null : p.id"
          @toggle="handleToggle(p)"
        />
      </div>
    </div>

    <!-- Tab: Routers -->
    <div v-if="activeTab === 'routers'" class="provider-dashboard-panel">
      <p class="provider-dashboard-hint">Community sidecar routers. Use Start / Stop to control local processes.</p>
      <div class="provider-card-grid">
        <ProviderCard
          v-for="p in routerProviders"
          :key="p.id"
          :provider="p"
          :selected="selectedId === p.id"
          @click="selectedId = selectedId === p.id ? null : p.id"
          @toggle="handleToggle(p)"
        />
      </div>
    </div>

    <!-- Tab: Savings -->
    <div v-if="activeTab === 'savings'" class="provider-dashboard-panel">
      <p class="provider-dashboard-hint">Token savings and quota at a glance.</p>
      <div class="provider-stats-grid">
        <div class="provider-stat-card">
          <span class="provider-stat-value">{{ savingsStats.healthy }}</span>
          <span class="provider-stat-label">Healthy providers</span>
        </div>
        <div class="provider-stat-card">
          <span class="provider-stat-value">{{ savingsStats.total }}</span>
          <span class="provider-stat-label">Total providers</span>
        </div>
        <div class="provider-stat-card">
          <span class="provider-stat-value">{{ savingsStats.quotaKnown.toLocaleString() }}</span>
          <span class="provider-stat-label">Known quota remaining</span>
        </div>
        <div class="provider-stat-card">
          <span class="provider-stat-value">—</span>
          <span class="provider-stat-label">Tokens saved today</span>
        </div>
      </div>
      <p class="provider-stats-note">Full RTK compression stats available once the backend is connected.</p>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.provider-dashboard {
  @apply flex flex-col gap-4 p-3 sm:p-4 min-h-0 flex-1 overflow-y-auto;
}

.provider-dashboard-tabs {
  @apply flex gap-1 border-b border-zinc-200 pb-0;
}

.provider-tab-btn {
  @apply px-3 py-2 text-sm font-medium text-zinc-500 rounded-t-lg border border-transparent -mb-px transition cursor-pointer;
}

.provider-tab-btn.is-active {
  @apply text-zinc-900 border-zinc-200 border-b-white bg-white;
}

.provider-tab-btn:not(.is-active):hover {
  @apply text-zinc-700;
}

.provider-dashboard-panel {
  @apply flex flex-col gap-3;
}

.provider-dashboard-hint {
  @apply text-xs text-zinc-400 mt-0;
}

.provider-dashboard-error {
  @apply text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2;
}

.provider-card-grid {
  @apply grid gap-2;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.provider-stats-grid {
  @apply grid gap-2;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.provider-stat-card {
  @apply rounded-xl border border-sky-100 bg-sky-50 p-3 shadow-sm flex flex-col gap-1;
}

.provider-stat-value {
  @apply text-2xl font-semibold text-sky-700 leading-none;
}

.provider-stat-label {
  @apply text-xs text-sky-600;
}

.provider-stats-note {
  @apply text-xs text-zinc-400;
}

/* Dark mode */
:root.dark .provider-dashboard-tabs {
  @apply border-zinc-700;
}

:root.dark .provider-tab-btn.is-active {
  @apply text-zinc-100 border-zinc-700 border-b-zinc-800 bg-zinc-800;
}

:root.dark .provider-tab-btn:not(.is-active) {
  @apply text-zinc-500 hover:text-zinc-300;
}

:root.dark .provider-dashboard-error {
  @apply text-amber-400 bg-amber-950 border-amber-800;
}

:root.dark .provider-stat-card {
  @apply border-sky-900 bg-sky-950;
}

:root.dark .provider-stat-value {
  @apply text-sky-300;
}

:root.dark .provider-stat-label {
  @apply text-sky-400;
}

:root.dark .provider-stats-note {
  @apply text-zinc-500;
}

:root.dark .provider-dashboard-hint {
  @apply text-zinc-500;
}
</style>
