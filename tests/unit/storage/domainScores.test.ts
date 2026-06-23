import { describe, it, expect, beforeEach } from 'vitest'
import BetterSqlite3 from 'better-sqlite3'
import { DomainScoreRepository } from '../../../backend/src/storage/domainScores.js'

function makeDb() {
  const db = new BetterSqlite3(':memory:')
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE adapter_domain_scores (
      adapter_id       TEXT NOT NULL,
      domain           TEXT NOT NULL,
      success_count    INTEGER NOT NULL DEFAULT 0,
      failure_count    INTEGER NOT NULL DEFAULT 0,
      total_latency_ms INTEGER NOT NULL DEFAULT 0,
      updated_at       TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (adapter_id, domain)
    )
  `)
  return db
}

describe('DomainScoreRepository', () => {
  let repo: DomainScoreRepository

  beforeEach(() => {
    repo = new DomainScoreRepository(makeDb())
  })

  it('returns null for unknown adapter+domain pair', () => {
    expect(repo.getForAdapter('zen', 'coding')).toBeNull()
  })

  it('records a successful call and retrieves it', () => {
    repo.record('zen', 'coding', true, 200)
    const result = repo.getForAdapter('zen', 'coding')
    expect(result).not.toBeNull()
    expect(result!.successRate).toBe(1)
    expect(result!.avgLatencyMs).toBe(200)
  })

  it('records a failure and updates success rate', () => {
    repo.record('zen', 'coding', true, 100)
    repo.record('zen', 'coding', false, 300)
    const result = repo.getForAdapter('zen', 'coding')!
    expect(result.successRate).toBe(0.5)
    expect(result.avgLatencyMs).toBe(200)
  })

  it('accumulates multiple successful calls', () => {
    repo.record('zen', 'coding', true, 100)
    repo.record('zen', 'coding', true, 300)
    const result = repo.getForAdapter('zen', 'coding')!
    expect(result.successRate).toBe(1)
    expect(result.avgLatencyMs).toBe(200)
  })

  it('tracks different adapters and domains independently', () => {
    repo.record('zen', 'coding', true, 100)
    repo.record('nemotron', 'creative', true, 500)
    expect(repo.getForAdapter('zen', 'creative')).toBeNull()
    expect(repo.getForAdapter('nemotron', 'coding')).toBeNull()
    expect(repo.getForAdapter('zen', 'coding')!.successRate).toBe(1)
    expect(repo.getForAdapter('nemotron', 'creative')!.avgLatencyMs).toBe(500)
  })

  it('getRankings returns empty array when no data', () => {
    expect(repo.getRankings()).toEqual([])
  })

  it('getRankings returns preferred adapter per domain', () => {
    repo.record('zen', 'coding', true, 100)
    repo.record('nemotron', 'coding', true, 500)
    const rankings = repo.getRankings()
    expect(rankings).toHaveLength(1)
    expect(rankings[0]!.domain).toBe('coding')
    expect(rankings[0]!.adapterId).toBe('zen')
  })

  it('getRankings prefers high success rate over comparable latency', () => {
    // zen: 50% success at 100ms — nemotron: 100% success at 150ms
    // formula: successRate * (1000/avgLatency) → zen=5.0, nemotron≈6.67 → nemotron wins
    repo.record('zen', 'coding', true, 100)
    repo.record('zen', 'coding', false, 100)
    repo.record('nemotron', 'coding', true, 150)
    const rankings = repo.getRankings()
    expect(rankings[0]!.adapterId).toBe('nemotron')
  })

  it('getRankings includes correct stats', () => {
    repo.record('zen', 'coding', true, 200)
    repo.record('zen', 'coding', true, 400)
    const r = repo.getRankings()[0]!
    expect(r.calls).toBe(2)
    expect(r.successRate).toBe(1) // fraction 0–1, not percentage
    expect(r.avgLatencyMs).toBe(300)
  })
})
