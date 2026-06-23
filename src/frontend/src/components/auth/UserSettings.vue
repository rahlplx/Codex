<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store';

const auth = useAuthStore();
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 space-y-8">
    <h1 class="text-xl font-semibold">Settings</h1>

    <section class="p-4 bg-bg-secondary rounded-lg border border-border space-y-4">
      <h2 class="text-lg font-medium">Profile</h2>
      <div class="grid grid-cols-[120px_1fr] gap-4 items-center">
        <span class="text-sm text-text-secondary">Name</span>
        <span class="text-text-primary">{{ auth.user?.displayName }}</span>
        <span class="text-sm text-text-secondary">Email</span>
        <span class="text-text-muted">{{ auth.user?.email }}</span>
        <span class="text-sm text-text-secondary">Role</span>
        <span class="text-text-primary capitalize">{{ auth.user?.role }}</span>
      </div>
    </section>

    <section class="p-4 bg-bg-secondary rounded-lg border border-border space-y-4">
      <h2 class="text-lg font-medium">Default Model</h2>
      <select class="w-full px-3 py-2 bg-bg-tertiary border border-border rounded text-text-primary">
        <option value="auto">Auto (best available)</option>
      </select>
    </section>

    <section class="p-4 bg-bg-secondary rounded-lg border border-border space-y-4">
      <h2 class="text-lg font-medium text-error">Danger Zone</h2>
      <button class="px-4 py-2 border border-error text-error rounded hover:bg-error hover:text-white transition-colors">
        Delete Account
      </button>
    </section>
  </div>
</template>
