import { SidecarAdapter } from './sidecar-base.js'
import type { Model } from '../types/adapter.js'

export class UserProxyAdapter extends SidecarAdapter {
  readonly id: string
  readonly name: string
  readonly tier = 'free' as const
  readonly supportsStreaming = true
  readonly supportsToolUse = false
  protected readonly defaultBaseUrl: string
  protected readonly fallbackModels: Model[] = []

  constructor(row: { id: string; name: string; baseUrl: string; apiKey: string | undefined }) {
    super()
    this.id = row.id
    this.name = row.name
    this.defaultBaseUrl = row.baseUrl
    this.config = { baseUrl: row.baseUrl, apiKey: row.apiKey }
  }
}
