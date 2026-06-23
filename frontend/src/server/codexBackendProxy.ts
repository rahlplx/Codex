import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleUnifiedResponsesProxyRequest } from './unifiedResponsesProxy.js'

function getBackendUrl(): string {
  return (process.env['CODEX_BACKEND_URL'] ?? 'http://localhost:3001').replace(/\/$/, '')
}

export function handleCodexBackendProxyRequest(req: IncomingMessage, res: ServerResponse): void {
  handleUnifiedResponsesProxyRequest(req, res, {
    bearerToken: '',
    wireApi: 'chat',
    responsesEndpoint: '',
    chatCompletionsEndpoint: `${getBackendUrl()}/api/chat/completions`,
    missingKeyMessage: 'Codex backend not reachable',
    requireBearerToken: false,
    allowToolFallbackToResponses: false,
  })
}
