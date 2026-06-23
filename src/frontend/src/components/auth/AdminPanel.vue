<script setup lang="ts">
</script>

<template>
  <div class="max-w-4xl mx-auto p-6 space-y-8">
    <h1 class="text-xl font-semibold">Admin Panel</h1>

    <section class="p-4 bg-bg-secondary rounded-lg border border-border space-y-4">
      <h2 class="text-lg font-medium">Tenants</h2>
      <p class="text-text-secondary text-sm">Tenant management will be wired to the admin API.</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left">
              <th class="py-2 pr-4 text-text-secondary font-medium">Email</th>
              <th class="py-2 pr-4 text-text-secondary font-medium">Role</th>
              <th class="py-2 text-text-secondary font-medium">Usage</th>
            </tr>
          </thead>
          <tbody>
            <tr class="text-text-muted">
              <td class="py-2" colspan="3">No data available yet</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="p-4 bg-bg-secondary rounded-lg border border-border space-y-4">
      <h2 class="text-lg font-medium">System Quotas</h2>
      <div class="grid grid-cols-[200px_1fr] gap-4 items-center">
        <label class="text-sm text-text-secondary">Daily per-tenant (tokens)</label>
        <input
          type="number"
          value="100000"
          class="w-40 px-3 py-2 bg-bg-tertiary border border-border rounded text-text-primary"
        />
        <label class="text-sm text-text-secondary">Max tenants</label>
        <input
          type="number"
          value="10"
          class="w-40 px-3 py-2 bg-bg-tertiary border border-border rounded text-text-primary"
        />
      </div>
      <button class="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded transition-colors">
        Save Settings
      </button>
    </section>
  </div>
</template>
