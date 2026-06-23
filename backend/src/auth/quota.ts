import type { Request, Response, NextFunction } from 'express'
import type { Database } from 'better-sqlite3'

const DEFAULT_DAILY_TOKEN_QUOTA = 100_000

export function quotaGuard(db: Database) {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(tokens_in + tokens_out), 0) as used,
           MIN(timestamp) as oldest_timestamp
    FROM usage_log WHERE tenant_id = ? AND timestamp >= datetime('now', '-1 day')
  `)

  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.tenant?.sub
    if (!tenantId) { next(); return }

    const row = stmt.get(tenantId) as { used: number; oldest_timestamp: string | null } | undefined

    if ((row?.used ?? 0) >= DEFAULT_DAILY_TOKEN_QUOTA) {
      const oldestTime = row?.oldest_timestamp ? new Date(row.oldest_timestamp.replace(' ', 'T') + 'Z').getTime() : Date.now()
      res.status(429).json({
        error: 'Daily token quota exceeded',
        used: row?.used ?? 0,
        limit: DEFAULT_DAILY_TOKEN_QUOTA,
        resetsAt: new Date(oldestTime + 86_400_000).toISOString(),
      })
      return
    }
    next()
  }
}
