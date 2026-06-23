export interface Thread {
  id: string
  userId: string
  title: string
  createdAt: Date
  updatedAt: Date
  archived: boolean
}

export interface Message {
  id: string
  threadId: string
  role: 'system' | 'user' | 'assistant'
  content: string
  providerId?: string
  modelId?: string
  ts: Date
}
