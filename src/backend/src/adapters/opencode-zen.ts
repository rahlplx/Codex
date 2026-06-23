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

export class OpenCodeZenAdapter extends BaseAdapter {
  readonly id = 'opencode-zen';
  readonly name = 'OpenCode Zen';
  readonly tier = 'free' as const;
  readonly supportsStreaming = true;
  readonly supportsToolUse = false;
  readonly supportsReasoning = false;

  private baseUrl = PROVIDER_URLS['opencode-zen'];

  async supportedModels(): Promise<Model[]> {
    return [
      {
        id: 'zen-default',
        name: 'Zen Default',
        provider: this.id,
        contextWindow: 128_000,
        supportsStreaming: true,
        supportsToolUse: false,
        supportsReasoning: false,
      },
    ];
  }

  async healthCheck(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
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
      unit: 'tokens',
    };
  }

  async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.ensureInitialized();

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model || 'zen-default',
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenCode Zen error: HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    return data as unknown as ChatCompletionResponse;
  }

  async *chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    this.ensureInitialized();

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: req.model || 'zen-default',
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenCode Zen stream error: HTTP ${res.status}`);
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
