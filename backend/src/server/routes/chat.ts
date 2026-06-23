import { Router } from 'express'
import type { AdapterRegistry } from '../../adapters/registry.js'
import type { DomainScoreRepository } from '../../storage/domainScores.js'
import { Router as OrchestratorRouter, NoAdapterAvailableError } from '../../orchestrator/router.js'
import { classifyDomain } from '../../orchestrator/domain.js'
import type { ChatCompletionRequest } from '../../types/adapter.js'

export function createChatRouter(registry: AdapterRegistry, domainScores?: DomainScoreRepository): Router {
  const router = Router()
  const orchestrator = new OrchestratorRouter(registry, domainScores)

  router.post('/api/chat/completions', async (req, res) => {
    const { messages, model, stream, temperature, max_tokens } = req.body as Record<string, unknown>

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

    let adapter
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
        res.end()
        domainScores?.record(adapter.id, domain, success, Date.now() - start)
      }
    } else {
      const start = Date.now()
      try {
        const completion = await adapter.chatCompletion(chatReq)
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
      }
    }
  })

  return router
}
