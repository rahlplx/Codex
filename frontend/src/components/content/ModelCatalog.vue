<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface ModelEntry {
  id: string
  name: string
  provider: string
  tier: 'free' | 'freemium' | 'paid'
  contextWindow: number | null
  supportsStreaming: boolean
  supportsToolUse: boolean
}

const models = ref<ModelEntry[]>([])
const isLoading = ref(false)
const loadError = ref<string | null>(null)

const searchQuery = ref('')
const filterTier = ref<'all' | 'free' | 'freemium' | 'paid'>('all')
const filterProvider = ref<string>('all')
const sortKey = ref<'name' | 'provider' | 'context'>('name')

async function fetchModels() {
  isLoading.value = true
  loadError.value = null
  try {
    const res = await fetch('/api/models')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    models.value = Array.isArray(data) ? data : []
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load models'
    models.value = []
  } finally {
    isLoading.value = false
  }
}

const providers = computed(() => {
  const set = new Set(models.value.map(m => m.provider))
  return ['all', ...Array.from(set).sort()]
})

const filteredModels = computed(() => {
  let list = models.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(m =>
      m.id.toLowerCase().includes(q) ||
      m.name.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q)
    )
  }

  if (filterTier.value !== 'all') {
    list = list.filter(m => m.tier === filterTier.value)
  }

  if (filterProvider.value !== 'all') {
    list = list.filter(m => m.provider === filterProvider.value)
  }

  return [...list].sort((a, b) => {
    if (sortKey.value === 'name') return a.name.localeCompare(b.name)
    if (sortKey.value === 'provider') return a.provider.localeCompare(b.provider)
    if (sortKey.value === 'context') {
      const ca = a.contextWindow ?? 0
      const cb = b.contextWindow ?? 0
      return cb - ca
    }
    return 0
  })
})

