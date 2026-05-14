<script setup lang="ts">
import VaultSelector from '../components/VaultSelector.vue'
import { useVaultStore } from '../stores/vault'

const vault = useVaultStore()
</script>

<template>
  <main class="home-view">
    <section v-if="!vault.activeVault" class="home-view__setup">
      <h1 class="home-view__heading">Welcome to AirGap UX</h1>
      <p class="home-view__description">Select a local folder to use as your research vault.</p>
      <VaultSelector />
    </section>
    <section v-else class="home-view__vault-active">
      <p class="home-view__vault-name">Vault: <strong>{{ vault.activeVault.name }}</strong></p>
    </section>
  </main>
</template>

<style scoped>
.home-view {
  padding: 2rem;
}

.home-view__setup {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 480px;
}

.home-view__heading {
  font-size: 1.5rem;
  margin: 0;
}

.home-view__description {
  margin: 0;
  color: var(--color-text-muted, #555);
}

.home-view__vault-name {
  font-size: 1rem;
}
</style>
