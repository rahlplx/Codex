<script setup lang="ts">
import type { Message } from '@codex/shared';
import CodeBlock from './CodeBlock.vue';
import { computed } from 'vue';

const props = defineProps<{ message: Message }>();

const isUser = computed(() => props.message.role === 'user');

const parts = computed(() => {
  const content = props.message.content;
  const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
  const result: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
  let lastIndex = 0;

  for (const match of content.matchAll(codeRegex)) {
    if (match.index! > lastIndex) {
      result.push({ type: 'text', content: content.slice(lastIndex, match.index!) });
    }
    result.push({ type: 'code', content: match[2], language: match[1] || 'text' });
    lastIndex = match.index! + match[0].length;
  }

  if (lastIndex < content.length) {
    result.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return result.length ? result : [{ type: 'text' as const, content }];
});
</script>

<template>
  <div :class="['flex', isUser ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[80%] rounded-lg px-4 py-3',
        isUser
          ? 'bg-accent text-white'
          : 'bg-bg-secondary border border-border text-text-primary',
      ]"
    >
      <template v-for="(part, i) in parts" :key="i">
        <p v-if="part.type === 'text'" class="whitespace-pre-wrap text-sm leading-relaxed">{{ part.content }}</p>
        <CodeBlock v-else :code="part.content" :language="part.language ?? 'text'" />
      </template>
    </div>
  </div>
</template>
