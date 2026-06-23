import type { ICliAdapter, AdapterConfig } from '@codex/shared';

export class AdapterRegistry {
  private adapters = new Map<string, ICliAdapter>();

  register(adapter: ICliAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): ICliAdapter | undefined {
    return this.adapters.get(id);
  }

  getAll(): ICliAdapter[] {
    return Array.from(this.adapters.values());
  }

  getEnabled(): ICliAdapter[] {
    return this.getAll();
  }

  async initializeAll(configs: Record<string, AdapterConfig>): Promise<void> {
    for (const [id, config] of Object.entries(configs)) {
      const adapter = this.adapters.get(id);
      if (adapter && config.enabled) {
        await adapter.initialize(config);
      }
    }
  }

  async shutdownAll(): Promise<void> {
    for (const adapter of this.adapters.values()) {
      await adapter.shutdown();
    }
  }
}
