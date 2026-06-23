export interface Model {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  supportsStreaming: boolean;
  supportsToolUse: boolean;
  supportsReasoning: boolean;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  quotaRemaining?: number;
  quotaResetAt?: Date;
  error?: string;
}

export interface QuotaStatus {
  remaining: number;
  limit: number;
  resetAt: Date;
  unit: 'tokens' | 'requests';
}

export interface AdapterConfig {
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  customHeaders?: Record<string, string>;
}

export interface ICliAdapter {
  readonly id: string;
  readonly name: string;
  readonly tier: 'free' | 'freemium' | 'paid';
  readonly supportsStreaming: boolean;
  readonly supportsToolUse: boolean;
  readonly supportsReasoning: boolean;

  supportedModels(): Promise<Model[]>;
  healthCheck(): Promise<HealthStatus>;
  getQuota(): Promise<QuotaStatus>;
  chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
  initialize(config: AdapterConfig): Promise<void>;
  shutdown(): Promise<void>;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: ChatChoice[];
  usage: TokenUsage;
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | null;
}

export interface ChatCompletionChunk {
  id: string;
  model: string;
  choices: ChatChunkChoice[];
}

export interface ChatChunkChoice {
  index: number;
  delta: Partial<ChatMessage>;
  finishReason: 'stop' | 'length' | 'tool_calls' | null;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
