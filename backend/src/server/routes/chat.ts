import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import type { AdapterRegistry } from '../../adapters/registry.js'
import type { DomainScoreRepository } from '../../storage/domainScores.js'
import type { TenantAdapterRepository } from '../../storage/tenantAdapters.js'
import type { UsageLogRepository } from '../../storage/usageLog.js'
import { Router as OrchestratorRouter, NoAdapterAvailableError } from '../../orchestrator/router.js'
import { classifyDomain } from '../../orchestrator/domain.js'
import { UserProxyAdapter } from '../../adapters/user-proxy.js'
import { authGuard } from '../../auth/middleware.js'
import type { ChatCompletionRequest } from '../../types/adapter.js'

function passthrough(_req: Request, _res: Response, next: NextFunction): void { next() }

export function createChatRouter(
  registry: AdapterRegistry,
  domainScores?: DomainScoreRepository,
  tenantAdapters?: TenantAdapterRepository,
  usageLog?: UsageLogRepository,
): Router {
  const router = Router()
  const orchestrator = new OrchestratorRouter(registry, domainScores)
  // Auth is only enforced when the db feature set is active (tenantAdapters present)
  const guard = tenantAdapters ? authGuard : passthrough

  router.post('/api/chat/completions', guard, async (req, res) => {
    const tenantId = req.tenant?.sub ?? ''
    const { messages, model, stream, temperature, max_tokens, adapter_id } = req.body as Record<string, unknown>

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages must be a non-empty array' })
      return
    }

    const domain = classifyDomain(messages as Array<{ role: string; content: string }>)

    const chatReq: ChatCompletionRequest = {
      model: typeof model === 'string' ? model : undefined,
      messages: messages as ChatCompletionRequest['messages'],
      stream: Boolean(stream),
      temperature: typeof temperature === 'number' ? temperature : undefined,
      maxTokens: typeof max_tokens === 'number' ? max_tokens : undefined,
    }

    // Personal proxy takes priority over global adapters
    let adapter
    if (tenantAdapters) {
      const personal = tenantAdapters.listActive(tenantId)
      if (personal.length > 0) {
        const targetId = typeof adapter_id === 'string' ? adapter_id : null
        const row = (targetId ? personal.find(a => a.id === targetId) : null) ?? personal[0]!
        adapter = new UserProxyAdapter(row)
      }
    }
    if (!adapter) {
      try {
        adapter = await orchestrator.route(domain)
      } catch (e) {
        if (e instanceof NoAdapterAvailableError) {
          res.status(503).json({ error: (e as Error).message })
          return
        }
        res.status(500).json({ error: 'Internal routing error' })
        return
      }
    }

    res.setHeader('X-Routed-Adapter', adapter.id)
    res.setHeader('X-Routed-Domain', domain)

    if (stream) {
      let closed = false
      req.on('close', () => { closed = true })
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.flushHeaders()
      const start = Date.now()
      let success = false
      try {
        for await (const chunk of adapter.chatCompletionStream(chatReq)) {
          if (closed) break
          res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        }
        if (!closed) res.write('data: [DONE]\n\n')
        success = true
      } catch (e) {
        if (!closed) res.write(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : 'stream error' })}\n\n`)
      } finally {
        const latencyMs = Date.now() - start
        res.end()
        domainScores?.record(adapter.id, domain, success, latencyMs)
        usageLog?.insert({
          tenantId,
          provider: adapter.id,
          model: chatReq.model ?? adapter.id,
          tokensIn: 0,
          tokensOut: 0,
          costUsd: 0,
          latencyMs,
          success,
        })
      }
    } else {
      const start = Date.now()
      let success = false
      let tokensIn = 0
      let tokensOut = 0
      let resolvedModel = chatReq.model ?? adapter.id
      try {
        const completion = await adapter.chatCompletion(chatReq)
        success = true
        tokensIn = completion.usage?.promptTokens ?? 0
        tokensOut = completion.usage?.completionTokens ?? 0
        resolvedModel = completion.model ?? resolvedModel
        domainScores?.record(adapter.id, domain, true, Date.now() - start)
        res.json({
          id: completion.id,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: completion.model ?? chatReq.model ?? 'unknown',
          provider: completion.provider ?? adapter.id,
          choices: completion.choices,
          usage: completion.usage,
        })
      } catch (e) {
        domainScores?.record(adapter.id, domain, false, Date.now() - start)
        res.status(500).json({ error: e instanceof Error ? e.message : 'completion failed' })
      } finally {
        usageLog?.insert({
          tenantId,
          provider: adapter.id,
          model: resolvedModel,
          tokensIn,
          tokensOut,
          costUsd: 0,
          latencyMs: Date.now() - start,
          success,
        })
      }
    }
  })

  return router
}
