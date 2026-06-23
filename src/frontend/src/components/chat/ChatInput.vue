<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ disabled: boolean }>();
const emit = defineEmits<{ send: [content: string] }>();

const input = ref('');

function onSubmit() {
  if (!input.value.trim()) return;
  emit('send', input.value);
  input.value = '';
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onSubmit();
  }
}
</script>

<template>
  <div class="p-4 border-t border-border bg-bg-secondary">
    <form @submit.prevent="onSubmit" class="flex gap-2">
      <textarea
        v-model="input"
        :disabled="disabled"
        rows="1"
        placeholder="Type a message..."
        class="flex-1 px-4 py-2.5 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent"
        @keydown="onKeydown"
      />
      <button
        type="submit"
        :disabled="disabled || !input.trim()"
        class="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        Send
      </button>
    </form>
  </div>
</template>
