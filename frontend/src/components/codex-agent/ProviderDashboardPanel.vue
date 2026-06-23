<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

async function loadProviders() {
  loading.value = true
  try {
    const data = await agentFetch<{ providers: Provider[] }>('/providers')
    providers.value = data.providers
  } catch {}
  loading.value = false
}

onMounted(loadProviders)
</script>

<template>
  <div class="codex-agent-providers">
    <div v-if="loading">Loading providers...</div>
    <template v-else>
      <div class="health-summary">
        <span class="stat healthy">{{ providers.filter(p => p.health?.healthy).length }} Active</span>
        <span class="stat unhealthy">{{ providers.filter(p => !p.health?.healthy).length }} Down</span>
      </div>
      <div class="provider-grid">
        <div v-for="p in providers" :key="p.id" class="provider-card" :class="{ healthy: p.health?.healthy, unhealthy: !p.health?.healthy }">
          <h4>{{ p.name }}</h4>
          <span class="tier-badge">{{ p.tier }}</span>
          <div class="metrics">
            <span v-if="p.health">{{ p.health.latencyMs }}ms</span>
            <span v-if="p.health">Score: {{ p.health.score }}</span>
          </div>
          <div class="models">{{ p.models.length }} models</div>
        </div>
      </div>
    </template>
  </div>
</template>
