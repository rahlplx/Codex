import { SidecarAdapter } from './sidecar-base.js'
import type { Model } from '../types/adapter.js'

export class NineRouterAdapter extends SidecarAdapter {
  readonly id = 'nine-router'
  readonly name = '9Router'
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = true
  protected readonly defaultBaseUrl = 'http://nine-router:20128/v1'
  protected readonly fallbackModels: Model[] = [
    {
      id: 'auto',
      name: '9Router Auto (Best Available)',
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsToolUse: true,
      supportsReasoning: true,
    },
  ]
}
