<script setup lang="ts">
import { useThreadStore } from '@/stores/thread.store';
import { useRouter } from 'vue-router';
import ThreadItem from './ThreadItem.vue';

const threadStore = useThreadStore();
const router = useRouter();

function newThread() {
  threadStore.activeThread = null;
  threadStore.messages = [];
  router.push('/');
}
</script>

<template>
  <aside class="h-full bg-bg-secondary border-r border-border flex flex-col">
    <div class="p-3 flex items-center justify-between border-b border-border">
      <span class="text-sm font-medium text-text-secondary">Threads</span>
      <button
        class="px-2 py-1 text-xs bg-bg-tertiary border border-border rounded hover:bg-bg-hover text-text-primary transition-colors"
        @click="newThread"
      >
        + New
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <ThreadItem
        v-for="thread in threadStore.threads"
        :key="thread.id"
        :thread="thread"
        :active="thread.id === threadStore.activeThread?.id"
      />
      <p
        v-if="threadStore.threads.length === 0"
        class="p-4 text-sm text-text-muted text-center"
      >
        No threads yet
      </p>
    </div>
  </aside>
</template>
