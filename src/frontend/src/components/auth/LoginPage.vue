<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';

const { error, loading, login } = useAuth();
const email = ref('');
const password = ref('');

function onSubmit() {
  login(email.value, password.value);
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <div class="w-full max-w-sm p-8 bg-bg-secondary rounded-lg border border-border">
      <h1 class="text-2xl font-semibold text-center mb-8">Codex</h1>

      <form @submit.prevent="onSubmit" class="space-y-4">
        <div>
          <label class="block text-sm text-text-secondary mb-1">Email</label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-3 py-2 bg-bg-tertiary border border-border rounded text-text-primary focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label class="block text-sm text-text-secondary mb-1">Password</label>
          <input
            v-model="password"
            type="password"
            required
            class="w-full px-3 py-2 bg-bg-tertiary border border-border rounded text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <p v-if="error" class="text-sm text-error">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded font-medium transition-colors disabled:opacity-50"
        >
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-text-secondary">
        Don't have an account?
        <router-link to="/register" class="text-accent hover:text-accent-hover">Register</router-link>
      </p>
    </div>
  </div>
</template>
