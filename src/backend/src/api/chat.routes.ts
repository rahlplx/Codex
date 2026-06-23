import { Router } from 'express';
import type Database from 'better-sqlite3';

export function chatRoutes(_db: Database.Database): Router {
  const router = Router();

  router.post('/completions', async (req, res) => {
    const { model, messages, stream } = req.body as {
      model?: string;
      messages?: unknown[];
      stream?: boolean;
    };

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array required' });
      return;
    }

    if (stream) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'Streaming not yet wired to orchestrator.' } }] })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    res.json({
      id: 'stub',
      model: model ?? 'auto',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Chat completions endpoint ready. Wire orchestrator next.' },
          finishReason: 'stop',
        },
      ],
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    });
  });

  return router;
}
