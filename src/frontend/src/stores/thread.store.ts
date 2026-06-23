import { defineStore } from 'pinia';
import { ref } from 'vue';
import { gateway } from '@/api/gateway';
import type { Thread, Message, CreateThreadRequest, CreateMessageRequest } from '@codex/shared';

export const useThreadStore = defineStore('thread', () => {
  const threads = ref<Thread[]>([]);
  const activeThread = ref<Thread | null>(null);
  const messages = ref<Message[]>([]);
  const loading = ref(false);

  async function fetchThreads() {
    threads.value = await gateway.get<Thread[]>('/threads');
  }

  async function createThread(data: CreateThreadRequest): Promise<Thread> {
    const thread = await gateway.post<Thread>('/threads', data);
    threads.value.unshift(thread);
    return thread;
  }

  async function selectThread(id: string) {
    activeThread.value = await gateway.get<Thread>(`/threads/${id}`);
    messages.value = await gateway.get<Message[]>(`/threads/${id}/messages`);
  }

  async function sendMessage(threadId: string, data: CreateMessageRequest) {
    const message = await gateway.post<Message>(`/threads/${threadId}/messages`, data);
    messages.value.push(message);
    return message;
  }

  async function deleteThread(id: string) {
    await gateway.delete(`/threads/${id}`);
    threads.value = threads.value.filter((t) => t.id !== id);
    if (activeThread.value?.id === id) {
      activeThread.value = null;
      messages.value = [];
    }
  }

  function appendStreamedMessage(content: string) {
    const last = messages.value[messages.value.length - 1];
    if (last && last.role === 'assistant') {
      last.content += content;
    } else {
      messages.value.push({
        id: 'streaming',
        thread_id: activeThread.value?.id ?? '',
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
      });
    }
  }

  function finalizeStreamedMessage(fullMessage: Message) {
    const idx = messages.value.findIndex((m) => m.id === 'streaming');
    if (idx >= 0) {
      messages.value[idx] = fullMessage;
    }
  }

  return {
    threads,
    activeThread,
    messages,
    loading,
    fetchThreads,
    createThread,
    selectThread,
    sendMessage,
    deleteThread,
    appendStreamedMessage,
    finalizeStreamedMessage,
  };
});
