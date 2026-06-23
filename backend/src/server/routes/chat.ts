import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import type { Database } from 'better-sqlite3'
import type { AdapterRegistry } from '../../adapters/registry.js'
import { Router as OrchestratorRouter, NoAdapterAvailableError } from '../../orchestrator/router.js'
import type { ChatCompletionRequest } from '../../types/adapter.js'
import { authGuard } from '../../auth/middleware.js'
import { quotaGuard } from '../../auth/quota.js'

export function createChatRouter(registry: AdapterRegistry, db?: Database): Router {
  const router = Router()
  const orchestrator = new OrchestratorRouter(registry)

  const logUsage = db?.prepare(`
    INSERT INTO usage_log (tenant_id, provider, model, tokens_in, tokens_out, latency_ms, success)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const quotaMiddleware = db
    ? quotaGuard(db)
    : (_req: Request, _res: Response, next: NextFunction) => { next() }

  router.post('/api/chat/completions', authGuard, quotaMiddleware, async (req, res) => {
    const { messages, model, stream, temperature, max_tokens } = req.body as Record<string, unknown>

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages must be a non-empty array' })
      return
    }

    const validRoles = new Set(['system', 'user', 'assistant', 'tool'])
    const messagesValid = messages.every(
      (m: unknown) => typeof m === 'object' && m !== null &&
        typeof (m as Record<string, unknown>)['role'] === 'string' &&
        validRoles.has((m as Record<string, unknown>)['role'] as string) &&
        typeof (m as Record<string, unknown>)['content'] === 'string'
    )
    if (!messagesValid) {
      res.status(400).json({ error: 'Each message must have a valid role and content string' })
      return
    }

    const chatReq: ChatCompletionRequest = {
      model: typeof model === 'string' ? model : undefined,
      messages: messages as ChatCompletionRequest['messages'],
      stream: Boolean(stream),
      temperature: typeof temperature === 'number' ? temperature : undefined,
      maxTokens: typeof max_tokens === 'number' ? max_tokens : undefined,
    }

    let adapters
    try {
      adapters = await orchestrator.route()
    } catch (e) {
      if (e instanceof NoAdapterAvailableError) {
        res.status(503).json({ error: (e as Error).message })
        return
      }
      res.status(500).json({ error: 'Internal routing error' })
      return
    }

    if (stream) {
      let closed = false
      req.on('close', () => { closed = true })
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()

      let succeeded = false
      for (const adapter of adapters) {
        if (closed) break
        try {
          for await (const chunk of adapter.chatCompletionStream(chatReq)) {
            if (closed) break
            res.write(`data: ${JSON.stringify(chunk)}\n\n`)
          }
          orchestrator.recordSuccess(adapter.id)
          succeeded = true
          break
        } catch (e) {
          orchestrator.recordFailure(adapter.id)
          if (adapter === adapters[adapters.length - 1]) {
            if (!closed) res.write(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : 'stream error' })}\n\n`)
          }
        }
      }
      if (!closed && succeeded) res.write('data: [DONE]\n\n')
      res.end()
    } else {
      for (const adapter of adapters) {
        const start = Date.now()
        try {
          const completion = await adapter.chatCompletion(chatReq)
          const latencyMs = Date.now() - start
          orchestrator.recordSuccess(adapter.id)
          try {
            logUsage?.run(
              req.tenant!.sub, adapter.id, completion.model ?? chatReq.model ?? 'unknown',
              completion.usage.promptTokens, completion.usage.completionTokens,
              latencyMs, 1,
            )
          } catch { /* non-critical */ }
          res.json({
            id: completion.id,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: completion.model ?? chatReq.model ?? 'unknown',
            provider: completion.provider ?? adapter.id,
            choices: completion.choices,
            usage: completion.usage,
          })
          return
        } catch (e) {
          const latencyMs = Date.now() - start
          orchestrator.recordFailure(adapter.id)
          try { logUsage?.run(req.tenant!.sub, adapter.id, chatReq.model ?? 'unknown', 0, 0, latencyMs, 0) } catch { /* */ }
          if (adapter === adapters[adapters.length - 1]) {
            res.status(500).json({ error: e instanceof Error ? e.message : 'completion failed' })
          }
        }
      }
    }
  })

  return router
}
