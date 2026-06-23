import type { Response } from 'express';
import type { ChatCompletionChunk } from '@codex/shared';

export function initSseResponse(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

export function sendSseChunk(res: Response, chunk: ChatCompletionChunk): void {
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}

export function sendSseDone(res: Response): void {
  res.write('data: [DONE]\n\n');
  res.end();
}

export function sendSseError(res: Response, error: string): void {
  res.write(`data: ${JSON.stringify({ error })}\n\n`);
  res.end();
}
