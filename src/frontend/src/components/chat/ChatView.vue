<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useThreadStore } from '@/stores/thread.store';
import { useChat } from '@/composables/useChat';
import ThreadSidebar from './ThreadSidebar.vue';
import MessageBubble from './MessageBubble.vue';
import ChatInput from './ChatInput.vue';
import ModelSelector from './ModelSelector.vue';

const route = useRoute();
const threadStore = useThreadStore();
const { streaming, sendMessage } = useChat();
const selectedModel = ref('auto');

onMounted(async () => {
  await threadStore.fetchThreads();
  const id = route.params.id as string | undefined;
  if (id) {
    await threadStore.selectThread(id);
  }
});

function onSend(content: string) {
  sendMessage(content, selectedModel.value);
}
</script>

<template>
  <div class="flex h-[calc(100vh-3.5rem)]">
    <ThreadSidebar class="w-64 shrink-0 hidden md:block" />

    <div class="flex-1 flex flex-col min-w-0">
      <div class="h-12 px-4 flex items-center border-b border-border bg-bg-secondary">
        <ModelSelector v-model="selectedModel" />
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <template v-if="threadStore.messages.length === 0">
          <div class="flex items-center justify-center h-full">
            <div class="text-center space-y-2">
              <p class="text-2xl font-semibold text-text-primary">Codex</p>
              <p class="text-text-secondary">Start a conversation to begin.</p>
            </div>
          </div>
        </template>
        <MessageBubble
          v-for="msg in threadStore.messages"
          :key="msg.id"
          :message="msg"
        />
      </div>

      <ChatInput :disabled="streaming" @send="onSend" />
    </div>
  </div>
</template>
