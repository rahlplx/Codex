<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCodexAgent } from '../../composables/useCodexAgent'

const { agentFetch } = useCodexAgent()

const rankings = ref<Array<{ model: string; success_rate: number; avg_latency_ms: number; total_tokens: number }>>([])
const usage = ref<Array<{ date: string; requests: number; total_tokens: number }>>([])
const loading = ref(false)

async function loadData() {
  loading.value = true
  try {
    const [r, u] = await Promise.all([
      agentFetch<typeof rankings.value>('/telemetry/rankings'),
      agentFetch<typeof usage.value>('/telemetry/usage?days=7'),
    ])
    rankings.value = r
    usage.value = u
  } catch {}
  loading.value = false
}

onMounted(loadData)
</script>

<template>
  <div class="codex-agent-telemetry">
    <div v-if="loading">Loading telemetry...</div>
    <template v-else>
      <section>
        <h3>Model Rankings</h3>
        <div v-if="rankings.length === 0" class="empty-state">No usage data yet.</div>
        <div v-for="(r, i) in rankings" :key="r.model" class="ranking-row">
          <span class="rank">#{{ i + 1 }}</span>
          <span class="model-name">{{ r.model }}</span>
          <span class="metric">{{ r.success_rate }}%</span>
          <span class="metric">{{ r.avg_latency_ms }}ms</span>
        </div>
      </section>
      <section>
        <h3>Daily Usage (7 days)</h3>
        <div v-if="usage.length === 0" class="empty-state">No usage data yet.</div>
        <div v-for="day in usage" :key="day.date" class="usage-row">
          <span>{{ day.date }}</span>
          <span>{{ day.requests }} requests</span>
          <span>{{ day.total_tokens }} tokens</span>
        </div>
      </section>
    </template>
  </div>
</template>
