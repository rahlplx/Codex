import type { Tier, HealthStatus, QuotaStatus, Model } from './adapter.js'

export interface Provider {
  id: string
  name: string
  tier: Tier
  health: HealthStatus
  quota: QuotaStatus
  models: Model[]
  enabled: boolean
}

export interface ProviderListResponse {
  providers: Provider[]
  ts: string
}
