import type { ICliAdapter, HealthStatus } from '@codex/shared';
import { CircuitBreaker } from './circuit-breaker.js';

export class HealthMonitor {
  private healthCache = new Map<string, HealthStatus>();
  private breakers = new Map<string, CircuitBreaker>();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private adapters: ICliAdapter[],
    private probeIntervalMs = 60_000,
  ) {
    for (const adapter of adapters) {
      this.breakers.set(adapter.id, new CircuitBreaker());
    }
  }

  start(): void {
    this.probeAll();
    this.intervalId = setInterval(() => this.probeAll(), this.probeIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getHealth(adapterId: string): HealthStatus | undefined {
    return this.healthCache.get(adapterId);
  }

  getBreaker(adapterId: string): CircuitBreaker | undefined {
    return this.breakers.get(adapterId);
  }

  getAllHealth(): Map<string, HealthStatus> {
    return new Map(this.healthCache);
  }

  private async probeAll(): Promise<void> {
    await Promise.allSettled(
      this.adapters.map(async (adapter) => {
        const breaker = this.breakers.get(adapter.id);
        if (breaker?.isOpen()) return;

        try {
          const health = await adapter.healthCheck();
          this.healthCache.set(adapter.id, health);
          if (health.healthy) {
            breaker?.recordSuccess();
          } else {
            breaker?.recordFailure();
          }
        } catch {
          this.healthCache.set(adapter.id, {
            healthy: false,
            latencyMs: -1,
            error: 'Probe failed',
          });
          breaker?.recordFailure();
        }
      }),
    );
  }
}
