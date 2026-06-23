import { Router } from 'express'
import type { AdapterRegistry } from '../../adapters/registry.js'
import { Router as OrchestratorRouter, NoAdapterAvailableError } from '../../orchestrator/router.js'
import type { ChatCompletionRequest } from '../../types/adapter.js'

export function createChatRouter(registry: AdapterRegistry): Router {
  const router = Router()
  const orchestrator = new OrchestratorRouter(registry)

  router.post('/api/chat/completions', async (req, res) => {
    const { messages, model, stream, temperature, max_tokens } = req.body as Record<string, unknown>

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages must be a non-empty array' })
      return
    }

    const chatReq: ChatCompletionRequest = {
      model: typeof model === 'string' ? model : undefined,
      messages: messages as ChatCompletionRequest['messages'],
      stream: Boolean(stream),
      temperature: typeof temperature === 'number' ? temperature : undefined,
      maxTokens: typeof max_tokens === 'number' ? max_tokens : undefined,
    }

    let adapter
    try {
      adapter = await orchestrator.route()
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
      try {
        for await (const chunk of adapter.chatCompletionStream(chatReq)) {
          if (closed) break
          res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        }
        if (!closed) res.write('data: [DONE]\n\n')
      } catch (e) {
        if (!closed) res.write(`data: ${JSON.stringify({ error: e instanceof Error ? e.message : 'stream error' })}\n\n`)
      } finally {
        res.end()
      }
    } else {
      try {
        const completion = await adapter.chatCompletion(chatReq)
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
        res.status(500).json({ error: e instanceof Error ? e.message : 'completion failed' })
      }
    }
  })

  return router
}
