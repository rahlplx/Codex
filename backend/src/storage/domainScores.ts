import type { Database } from 'better-sqlite3'
import type { Domain } from '../orchestrator/domain.js'

interface ScoreRow {
  adapter_id: string
  domain: string
  success_count: number
  failure_count: number
  total_latency_ms: number
}

export interface DomainRanking {
  domain: Domain
  adapterId: string
  score: number
  calls: number
  successRate: number
  avgLatencyMs: number
}

export class DomainScoreRepository {
  private readonly stmtUpsert
  private readonly stmtGet
  private readonly stmtAll

  constructor(private readonly db: Database) {
    this.stmtUpsert = db.prepare(`
      INSERT INTO adapter_domain_scores (adapter_id, domain, success_count, failure_count, total_latency_ms)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (adapter_id, domain) DO UPDATE SET
        success_count   = success_count + excluded.success_count,
        failure_count   = failure_count + excluded.failure_count,
        total_latency_ms = total_latency_ms + excluded.total_latency_ms,
        updated_at      = datetime('now')
    `)
    this.stmtGet = db.prepare(
      'SELECT * FROM adapter_domain_scores WHERE adapter_id = ? AND domain = ?'
    )
    this.stmtAll = db.prepare('SELECT * FROM adapter_domain_scores')
  }

  record(adapterId: string, domain: Domain, success: boolean, latencyMs: number): void {
    this.stmtUpsert.run(adapterId, domain, success ? 1 : 0, success ? 0 : 1, latencyMs)
  }

  getForAdapter(adapterId: string, domain: Domain): { successRate: number; avgLatencyMs: number } | null {
    const row = this.stmtGet.get(adapterId, domain) as ScoreRow | undefined
    if (!row) return null
    const total = row.success_count + row.failure_count
    if (total === 0) return null
    return {
      successRate: row.success_count / total,
      avgLatencyMs: total > 0 ? row.total_latency_ms / total : 0,
    }
  }

  getRankings(): DomainRanking[] {
    const rows = this.stmtAll.all() as ScoreRow[]

    const byDomain = new Map<Domain, Map<string, ScoreRow>>()
    for (const row of rows) {
      const d = row.domain as Domain
      if (!byDomain.has(d)) byDomain.set(d, new Map())
      byDomain.get(d)!.set(row.adapter_id, row)
    }

    const rankings: DomainRanking[] = []
    for (const [domain, adapters] of byDomain) {
      let best: DomainRanking | null = null
      for (const [adapterId, row] of adapters) {
        const calls = row.success_count + row.failure_count
        if (calls === 0) continue
        const successRate = row.success_count / calls
        const avgLatencyMs = row.total_latency_ms / calls
        const score = successRate * (1000 / Math.max(avgLatencyMs, 1))
        if (!best || score > best.score) {
          best = { domain, adapterId, score, calls, successRate, avgLatencyMs }
        }
      }
      if (best) rankings.push(best)
    }

    return rankings
  }
}
