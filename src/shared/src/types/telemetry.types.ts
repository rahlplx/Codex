export interface ModelScore {
  modelId: string;
  modelName: string;
  provider: string;
  compositeScore: number;
  reliability: number;
  speed: number;
  quality: number;
  cost: number;
  recency: number;
}

export interface DailyUsage {
  date: string;
  requestCount: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
}

export interface ProviderReliability {
  provider: string;
  successRate: number;
  totalRequests: number;
  failedRequests: number;
}

export interface ProviderSpeed {
  provider: string;
  p50LatencyMs: number;
  p95LatencyMs: number;
  avgLatencyMs: number;
}

export interface UsageLogEntry {
  tenantId: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  timestamp: string;
}
