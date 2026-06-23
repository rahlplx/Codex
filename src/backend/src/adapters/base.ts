import type {
  ICliAdapter,
  Model,
  HealthStatus,
  QuotaStatus,
  AdapterConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
} from '@codex/shared';

export abstract class BaseAdapter implements ICliAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly tier: 'free' | 'freemium' | 'paid';
  abstract readonly supportsStreaming: boolean;
  abstract readonly supportsToolUse: boolean;
  abstract readonly supportsReasoning: boolean;

  protected config: AdapterConfig = { enabled: false };
  protected initialized = false;

  async initialize(config: AdapterConfig): Promise<void> {
    this.config = config;
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  abstract supportedModels(): Promise<Model[]>;
  abstract healthCheck(): Promise<HealthStatus>;
  abstract getQuota(): Promise<QuotaStatus>;
  abstract chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  abstract chatCompletionStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`Adapter ${this.id} not initialized. Call initialize() first.`);
    }
  }
}
