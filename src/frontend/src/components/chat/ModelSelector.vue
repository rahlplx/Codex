<script setup lang="ts">
import { ref } from 'vue';

const model = defineModel<string>({ required: true });
const open = ref(false);

const models = [
  { id: 'auto', name: 'Auto (best available)', group: 'Recommended' },
  { id: 'nemotron-3-super', name: 'Nemotron 3 Super', group: 'Free' },
  { id: 'zen-default', name: 'OpenCode Zen', group: 'Free' },
  { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', group: 'Free' },
];

const selectedName = () => models.find((m) => m.id === model.value)?.name ?? model.value;

function select(id: string) {
  model.value = id;
  open.value = false;
}
</script>

<template>
  <div class="relative">
    <button
      class="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1"
      @click="open = !open"
    >
      Model: {{ selectedName() }}
      <span class="text-xs">▼</span>
    </button>

    <div
      v-if="open"
      class="absolute top-full left-0 mt-1 w-64 bg-bg-secondary border border-border rounded-lg shadow-lg z-50 py-1"
    >
      <div
        v-for="m in models"
        :key="m.id"
        class="px-3 py-2 text-sm cursor-pointer hover:bg-bg-hover"
        :class="m.id === model ? 'text-accent' : 'text-text-primary'"
        @click="select(m.id)"
      >
        {{ m.name }}
      </div>
    </div>

    <div v-if="open" class="fixed inset-0 z-40" @click="open = false" />
  </div>
</template>
