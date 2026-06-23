<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import NavBar from './NavBar.vue';

const auth = useAuthStore();
</script>

<template>
  <div class="min-h-screen bg-bg-primary text-text-primary">
    <NavBar v-if="auth.isAuthenticated" />
    <main :class="auth.isAuthenticated ? 'pt-14' : ''">
      <slot />
    </main>
  </div>
</template>
