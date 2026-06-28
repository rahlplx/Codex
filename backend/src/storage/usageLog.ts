import type { Database } from 'better-sqlite3'

export class UsageLogRepository {
  private readonly stmtInsert

  constructor(db: Database) {
    this.stmtInsert = db.prepare(
      'INSERT INTO usage_log (tenant_id, provider, model, tokens_in, tokens_out, cost_usd, latency_ms, success) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
  }

  insert(row: {
    tenantId: string
    provider: string
    model: string
    tokensIn: number
    tokensOut: number
    costUsd: number
    latencyMs: number
    success: boolean
  }): void {
    this.stmtInsert.run(
      row.tenantId, row.provider, row.model,
      row.tokensIn, row.tokensOut, row.costUsd,
      row.latencyMs, row.success ? 1 : 0
    )
  }
}
