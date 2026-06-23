import { SidecarAdapter } from './sidecar-base.js'
import type { Model } from '../types/adapter.js'

export class CliRelayAdapter extends SidecarAdapter {
  readonly id = 'cli-relay'
  readonly name = 'CliRelay'
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = false
  protected readonly defaultBaseUrl = 'http://cli-relay:3456/v1'
  protected readonly fallbackModels: Model[] = [
    {
      id: 'gemini-cli',
      name: 'Gemini CLI (via CliRelay)',
      contextWindow: 1_048_576,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: true,
    },
    {
      id: 'antigravity-cli',
      name: 'Antigravity CLI (via CliRelay)',
      contextWindow: 1_048_576,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: false,
    },
    {
      id: 'qwen-cli',
      name: 'Qwen CLI (via CliRelay)',
      contextWindow: 131_072,
      supportsStreaming: true,
      supportsToolUse: false,
      supportsReasoning: true,
    },
  ]
}
