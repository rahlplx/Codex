import type { ICliAdapter, ChatCompletionRequest, ChatCompletionResponse, ChatCompletionChunk } from '@codex/shared';
import type { HealthMonitor } from './health.js';

interface ScoredAdapter {
  adapter: ICliAdapter;
  score: number;
}

export class OrchestratorRouter {
  constructor(
    private adapters: ICliAdapter[],
    private healthMonitor: HealthMonitor,
  ) {}

  selectBest(requestedModel?: string): ICliAdapter | null {
    if (requestedModel) {
      const specific = this.adapters.find((a) => a.id === requestedModel);
      if (specific) {
        const breaker = this.healthMonitor.getBreaker(specific.id);
        if (!breaker?.isOpen()) return specific;
      }
    }

    const scored = this.scoreAdapters();
    return scored[0]?.adapter ?? null;
  }

  async routeCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const sorted = this.scoreAdapters();

    for (const { adapter } of sorted) {
      try {
        const response = await adapter.chatCompletion(req);
        this.healthMonitor.getBreaker(adapter.id)?.recordSuccess();
        return response;
      } catch {
        this.healthMonitor.getBreaker(adapter.id)?.recordFailure();
      }
    }

    throw new Error('All providers failed. No available adapters.');
  }

  async *routeCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const sorted = this.scoreAdapters();

    for (const { adapter } of sorted) {
      try {
        yield* adapter.chatCompletionStream(req);
        this.healthMonitor.getBreaker(adapter.id)?.recordSuccess();
        return;
      } catch {
        this.healthMonitor.getBreaker(adapter.id)?.recordFailure();
      }
    }

    throw new Error('All providers failed. No available adapters.');
  }

  private scoreAdapters(): ScoredAdapter[] {
    return this.adapters
      .filter((a) => {
        const breaker = this.healthMonitor.getBreaker(a.id);
        return !breaker?.isOpen();
      })
      .map((adapter) => {
        const health = this.healthMonitor.getHealth(adapter.id);
        const reliability = health?.healthy ? 1.0 : 0.0;
        const speed = health?.latencyMs ? Math.max(0, 1 - health.latencyMs / 5000) : 0.5;
        const costFactor = adapter.tier === 'free' ? 1.0 : adapter.tier === 'freemium' ? 0.7 : 0.3;

        const score = 0.35 * reliability + 0.25 * speed + 0.20 * 0.5 + 0.15 * costFactor + 0.05 * 0.5;

        return { adapter, score };
      })
      .sort((a, b) => b.score - a.score);
  }
}
