import { SidecarAdapter } from './sidecar-base.js'
import type { Model } from '../types/adapter.js'

export class CliProxyApiAdapter extends SidecarAdapter {
  readonly id = 'cli-proxy-api'
  readonly name = 'CLIProxyAPI'
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = false
  protected readonly defaultBaseUrl = 'http://cli-proxy-api:8080/v1'
  protected readonly fallbackModels: Model[] = [
    {
      id: 'antigravity-proxy',
      name: 'Antigravity (via CLIProxyAPI)',
      contextWindow: 1_048_576,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: false,
    },
    {
      id: 'codex-proxy',
      name: 'Codex (via CLIProxyAPI)',
      contextWindow: 192_000,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: true,
    },
    {
      id: 'grok-proxy',
      name: 'Grok (via CLIProxyAPI)',
      contextWindow: 131_072,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: false,
    },
  ]
}
