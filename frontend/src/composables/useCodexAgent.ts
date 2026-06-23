import { ref, computed } from 'vue'

interface AgentUser {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'user'
}

const currentUser = ref<AgentUser | null>(null)

const raw = localStorage.getItem('codex_agent_user')
if (raw) {
  try { currentUser.value = JSON.parse(raw) } catch {}
}

async function agentFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('codex_agent_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> ?? {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`/api${path}`, { ...options, headers })
  if (res.status === 401) {
    agentLogout()
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`)
  return res.json() as Promise<T>
}

async function agentLogin(email: string, password: string) {
  const data = await agentFetch<{ token: string; user: AgentUser }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
  localStorage.setItem('codex_agent_token', data.token)
  localStorage.setItem('codex_agent_user', JSON.stringify(data.user))
  currentUser.value = data.user
  return data
}

async function agentRegister(email: string, password: string, displayName: string) {
  const data = await agentFetch<{ token: string; user: AgentUser }>('/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password, displayName }),
  })
  localStorage.setItem('codex_agent_token', data.token)
  localStorage.setItem('codex_agent_user', JSON.stringify(data.user))
  currentUser.value = data.user
  return data
}

function agentLogout() {
  localStorage.removeItem('codex_agent_token')
  localStorage.removeItem('codex_agent_user')
  currentUser.value = null
}

export function useCodexAgent() {
  return {
    currentUser,
    isAdmin: computed(() => currentUser.value?.role === 'admin'),
    isAuthenticated: computed(() => currentUser.value !== null),
    agentFetch,
    agentLogin,
    agentRegister,
    agentLogout,
  }
}
