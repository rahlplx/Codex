<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  providers: Array<{ status: string }>;
}>();

const active = computed(() => props.providers.filter((p) => p.status === 'active').length);
const degraded = computed(() => props.providers.filter((p) => p.status === 'degraded').length);
const down = computed(() => props.providers.filter((p) => p.status === 'down').length);
</script>

<template>
  <div class="flex items-center gap-6 p-4 bg-bg-secondary border border-border rounded-lg">
    <span class="text-sm font-medium text-text-secondary">System Health</span>
    <span class="text-sm text-success">● {{ active }} Active</span>
    <span class="text-sm text-warning">● {{ degraded }} Degraded</span>
    <span class="text-sm text-error">● {{ down }} Down</span>
  </div>
</template>
