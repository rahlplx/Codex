import type { AdapterRegistry } from '../adapters/registry.js'
import type { Model } from '../types/adapter.js'

export interface DiscoveredModel extends Model {
  provider: string
  discoveredAt: Date
}

export class ModelDiscoveryScanner {
  private catalog: DiscoveredModel[] = []
  private intervalHandle: ReturnType<typeof setInterval> | null = null
  private isScanning = false

  constructor(
    private readonly registry: AdapterRegistry,
    private readonly intervalMs: number = 3_600_000,
  ) {}

  async scan(): Promise<DiscoveredModel[]> {
    if (this.isScanning) return this.catalog
    this.isScanning = true
    try {
      return await this.doScan()
    } finally {
      this.isScanning = false
    }
  }

  private async doScan(): Promise<DiscoveredModel[]> {
    const adapters = this.registry.list()
    const results: DiscoveredModel[] = []
    const now = new Date()

    await Promise.allSettled(
      adapters.map(async adapter => {
        try {
          const models = await adapter.supportedModels()
          for (const model of models) {
            results.push({ ...model, provider: adapter.id, discoveredAt: now })
          }
        } catch {
          // adapter offline — skip its models this cycle
        }
      })
    )

    this.catalog = results
    return results
  }

  getCatalog(): DiscoveredModel[] {
    return [...this.catalog]
  }

  findModel(modelId: string): DiscoveredModel | undefined {
    return this.catalog.find(m => m.id === modelId)
  }

  findByProvider(providerId: string): DiscoveredModel[] {
    return this.catalog.filter(m => m.provider === providerId)
  }

  findByCapability(opts: { streaming?: boolean; toolUse?: boolean; reasoning?: boolean }): DiscoveredModel[] {
    return this.catalog.filter(m => {
      if (opts.streaming && !m.supportsStreaming) return false
      if (opts.toolUse && !m.supportsToolUse) return false
      if (opts.reasoning && !m.supportsReasoning) return false
      return true
    })
  }

  start(): void {
    if (this.intervalHandle) return
    this.scan().catch(() => {})
    this.intervalHandle = setInterval(() => {
      this.scan().catch(() => {})
    }, this.intervalMs)
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle)
      this.intervalHandle = null
    }
  }
}
