import { SidecarAdapter } from './sidecar-base.js'
import type { Model } from '../types/adapter.js'

export class AiClient2ApiAdapter extends SidecarAdapter {
  readonly id = 'ai-client2api'
  readonly name = 'AIClient2API'
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = false
  protected readonly defaultBaseUrl = 'http://ai-client2api:3100/v1'
  protected readonly fallbackModels: Model[] = [
    {
      id: 'gemini-cli-free',
      name: 'Gemini CLI Free (via AIClient2API)',
      contextWindow: 1_048_576,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: true,
    },
    {
      id: 'antigravity-free',
      name: 'Antigravity Free (via AIClient2API)',
      contextWindow: 1_048_576,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: false,
    },
    {
      id: 'kiro-free',
      name: 'Kiro Free (via AIClient2API)',
      contextWindow: 200_000,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: true,
    },
  ]
}
