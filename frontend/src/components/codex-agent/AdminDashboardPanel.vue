<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCodexAgent } from '../../composables/useCodexAgent'

const { isAdmin, agentFetch } = useCodexAgent()

interface Tenant {
  id: string
  email: string
  display_name: string
  role: string
  total_tokens: number
  total_requests: number
}

const tenants = ref<Tenant[]>([])
const loading = ref(false)
const error = ref('')

async function loadTenants() {
  loading.value = true
  error.value = ''
  try {
    tenants.value = await agentFetch<Tenant[]>('/admin/tenants')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    if (msg.includes('403')) {
      error.value = 'Access denied. Admin privileges required.'
    } else {
      error.value = msg
    }
  }
  loading.value = false
}

async function updateRole(id: string, role: string) {
  error.value = ''
  try {
    await agentFetch(`/admin/tenants/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
    await loadTenants()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    if (msg.includes('403')) {
      error.value = 'Permission denied for this action.'
    } else {
      error.value = msg
    }
  }
}

onMounted(() => { if (isAdmin.value) loadTenants() })
</script>

<template>
  <div class="codex-agent-admin">
    <div v-if="!isAdmin" class="codex-agent-access-denied">
      <div class="codex-agent-access-denied-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21A12 12 0 0 1 3.5 6A12 12 0 0 0 12 3M12 11l0 .01M12 8v3" />
        </svg>
      </div>
      <h3 class="codex-agent-access-denied-title">Admin Access Required</h3>
      <p class="codex-agent-access-denied-text">This section is restricted to administrators. Contact your admin to request access.</p>
    </div>
    <div v-else class="codex-agent-admin-content">
      <div v-if="error" class="codex-agent-error">{{ error }}</div>
      <div v-if="loading" class="codex-agent-loading">Loading tenants...</div>
      <template v-else-if="tenants.length > 0">
        <div class="codex-agent-admin-stats">
          <div class="codex-agent-stat-card">
            <span class="codex-agent-stat-value">{{ tenants.length }}</span>
            <span class="codex-agent-stat-label">Total Users</span>
          </div>
          <div class="codex-agent-stat-card">
            <span class="codex-agent-stat-value">{{ tenants.filter(t => t.role === 'admin').length }}</span>
            <span class="codex-agent-stat-label">Admins</span>
          </div>
          <div class="codex-agent-stat-card">
            <span class="codex-agent-stat-value">{{ tenants.reduce((s, t) => s + t.total_requests, 0) }}</span>
            <span class="codex-agent-stat-label">Requests (24h)</span>
          </div>
        </div>
        <table class="codex-agent-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Tokens (24h)</th>
              <th>Requests (24h)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tenants" :key="t.id">
              <td>{{ t.email }}</td>
              <td>{{ t.display_name }}</td>
              <td>
                <span class="codex-agent-role-badge" :class="{ 'is-admin': t.role === 'admin' }">{{ t.role }}</span>
              </td>
              <td>{{ t.total_tokens.toLocaleString() }}</td>
              <td>{{ t.total_requests }}</td>
              <td>
                <button
                  v-if="t.role === 'user'"
                  class="codex-agent-action-btn codex-agent-action-promote"
                  @click="updateRole(t.id, 'admin')"
                >Promote</button>
                <button
                  v-else
                  class="codex-agent-action-btn codex-agent-action-demote"
                  @click="updateRole(t.id, 'user')"
                >Demote</button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="codex-agent-empty">No tenants registered yet.</div>
    </div>
  </div>
</template>

<style scoped>
.codex-agent-admin {
  padding: 24px;
  max-width: 960px;
  margin: 0 auto;
}

.codex-agent-access-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-secondary, #71717a);
}
.codex-agent-access-denied-icon {
  color: var(--color-text-tertiary, #a1a1aa);
  margin-bottom: 16px;
}
.codex-agent-access-denied-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text-primary, #27272a);
  margin: 0 0 8px;
}
.codex-agent-access-denied-text {
  font-size: 14px;
  margin: 0;
  max-width: 360px;
}
:root.dark .codex-agent-access-denied-title { color: #e4e4e7; }
:root.dark .codex-agent-access-denied { color: #a1a1aa; }

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

.codex-agent-admin-stats {
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

.codex-agent-role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  background: #f4f4f5;
  color: #52525b;
}
.codex-agent-role-badge.is-admin {
  background: #ecfdf5;
  color: #059669;
}
:root.dark .codex-agent-role-badge { background: #3f3f46; color: #a1a1aa; }
:root.dark .codex-agent-role-badge.is-admin { background: rgba(16, 185, 129, 0.15); color: #34d399; }

.codex-agent-action-btn {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--color-border, #e4e4e7);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
}
.codex-agent-action-promote { color: #059669; border-color: #a7f3d0; }
.codex-agent-action-promote:hover { background: #ecfdf5; }
.codex-agent-action-demote { color: #dc2626; border-color: #fecaca; }
.codex-agent-action-demote:hover { background: #fef2f2; }
:root.dark .codex-agent-action-promote { color: #34d399; border-color: rgba(52, 211, 153, 0.3); }
:root.dark .codex-agent-action-promote:hover { background: rgba(16, 185, 129, 0.1); }
:root.dark .codex-agent-action-demote { color: #f87171; border-color: rgba(248, 113, 113, 0.3); }
:root.dark .codex-agent-action-demote:hover { background: rgba(239, 68, 68, 0.1); }
</style>
