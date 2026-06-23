import { useThreadStore } from '@/stores/thread.store';
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { gateway } from '@/api/gateway';

export function useChat() {
  const store = useThreadStore();
  const router = useRouter();
  const streaming = ref(false);

  async function sendMessage(content: string, model?: string) {
    if (!content.trim()) return;

    let threadId = store.activeThread?.id;

    if (!threadId) {
      const thread = await store.createThread({ title: content.slice(0, 80), model });
      threadId = thread.id;
      router.replace(`/thread/${threadId}`);
    }

    await store.sendMessage(threadId, { role: 'user', content });

    streaming.value = true;
    try {
      const stream = gateway.stream('/chat/completions', {
        model: model ?? 'auto',
        messages: store.messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      });

      if (stream instanceof ReadableStream) {
        const reader = stream.getReader();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                store.appendStreamedMessage(delta);
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      }
    } finally {
      streaming.value = false;
    }
  }

  return { streaming, sendMessage };
}
