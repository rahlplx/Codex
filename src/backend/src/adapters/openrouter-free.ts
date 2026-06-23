import { BaseAdapter } from './base.js';
import { PROVIDER_URLS } from '@codex/shared';
import type {
  Model,
  HealthStatus,
  QuotaStatus,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
} from '@codex/shared';

export class OpenRouterFreeAdapter extends BaseAdapter {
  readonly id = 'openrouter-free';
  readonly name = 'OpenRouter Free';
  readonly tier = 'free' as const;
  readonly supportsStreaming = true;
  readonly supportsToolUse = true;
  readonly supportsReasoning = false;

  private baseUrl = PROVIDER_URLS['openrouter-free'];
  private keys: string[] = [];
  private currentKeyIndex = 0;

  override async initialize(config: import('@codex/shared').AdapterConfig): Promise<void> {
    await super.initialize(config);
    // Keys loaded from config or environment
    const keyStr = process.env['OPENROUTER_FREE_KEYS'] ?? '';
    this.keys = keyStr.split(',').filter(Boolean);
    this.currentKeyIndex = Math.floor(Math.random() * Math.max(this.keys.length, 1));
  }

  private getNextKey(): string | undefined {
    if (this.keys.length === 0) return undefined;
    const key = this.keys[this.currentKeyIndex % this.keys.length];
    this.currentKeyIndex++;
    return key;
  }

  private rotateKey(): void {
    this.currentKeyIndex++;
  }

  async supportedModels(): Promise<Model[]> {
    return [
      {
        id: 'meta-llama/llama-3.3-70b:free',
        name: 'Llama 3.3 70B',
        provider: this.id,
        contextWindow: 128_000,
        supportsStreaming: true,
        supportsToolUse: true,
        supportsReasoning: false,
      },
      {
        id: 'google/gemma-4-26b:free',
        name: 'Gemma 4 26B',
        provider: this.id,
        contextWindow: 96_000,
        supportsStreaming: true,
        supportsToolUse: false,
        supportsReasoning: false,
      },
    ];
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const key = this.getNextKey();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;

      const res = await fetch(`${this.baseUrl}/models`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      return {
        healthy: res.ok,
        latencyMs: Date.now() - start,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async getQuota(): Promise<QuotaStatus> {
    return {
      remaining: Infinity,
      limit: Infinity,
      resetAt: new Date(Date.now() + 86_400_000),
      unit: 'requests',
    };
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.ensureInitialized();

    const key = this.getNextKey();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: req.model || 'meta-llama/llama-3.3-70b:free',
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: false,
      }),
    });

    if (res.status === 429) {
      this.rotateKey();
      throw new Error('Rate limited, key rotated. Retry.');
    }

    if (!res.ok) {
      throw new Error(`OpenRouter error: HTTP ${res.status}`);
    }

    return (await res.json()) as unknown as ChatCompletionResponse;
  }

  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    this.ensureInitialized();

    const key = this.getNextKey();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: req.model || 'meta-llama/llama-3.3-70b:free',
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: true,
      }),
    });

    if (res.status === 429) {
      this.rotateKey();
      throw new Error('Rate limited, key rotated. Retry.');
    }

    if (!res.ok || !res.body) {
      throw new Error(`OpenRouter stream error: HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            yield JSON.parse(line.slice(6)) as ChatCompletionChunk;
          } catch {
            // skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
