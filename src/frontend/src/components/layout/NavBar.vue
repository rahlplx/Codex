<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';
import { useAuth } from '@/composables/useAuth';

const auth = useAuthStore();
const { logout } = useAuth();
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-50 h-14 bg-bg-secondary border-b border-border flex items-center px-4">
    <router-link to="/" class="text-lg font-semibold text-text-primary hover:text-accent">
      Codex
    </router-link>

    <div class="flex-1" />

    <div class="flex items-center gap-4">
      <router-link
        to="/"
        class="text-sm text-text-secondary hover:text-text-primary transition-colors"
        active-class="text-accent"
      >
        Chat
      </router-link>
      <router-link
        to="/providers"
        class="text-sm text-text-secondary hover:text-text-primary transition-colors"
        active-class="text-accent"
      >
        Providers
      </router-link>
      <router-link
        to="/telemetry"
        class="text-sm text-text-secondary hover:text-text-primary transition-colors"
        active-class="text-accent"
      >
        Telemetry
      </router-link>
      <router-link
        v-if="auth.isAdmin"
        to="/admin"
        class="text-sm text-text-secondary hover:text-text-primary transition-colors"
        active-class="text-accent"
      >
        Admin
      </router-link>

      <div class="w-px h-6 bg-border" />

      <router-link
        to="/settings"
        class="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        {{ auth.user?.displayName }}
      </router-link>
      <button
        class="text-sm text-text-muted hover:text-error transition-colors"
        @click="logout"
      >
        Logout
      </button>
    </div>
  </nav>
</template>
