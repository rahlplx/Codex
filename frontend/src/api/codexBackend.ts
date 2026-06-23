export interface ApiThread {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
  archived: boolean
}

export interface ApiMessage {
  id: string
  threadId: string
  role: 'system' | 'user' | 'assistant'
  content: string
  providerId?: string
  modelId?: string
  ts: string
}

export interface ApiModel {
  id: string
  name: string
  provider: string
  contextWindow: number
  supportsStreaming: boolean
  supportsToolUse: boolean
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  threads: {
    list(userId = 'default'): Promise<ApiThread[]> {
      return request<ApiThread[]>(`/api/threads?userId=${encodeURIComponent(userId)}`)
    },
    create(title: string, userId = 'default'): Promise<ApiThread> {
      return request<ApiThread>('/api/threads', {
        method: 'POST',
        body: JSON.stringify({ title, userId }),
      })
    },
    update(id: string, patch: Partial<Pick<ApiThread, 'title' | 'archived'>>): Promise<ApiThread> {
      return request<ApiThread>(`/api/threads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
    },
    delete(id: string): Promise<void> {
      return request<void>(`/api/threads/${id}`, { method: 'DELETE' })
    },
  },

  messages: {
    list(threadId: string): Promise<ApiMessage[]> {
      return request<ApiMessage[]>(`/api/threads/${threadId}/messages`)
    },
    create(threadId: string, msg: {
      role: string; content: string; providerId?: string; modelId?: string
    }): Promise<ApiMessage> {
      return request<ApiMessage>(`/api/threads/${threadId}/messages`, {
        method: 'POST',
        body: JSON.stringify(msg),
      })
    },
  },

  models: {
    list(): Promise<ApiModel[]> {
      return request<ApiModel[]>('/api/models')
    },
  },

  async *stream(
    messages: Array<{ role: string; content: string }>,
    model?: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const res = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, stream: true }),
      signal,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(text || `HTTP ${res.status}`)
    }
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') return
          try {
            const chunk = JSON.parse(data) as { choices: Array<{ delta: { content?: string } }> }
            const content = chunk.choices[0]?.delta?.content
            if (content) yield content
          } catch { /* skip malformed */ }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },
}
