<script setup lang="ts">
import { useVaultStore } from '../stores/vault'

const vault = useVaultStore()
</script>

<template>
  <div class="vault-selector">
    <button
      class="vault-selector__button"
      :disabled="vault.isSelecting"
      @click="vault.selectVault"
    >
      {{ vault.isSelecting ? 'Selecting…' : 'Select Vault' }}
    </button>
    <p v-if="vault.error" class="vault-selector__error" role="alert">
      {{ vault.error }}
    </p>
  </div>
</template>

<style scoped>
.vault-selector {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.vault-selector__button {
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  cursor: pointer;
  border: 2px solid var(--color-accent, #2e7d32);
  border-radius: 4px;
  background: transparent;
  color: var(--color-accent, #2e7d32);
  transition: background 0.15s, color 0.15s;
}

.vault-selector__button:hover:not(:disabled) {
  background: var(--color-accent, #2e7d32);
  color: var(--color-on-accent, #fff);
}

.vault-selector__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.vault-selector__error {
  font-size: 0.875rem;
  color: var(--color-error, #c62828);
}
</style>
