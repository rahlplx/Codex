<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ code: string; language: string }>();

const copied = ref(false);

function copyCode(code: string) {
  navigator.clipboard.writeText(code);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <div class="my-2 rounded border border-border overflow-hidden">
    <div class="flex items-center justify-between px-3 py-1.5 bg-bg-tertiary text-xs text-text-muted">
      <span>{{ language }}</span>
      <button
        class="hover:text-text-primary transition-colors"
        @click="copyCode(code)"
      >
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>
    <pre class="p-3 bg-bg-primary text-sm overflow-x-auto"><code>{{ code }}</code></pre>
  </div>
</template>
