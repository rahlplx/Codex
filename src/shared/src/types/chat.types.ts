import type { ChatMessage as AdapterChatMessage } from './adapter.types.js';

export interface ChatCompletionApiRequest {
  model: string;
  messages: AdapterChatMessage[];
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  threadId?: string;
}

export interface ChatCompletionApiResponse {
  id: string;
  threadId: string;
  model: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatStreamEvent {
  type: 'chunk' | 'done' | 'error';
  data: string;
  model?: string;
  threadId?: string;
}
