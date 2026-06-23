import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ModelDiscoveryScanner } from '../../../backend/src/discovery/scanner.js'
import { AdapterRegistry } from '../../../backend/src/adapters/registry.js'

function makeAdapter(id: string, models: Array<{ id: string; name: string }>) {
  return {
    id,
    name: id,
    tier: 'free' as const,
    supportsStreaming: true,
    supportsToolUse: false,
    initialize: vi.fn(),
    shutdown: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latencyMs: 10, score: 90 }),
    getQuota: vi.fn().mockResolvedValue({ unlimited: true, remaining: null, resetAt: null }),
    supportedModels: vi.fn().mockResolvedValue(
      models.map(m => ({
        ...m,
        contextWindow: 32768,
        supportsStreaming: true,
        supportsToolUse: false,
        supportsReasoning: false,
      }))
    ),
    chatCompletion: vi.fn(),
    chatCompletionStream: vi.fn(),
  }
}

describe('ModelDiscoveryScanner', () => {
  let registry: AdapterRegistry
  let scanner: ModelDiscoveryScanner

  beforeEach(() => {
    registry = new AdapterRegistry()
    scanner = new ModelDiscoveryScanner(registry, 3_600_000)
  })

  afterEach(() => {
    scanner.stop()
  })

  it('returns empty catalog before first scan', () => {
    expect(scanner.getCatalog()).toEqual([])
  })

  it('discovers models from registered adapters', async () => {
    const adapter = makeAdapter('test-provider', [
      { id: 'model-a', name: 'Model A' },
      { id: 'model-b', name: 'Model B' },
    ])
    registry.register(adapter)

    const results = await scanner.scan()
    expect(results).toHaveLength(2)
    expect(results[0]?.provider).toBe('test-provider')
    expect(results[0]?.id).toBe('model-a')
  })

  it('getCatalog returns latest scan results', async () => {
    const adapter = makeAdapter('p1', [{ id: 'm1', name: 'M1' }])
    registry.register(adapter)

    await scanner.scan()
    const catalog = scanner.getCatalog()
    expect(catalog).toHaveLength(1)
    expect(catalog[0]?.id).toBe('m1')
  })

  it('findModel returns matching model', async () => {
    const adapter = makeAdapter('p1', [
      { id: 'target', name: 'Target' },
      { id: 'other', name: 'Other' },
    ])
    registry.register(adapter)
    await scanner.scan()

    const found = scanner.findModel('target')
    expect(found).toBeDefined()
    expect(found?.id).toBe('target')
  })

  it('findModel returns undefined for unknown model', async () => {
    const adapter = makeAdapter('p1', [{ id: 'm1', name: 'M1' }])
    registry.register(adapter)
    await scanner.scan()

    expect(scanner.findModel('nonexistent')).toBeUndefined()
  })

  it('findByProvider filters by provider id', async () => {
    const a1 = makeAdapter('provider-a', [{ id: 'ma', name: 'MA' }])
    const a2 = makeAdapter('provider-b', [{ id: 'mb', name: 'MB' }])
    registry.register(a1)
    registry.register(a2)
    await scanner.scan()

    const filtered = scanner.findByProvider('provider-a')
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('ma')
  })

  it('findByCapability filters by streaming support', async () => {
    const adapter = makeAdapter('p1', [{ id: 'm1', name: 'M1' }])
    registry.register(adapter)
    await scanner.scan()

    const streaming = scanner.findByCapability({ streaming: true })
    expect(streaming).toHaveLength(1)

    const toolUse = scanner.findByCapability({ toolUse: true })
    expect(toolUse).toHaveLength(0)
  })

  it('scan skips adapters that throw', async () => {
    const good = makeAdapter('good', [{ id: 'ok', name: 'OK' }])
    const bad = makeAdapter('bad', [])
    bad.supportedModels = vi.fn().mockRejectedValue(new Error('offline'))
    registry.register(good)
    registry.register(bad)

    const results = await scanner.scan()
    expect(results).toHaveLength(1)
    expect(results[0]?.provider).toBe('good')
  })

  it('scan aggregates models from multiple adapters', async () => {
    const a1 = makeAdapter('p1', [{ id: 'm1', name: 'M1' }])
    const a2 = makeAdapter('p2', [{ id: 'm2', name: 'M2' }, { id: 'm3', name: 'M3' }])
    registry.register(a1)
    registry.register(a2)

    const results = await scanner.scan()
    expect(results).toHaveLength(3)
  })

  it('sets discoveredAt on all models', async () => {
    const adapter = makeAdapter('p1', [{ id: 'm1', name: 'M1' }])
    registry.register(adapter)

    const results = await scanner.scan()
    expect(results[0]?.discoveredAt).toBeInstanceOf(Date)
  })

  it('start triggers an initial scan', async () => {
    const adapter = makeAdapter('p1', [{ id: 'm1', name: 'M1' }])
    registry.register(adapter)

    scanner.start()
    await new Promise(r => setTimeout(r, 50))

    expect(scanner.getCatalog()).toHaveLength(1)
  })

  it('stop clears the interval', () => {
    scanner.start()
    scanner.stop()
    // No error thrown — stop is idempotent
    scanner.stop()
  })
})
