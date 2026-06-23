<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCodexAgent } from '../../composables/useCodexAgent'

const { agentFetch } = useCodexAgent()

interface Ranking {
  model: string
  provider: string
  success_rate: number
  avg_latency_ms: number
  total_tokens: number
  total_requests: number
}

interface UsageDay {
  date: string
  requests: number
  total_tokens: number
  cost_usd: number
}

interface ReliabilityRow {
  provider: string
  success_rate: number
  total_requests: number
}

const rankings = ref<Ranking[]>([])
const usage = ref<UsageDay[]>([])
const reliability = ref<ReliabilityRow[]>([])
const loading = ref(false)
const error = ref('')

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [r, u, rel] = await Promise.all([
      agentFetch<Ranking[]>('/telemetry/rankings'),
      agentFetch<UsageDay[]>('/telemetry/usage?days=7'),
      agentFetch<ReliabilityRow[]>('/telemetry/reliability'),
    ])
    rankings.value = r
    usage.value = u
    reliability.value = rel
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load telemetry'
  }
  loading.value = false
}

const totalRequests = () => usage.value.reduce((s, d) => s + d.requests, 0)
const totalTokens = () => usage.value.reduce((s, d) => s + d.total_tokens, 0)
const totalCost = () => usage.value.reduce((s, d) => s + d.cost_usd, 0)

onMounted(loadData)
</script>

<template>
  <div class="codex-agent-telemetry">
    <div v-if="error" class="codex-agent-error">{{ error }}</div>
    <div v-if="loading" class="codex-agent-loading">Loading telemetry...</div>
    <template v-else>
      <div class="codex-agent-stats">
        <div class="codex-agent-stat-card">
          <span class="codex-agent-stat-value">{{ totalRequests().toLocaleString() }}</span>
          <span class="codex-agent-stat-label">Requests (7d)</span>
        </div>
        <div class="codex-agent-stat-card">
          <span class="codex-agent-stat-value">{{ (totalTokens() / 1000).toFixed(1) }}k</span>
          <span class="codex-agent-stat-label">Tokens (7d)</span>
        </div>
        <div class="codex-agent-stat-card">
          <span class="codex-agent-stat-value">${{ totalCost().toFixed(4) }}</span>
          <span class="codex-agent-stat-label">Cost (7d)</span>
        </div>
      </div>

      <section class="codex-agent-section">
        <h3 class="codex-agent-section-title">Model Rankings</h3>
        <div v-if="rankings.length === 0" class="codex-agent-empty">No usage data yet.</div>
        <table v-else class="codex-agent-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Model</th>
              <th>Provider</th>
              <th>Success</th>
              <th>Avg Latency</th>
              <th>Tokens</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rankings" :key="r.model">
              <td class="rank-cell">#{{ i + 1 }}</td>
              <td class="model-cell">{{ r.model }}</td>
              <td><span class="codex-agent-badge">{{ r.provider }}</span></td>
              <td>
                <span class="codex-agent-success-badge" :class="{ 'is-good': r.success_rate >= 95, 'is-warn': r.success_rate >= 80 && r.success_rate < 95, 'is-bad': r.success_rate < 80 }">
                  {{ r.success_rate.toFixed(1) }}%
                </span>
              </td>
              <td>{{ r.avg_latency_ms }}ms</td>
              <td>{{ r.total_tokens.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="codex-agent-section">
        <h3 class="codex-agent-section-title">Provider Reliability</h3>
        <div v-if="reliability.length === 0" class="codex-agent-empty">No reliability data yet.</div>
        <table v-else class="codex-agent-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Success Rate</th>
              <th>Total Requests</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reliability" :key="r.provider">
              <td>{{ r.provider }}</td>
              <td>
                <div class="reliability-bar-wrap">
                  <div class="reliability-bar" :style="{ width: r.success_rate + '%' }" :class="{ 'is-good': r.success_rate >= 95, 'is-warn': r.success_rate >= 80 && r.success_rate < 95, 'is-bad': r.success_rate < 80 }"></div>
                  <span class="reliability-label">{{ r.success_rate.toFixed(1) }}%</span>
                </div>
              </td>
              <td>{{ r.total_requests.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="codex-agent-section">
        <h3 class="codex-agent-section-title">Daily Usage (7 days)</h3>
        <div v-if="usage.length === 0" class="codex-agent-empty">No usage data yet.</div>
        <table v-else class="codex-agent-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Requests</th>
              <th>Tokens</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="day in usage" :key="day.date">
              <td>{{ day.date }}</td>
              <td>{{ day.requests.toLocaleString() }}</td>
              <td>{{ day.total_tokens.toLocaleString() }}</td>
              <td>${{ day.cost_usd.toFixed(4) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.codex-agent-telemetry {
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
:root.dark .codex-agent-stat-value { color: #f4f4f5; }
.codex-agent-stat-label {
  font-size: 12px;
  color: var(--color-text-secondary, #71717a);
  margin-top: 4px;
}

.codex-agent-section {
  margin-bottom: 32px;
}
.codex-agent-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary, #18181b);
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border, #e4e4e7);
}
:root.dark .codex-agent-section-title {
  color: #f4f4f5;
  border-color: #3f3f46;
}

.codex-agent-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.codex-agent-table th {
  text-align: left;
  padding: 10px 12px;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary, #71717a);
  border-bottom: 1px solid var(--color-border, #e4e4e7);
}
:root.dark .codex-agent-table th { border-color: #3f3f46; }
.codex-agent-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border, #f4f4f5);
  color: var(--color-text-primary, #27272a);
}
:root.dark .codex-agent-table td {
  border-color: #27272a;
  color: #e4e4e7;
}

.rank-cell { font-weight: 700; color: var(--color-text-secondary, #71717a); }
.model-cell { font-family: monospace; font-size: 12px; }

.codex-agent-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  background: #f4f4f5;
  color: #52525b;
}
:root.dark .codex-agent-badge { background: #3f3f46; color: #a1a1aa; }

.codex-agent-success-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}
.codex-agent-success-badge.is-good { background: #ecfdf5; color: #059669; }
.codex-agent-success-badge.is-warn { background: #fffbeb; color: #d97706; }
.codex-agent-success-badge.is-bad { background: #fef2f2; color: #dc2626; }
:root.dark .codex-agent-success-badge.is-good { background: rgba(16, 185, 129, 0.15); color: #34d399; }
:root.dark .codex-agent-success-badge.is-warn { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
:root.dark .codex-agent-success-badge.is-bad { background: rgba(239, 68, 68, 0.15); color: #f87171; }

.reliability-bar-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.reliability-bar {
  height: 6px;
  border-radius: 3px;
  max-width: 120px;
  min-width: 4px;
}
.reliability-bar.is-good { background: #10b981; }
.reliability-bar.is-warn { background: #f59e0b; }
.reliability-bar.is-bad { background: #ef4444; }
.reliability-label { font-size: 12px; color: var(--color-text-secondary, #71717a); }
</style>
