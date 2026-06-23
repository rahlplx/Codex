export interface Thread {
  id: string;
  tenantId: string;
  title: string | null;
  model: string | null;
  projectPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  tokensUsed: number | null;
  timestamp: string;
}

export interface CreateThreadRequest {
  title?: string;
  model?: string;
}

export interface CreateMessageRequest {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