function formatContext(n: number | null): string {
  if (n === null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

onMounted(fetchModels)
</script>

<template>
  <div class="model-catalog">
    <div class="model-catalog-toolbar">
      <input
        v-model="searchQuery"
        class="model-catalog-search"
        type="search"
        placeholder="Search models..."
        aria-label="Search models"
      />
      <div class="model-catalog-filters" role="group" aria-label="Filter by tier">
        <button
          v-for="t in (['all', 'free', 'freemium', 'paid'] as const)"
          :key="t"
          type="button"
          class="model-filter-chip"
          :class="{ 'is-active': filterTier === t }"
          @click="filterTier = t"
        >{{ t === 'all' ? 'All tiers' : t }}</button>
      </div>
      <div v-if="providers.length > 1" class="model-catalog-filters" role="group" aria-label="Filter by provider">
        <button
          v-for="p in providers"
          :key="p"
          type="button"
          class="model-filter-chip"
          :class="{ 'is-active': filterProvider === p }"
          @click="filterProvider = p"
        >{{ p === 'all' ? 'All providers' : p }}</button>
      </div>
    </div>

    <p v-if="loadError" class="model-catalog-error">
      {{ loadError }}
    </p>

    <div v-if="isLoading && models.length === 0" class="model-catalog-empty">
      Loading models...
    </div>

    <div v-else-if="!isLoading && models.length === 0" class="model-catalog-empty">
      <p>No models available.</p>
      <span>Start the backend to load live data.</span>
    </div>

    <div v-else-if="filteredModels.length === 0" class="model-catalog-empty">
      No models match your filters.
    </div>

    <div v-else class="model-catalog-table-wrap">
      <table class="model-catalog-table">
        <thead>
          <tr>
            <th>
              <button type="button" class="model-sort-btn" :class="{ 'is-active': sortKey === 'name' }" @click="sortKey = 'name'">
                Model
              </button>
            </th>
            <th>
              <button type="button" class="model-sort-btn" :class="{ 'is-active': sortKey === 'provider' }" @click="sortKey = 'provider'">
                Provider
              </button>
            </th>
            <th>Tier</th>
            <th>
              <button type="button" class="model-sort-btn" :class="{ 'is-active': sortKey === 'context' }" @click="sortKey = 'context'">
                Context
              </button>
            </th>
            <th>Caps</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in filteredModels" :key="m.id" class="model-row">
            <td>
              <span class="model-id">{{ m.id }}</span>
              <span v-if="m.name !== m.id" class="model-name">{{ m.name }}</span>
            </td>
            <td class="model-provider">{{ m.provider }}</td>
            <td>
              <span class="model-tier-badge" :data-tier="m.tier">{{ m.tier }}</span>
            </td>
            <td class="model-context">{{ formatContext(m.contextWindow) }}</td>
            <td class="model-caps">
              <span v-if="m.supportsStreaming" class="model-cap-icon" title="Streaming">S</span>
              <span v-if="m.supportsToolUse" class="model-cap-icon" title="Tool use">T</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.model-catalog {
  @apply flex flex-col gap-3 p-3 sm:p-4 min-h-0 flex-1 overflow-y-auto;
}

.model-catalog-toolbar {
  @apply flex flex-col gap-2;
}

.model-catalog-search {
  @apply w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300;
}

.model-catalog-filters {
  @apply flex flex-wrap gap-1.5;
}

.model-filter-chip {
  @apply rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 transition cursor-pointer hover:border-zinc-300 hover:bg-zinc-100;
}

.model-filter-chip.is-active {
  @apply border-zinc-800 bg-zinc-900 text-zinc-100;
}

.model-catalog-error {
  @apply text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2;
}

.model-catalog-empty {
  @apply flex flex-col items-center justify-center gap-1.5 py-12 text-center;
}

.model-catalog-empty p {
  @apply text-sm font-medium text-zinc-600;
}

.model-catalog-empty span {
  @apply text-xs text-zinc-400;
}

.model-catalog-table-wrap {
  @apply overflow-x-auto rounded-xl border border-zinc-200;
}

.model-catalog-table {
  @apply w-full text-xs border-collapse;
}

.model-catalog-table thead {
  @apply bg-zinc-50 border-b border-zinc-200;
}

.model-catalog-table th {
  @apply px-3 py-2 text-left font-medium text-zinc-500 whitespace-nowrap;
}

.model-sort-btn {
  @apply font-medium text-zinc-500 hover:text-zinc-700 transition cursor-pointer;
}

.model-sort-btn.is-active {
  @apply text-zinc-900 underline underline-offset-2;
}

.model-row {
  @apply border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition;
}

.model-row td {
  @apply px-3 py-2 align-middle;
}

.model-id {
  @apply font-mono text-zinc-800 text-[11px];
}

.model-name {
  @apply block text-zinc-400 text-[10px] mt-0.5;
}

.model-provider {
  @apply text-zinc-600 whitespace-nowrap;
}

.model-context {
  @apply text-zinc-500 font-mono whitespace-nowrap;
}

.model-tier-badge {
  @apply rounded-full border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide;
}

.model-tier-badge[data-tier="free"] {
  @apply border-emerald-200 bg-emerald-50 text-emerald-700;
}

.model-tier-badge[data-tier="freemium"] {
  @apply border-amber-200 bg-amber-50 text-amber-700;
}

.model-tier-badge[data-tier="paid"] {
  @apply border-zinc-200 bg-zinc-50 text-zinc-600;
}

.model-caps {
  @apply flex gap-1;
}

.model-cap-icon {
  @apply rounded border border-zinc-200 bg-zinc-50 px-1 py-0.5 text-[10px] font-bold text-zinc-500;
}

/* Dark mode */
:root.dark .model-catalog-search {
  @apply border-zinc-600 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-zinc-600;
}

:root.dark .model-filter-chip {
  @apply border-zinc-600 bg-zinc-700 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-600;
}

:root.dark .model-filter-chip.is-active {
  @apply border-zinc-300 bg-zinc-100 text-zinc-900;
}

:root.dark .model-catalog-error {
  @apply text-amber-400 bg-amber-950 border-amber-800;
}

:root.dark .model-catalog-empty p {
  @apply text-zinc-400;
}

:root.dark .model-catalog-empty span {
  @apply text-zinc-500;
}

:root.dark .model-catalog-table-wrap {
  @apply border-zinc-700;
}

:root.dark .model-catalog-table thead {
  @apply bg-zinc-800 border-zinc-700;
}

:root.dark .model-catalog-table th {
  @apply text-zinc-400;
}

:root.dark .model-sort-btn {
  @apply text-zinc-400 hover:text-zinc-200;
}

:root.dark .model-sort-btn.is-active {
  @apply text-zinc-100;
}

:root.dark .model-row {
  @apply border-zinc-700 hover:bg-zinc-700/40;
}

:root.dark .model-id {
  @apply text-zinc-200;
}

:root.dark .model-name {
  @apply text-zinc-500;
}

:root.dark .model-provider {
  @apply text-zinc-400;
}

:root.dark .model-context {
  @apply text-zinc-500;
}

:root.dark .model-tier-badge[data-tier="free"] {
  @apply border-emerald-800 bg-emerald-950 text-emerald-300;
}

:root.dark .model-tier-badge[data-tier="freemium"] {
  @apply border-amber-800 bg-amber-950 text-amber-300;
}

:root.dark .model-tier-badge[data-tier="paid"] {
  @apply border-zinc-600 bg-zinc-700 text-zinc-400;
}

:root.dark .model-cap-icon {
  @apply border-zinc-600 bg-zinc-700 text-zinc-400;
}
</style>
