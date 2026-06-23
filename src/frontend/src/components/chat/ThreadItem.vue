<script setup lang="ts">
import type { Thread } from '@codex/shared';
import { useThreadStore } from '@/stores/thread.store';
import { useRouter } from 'vue-router';

const props = defineProps<{ thread: Thread; active: boolean }>();

const threadStore = useThreadStore();
const router = useRouter();

function select() {
  threadStore.selectThread(props.thread.id);
  router.push(`/thread/${props.thread.id}`);
}

function remove(e: Event) {
  e.stopPropagation();
  threadStore.deleteThread(props.thread.id);
}
</script>

<template>
  <div
    :class="[
      'px-3 py-2 cursor-pointer flex items-center justify-between group',
      active ? 'bg-bg-tertiary' : 'hover:bg-bg-hover',
    ]"
    @click="select"
  >
    <span class="text-sm truncate" :class="active ? 'text-text-primary' : 'text-text-secondary'">
      {{ thread.title || 'Untitled' }}
    </span>
    <button
      class="text-text-muted hover:text-error opacity-0 group-hover:opacity-100 text-xs transition-all"
      @click="remove"
    >
      x
    </button>
  </div>
</template>
