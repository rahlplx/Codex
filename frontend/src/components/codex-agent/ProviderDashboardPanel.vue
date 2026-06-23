<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useCodexAgent } from '../../composables/useCodexAgent'

const { agentFetch } = useCodexAgent()

interface Provider {
  id: string
  name: string
  tier: string
  health: { healthy: boolean; latencyMs: number; score: number } | null
  quota: { unlimited: boolean; remaining: number | null } | null
  models: Array<{ id: string; name: string }>
  enabled: boolean
}

const providers = ref<Provider[]>([])
const loading = ref(false)
const error = ref('')
let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadProviders() {
  loading.value = true
  error.value = ''
  try {
    const data = await agentFetch<{ providers: Provider[] }>('/providers')
    providers.value = data.providers
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load providers'
  }
  loading.value = false
}

const healthyCount = () => providers.value.filter(p => p.health?.healthy).length
const totalModels = () => providers.value.reduce((s, p) => s + p.models.length, 0)

function tierLabel(tier: string) {
  return tier === 'free' ? 'Free' : tier === 'freemium' ? 'Freemium' : tier
}

function quotaLabel(p: Provider): string {
  if (!p.quota) return '—'
  if (p.quota.unlimited) return 'Unlimited'
  if (p.quota.remaining === null) return 'Unknown'
  return p.quota.remaining.toLocaleString() + ' remaining'
}

onMounted(() => {
  loadProviders()
  pollTimer = setInterval(loadProviders, 30_000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="codex-agent-providers">
    <div v-if="error" class="codex-agent-error">{{ error }}</div>
    <div v-if="loading && providers.length === 0" class="codex-agent-loading">Loading providers...</div>
    <template v-else>
      <div class="codex-agent-stats">
        <div class="codex-agent-stat-card">
          <span class="codex-agent-stat-value">{{ providers.length }}</span>
          <span class="codex-agent-stat-label">Providers</span>
        </div>
        <div class="codex-agent-stat-card">
          <span class="codex-agent-stat-value is-healthy">{{ healthyCount() }}</span>
          <span class="codex-agent-stat-label">Active</span>
        </div>
        <div class="codex-agent-stat-card">
          <span class="codex-agent-stat-value">{{ totalModels() }}</span>
          <span class="codex-agent-stat-label">Models</span>
        </div>
      </div>

      <div v-if="providers.length === 0" class="codex-agent-empty">No providers registered.</div>
      <div v-else class="provider-list">
        <div
          v-for="p in providers"
          :key="p.id"
          class="provider-row"
          :class="{ 'is-healthy': p.health?.healthy, 'is-offline': p.health && !p.health.healthy }"
        >
          <div class="provider-row-left">
            <span class="provider-health-dot" :class="{ 'dot-green': p.health?.healthy, 'dot-red': p.health && !p.health.healthy, 'dot-zinc': !p.health }"></span>
            <div class="provider-info">
              <span class="provider-name">{{ p.name }}</span>
              <span class="provider-id">{{ p.id }}</span>
            </div>
          </div>
          <div class="provider-row-right">
            <span class="codex-agent-tier-badge" :class="{ 'is-free': p.tier === 'free', 'is-freemium': p.tier === 'freemium' }">{{ tierLabel(p.tier) }}</span>
            <span class="provider-metric" v-if="p.health">{{ p.health.latencyMs }}ms</span>
            <span class="provider-metric" v-if="p.health">Score {{ p.health.score }}</span>
            <span class="provider-models">{{ p.models.length }} model{{ p.models.length !== 1 ? 's' : '' }}</span>
            <span class="provider-quota">{{ quotaLabel(p) }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.codex-agent-providers {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

.codex-agent-error {
  padding: 12px 16px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  margin-bottom: 16px;
  border: 1px solid #fecaca;
}
:root.dark .codex-agent-error {
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.2);
}

.codex-agent-loading, .codex-agent-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-secondary, #71717a);
  font-size: 14px;
}

.codex-agent-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.codex-agent-stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border-radius: 12px;
  background: var(--color-bg-secondary, #f4f4f5);
  border: 1px solid var(--color-border, #e4e4e7);
}
:root.dark .codex-agent-stat-card {
  background: #27272a;
  border-color: #3f3f46;
}
.codex-agent-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary, #18181b);
}
.codex-agent-stat-value.is-healthy { color: #059669; }
:root.dark .codex-agent-stat-value { color: #f4f4f5; }
:root.dark .codex-agent-stat-value.is-healthy { color: #34d399; }
.codex-agent-stat-label {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
  margin-top: 4px;
}

.provider-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.provider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e4e4e7);
  background: #fff;
  gap: 12px;
}
:root.dark .provider-row {
  background: #1c1c1e;
  border-color: #3f3f46;
}
.provider-row.is-offline {
  border-color: #fecaca;
  background: #fff8f8;
}
:root.dark .provider-row.is-offline {
  border-color: rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.04);
}

.provider-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.provider-health-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-green { background: #10b981; }
.dot-red { background: #ef4444; }
.dot-zinc { background: #a1a1aa; }

.provider-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.provider-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary, #18181b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:root.dark .provider-name { color: #f4f4f5; }
.provider-id {
  font-size: 11px;
  color: var(--color-text-secondary, #71717a);
  font-family: monospace;
}

.provider-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.provider-metric {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
}
.provider-models {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
  white-space: nowrap;
}
.provider-quota {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
  white-space: nowrap;
}

.codex-agent-tier-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  background: #f4f4f5;
  color: #52525b;
  white-space: nowrap;
}
.codex-agent-tier-badge.is-free { background: #ecfdf5; color: #059669; }
.codex-agent-tier-badge.is-freemium { background: #eff6ff; color: #2563eb; }
:root.dark .codex-agent-tier-badge { background: #3f3f46; color: #a1a1aa; }
:root.dark .codex-agent-tier-badge.is-free { background: rgba(16, 185, 129, 0.15); color: #34d399; }
:root.dark .codex-agent-tier-badge.is-freemium { background: rgba(37, 99, 235, 0.15); color: #60a5fa; }
</style>
