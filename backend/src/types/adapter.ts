export type Tier = 'free' | 'freemium' | 'paid'

export interface HealthStatus {
  healthy: boolean
  latencyMs: number
  score: number
  quotaRemaining?: number
  quotaResetAt?: Date
  error?: string
}

export interface QuotaStatus {
  unlimited: boolean
  remaining: number | null
  resetAt: Date | null
}

export interface Model {
  id: string
  name: string
  contextWindow: number
  supportsStreaming: boolean
  supportsToolUse: boolean
  supportsReasoning: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
}

export interface ChatCompletionRequest {
  model?: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  maxTokens?: number
}

export interface ChatCompletionChoice {
  index: number
  message: ChatMessage
  finishReason: 'stop' | 'length' | 'tool_calls' | null
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ChatCompletionResponse {
  id: string
  choices: ChatCompletionChoice[]
  usage: TokenUsage
  model?: string
  provider?: string
}

export interface ChatCompletionChunk {
  id: string
  choices: Array<{
    index: number
    delta: Partial<ChatMessage>
    finishReason: string | null
  }>
}

export interface AdapterConfig {
  apiKey?: string
  baseUrl?: string
  timeout?: number
  maxRetries?: number
  [key: string]: unknown
}

export interface ICliAdapter {
  readonly id: string
  readonly name: string
  readonly tier: Tier
  readonly supportsStreaming: boolean
  readonly supportsToolUse: boolean

  initialize(config: AdapterConfig): Promise<void>
  shutdown(): Promise<void>
  healthCheck(): Promise<HealthStatus>
  getQuota(): Promise<QuotaStatus>
  supportedModels(): Promise<Model[]>
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>
  chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>
}
