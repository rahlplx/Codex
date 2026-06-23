import { Router } from 'express'
import type { Database } from 'better-sqlite3'
import { authGuard } from '../../auth/middleware.js'

export function createTelemetryRouter(db: Database): Router {
  const router = Router()

  router.use(authGuard)

  router.get('/api/telemetry/rankings', (req, res) => {
    const tenantId = req.tenant?.sub
    const rows = tenantId
      ? db.prepare(`
          SELECT model, COUNT(*) as total_requests,
                 ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0 END), 1) as success_rate,
                 ROUND(AVG(latency_ms)) as avg_latency_ms,
                 SUM(tokens_in + tokens_out) as total_tokens
          FROM usage_log WHERE tenant_id = ? GROUP BY model ORDER BY success_rate DESC, avg_latency_ms ASC
        `).all(tenantId)
      : db.prepare(`
          SELECT model, COUNT(*) as total_requests,
                 ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0 END), 1) as success_rate,
                 ROUND(AVG(latency_ms)) as avg_latency_ms,
                 SUM(tokens_in + tokens_out) as total_tokens
          FROM usage_log GROUP BY model ORDER BY success_rate DESC, avg_latency_ms ASC
        `).all()
    res.json(rows)
  })

  router.get('/api/telemetry/usage', (req, res) => {
    const tenantId = req.tenant?.sub
    const days = parseInt((req.query.days as string) ?? '7', 10)
    if (isNaN(days) || days <= 0 || days > 365) {
      res.status(400).json({ error: 'days parameter must be a positive integer up to 365' })
      return
    }
    const rows = tenantId
      ? db.prepare(`
          SELECT DATE(timestamp) as date, COUNT(*) as requests,
                 SUM(tokens_in + tokens_out) as total_tokens, SUM(cost_usd) as total_cost
          FROM usage_log WHERE tenant_id = ? AND timestamp >= datetime('now', ?)
          GROUP BY DATE(timestamp) ORDER BY date ASC
        `).all(tenantId, `-${days} days`)
      : db.prepare(`
          SELECT DATE(timestamp) as date, COUNT(*) as requests,
                 SUM(tokens_in + tokens_out) as total_tokens, SUM(cost_usd) as total_cost
          FROM usage_log WHERE timestamp >= datetime('now', ?)
          GROUP BY DATE(timestamp) ORDER BY date ASC
        `).all(`-${days} days`)
    res.json(rows)
  })

  router.get('/api/telemetry/reliability', (req, res) => {
    const tenantId = req.tenant?.sub
    const rows = tenantId
      ? db.prepare(`
          SELECT provider, COUNT(*) as total,
                 SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
                 ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0 END), 1) as success_rate
          FROM usage_log WHERE tenant_id = ? GROUP BY provider ORDER BY success_rate DESC
        `).all(tenantId)
      : db.prepare(`
          SELECT provider, COUNT(*) as total,
                 SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
                 ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0 END), 1) as success_rate
          FROM usage_log GROUP BY provider ORDER BY success_rate DESC
        `).all()
    res.json(rows)
  })

  router.get('/api/telemetry/speed', (req, res) => {
    const tenantId = req.tenant?.sub
    const rows = tenantId
      ? db.prepare(`
          SELECT provider, ROUND(AVG(latency_ms)) as avg_ms, MIN(latency_ms) as min_ms,
                 MAX(latency_ms) as max_ms, COUNT(*) as samples
          FROM usage_log WHERE tenant_id = ? AND success = 1 GROUP BY provider ORDER BY avg_ms ASC
        `).all(tenantId)
      : db.prepare(`
          SELECT provider, ROUND(AVG(latency_ms)) as avg_ms, MIN(latency_ms) as min_ms,
                 MAX(latency_ms) as max_ms, COUNT(*) as samples
          FROM usage_log WHERE success = 1 GROUP BY provider ORDER BY avg_ms ASC
        `).all()
    res.json(rows)
  })

  router.get('/api/telemetry/summary', (req, res) => {
    const tenantId = req.tenant?.sub
    const row = tenantId
      ? db.prepare(`
          SELECT COUNT(*) as total_requests, SUM(tokens_in) as total_tokens_in,
                 SUM(tokens_out) as total_tokens_out, SUM(cost_usd) as total_cost,
                 ROUND(AVG(latency_ms)) as avg_latency
          FROM usage_log WHERE tenant_id = ? AND timestamp >= datetime('now', '-1 day')
        `).get(tenantId)
      : db.prepare(`
          SELECT COUNT(*) as total_requests, SUM(tokens_in) as total_tokens_in,
                 SUM(tokens_out) as total_tokens_out, SUM(cost_usd) as total_cost,
                 ROUND(AVG(latency_ms)) as avg_latency
          FROM usage_log WHERE timestamp >= datetime('now', '-1 day')
        `).get()
    res.json(row ?? { total_requests: 0, total_tokens_in: 0, total_tokens_out: 0, total_cost: 0, avg_latency: 0 })
  })

  return router
}
