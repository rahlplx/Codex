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

async function loadTenants() {
  loading.value = true
  try {
    tenants.value = await agentFetch<Tenant[]>('/admin/tenants')
  } catch {}
  loading.value = false
}

async function updateRole(id: string, role: string) {
  await agentFetch(`/admin/tenants/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
  await loadTenants()
}

onMounted(() => { if (isAdmin.value) loadTenants() })
</script>

<template>
  <div class="codex-agent-admin">
    <div v-if="!isAdmin" class="access-denied">
      <p>Access denied. Admin privileges required.</p>
    </div>
    <div v-else>
      <h3>Tenant Management</h3>
      <div v-if="loading">Loading...</div>
      <table v-else class="tenant-table">
        <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Tokens (24h)</th><th>Requests (24h)</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="t in tenants" :key="t.id">
            <td>{{ t.email }}</td>
            <td>{{ t.display_name }}</td>
            <td>{{ t.role }}</td>
            <td>{{ t.total_tokens }}</td>
            <td>{{ t.total_requests }}</td>
            <td>
              <button v-if="t.role === 'user'" @click="updateRole(t.id, 'admin')">Make Admin</button>
              <button v-else @click="updateRole(t.id, 'user')">Demote</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
