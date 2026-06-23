<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppLayout from '@/components/layout/AppLayout.vue';
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
auth.loadFromStorage();
</script>

<template>
  <AppLayout>
    <RouterView />
  </AppLayout>
</template>
