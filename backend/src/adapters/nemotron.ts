import { AdapterBase } from './base'
import type {
  HealthStatus, QuotaStatus, Model,
  ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk
} from '../types/adapter'

export class NemotronAdapter extends AdapterBase {
  readonly id = 'nemotron'
  readonly name = 'NVIDIA NIM (Nemotron)'
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = false

  private get url(): string {
    return this.baseUrl('https://integrate.api.nvidia.com/v1')
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.url}/models`, { signal: AbortSignal.timeout(5000) })
      return { healthy: res.ok, latencyMs: Date.now() - start, score: res.ok ? 80 : 0 }
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - start, score: 0, error: String(err) }
    }
  }

  async getQuota(): Promise<QuotaStatus> {
    return { unlimited: true, remaining: null, resetAt: null }
  }

  async supportedModels(): Promise<Model[]> {
    return [
      { id: 'nvidia/nemotron-3-super', name: 'Nemotron 3 Super', contextWindow: 32768, supportsStreaming: true, supportsToolUse: false, supportsReasoning: true },
      { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', name: 'Llama 3.3 Nemotron Super 49B', contextWindow: 131072, supportsStreaming: true, supportsToolUse: false, supportsReasoning: true },
    ]
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    return this.fetchJson(`${this.url}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model || 'nvidia/nemotron-3-super',
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: false,
      }),
    })
  }

  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const res = await fetch(`${this.url}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model || 'nvidia/nemotron-3-super',
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: true,
      }),
    })
    if (!res.ok || !res.body) throw new Error(`NIM stream error: HTTP ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (let line of lines) {
          if (line.endsWith('\r')) line = line.slice(0, -1)
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue
          try { yield JSON.parse(line.slice(6)) as ChatCompletionChunk } catch {}
        }
      }
    } finally {
      try { await reader.cancel() } catch {}
      reader.releaseLock()
    }
  }
}
