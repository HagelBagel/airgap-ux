<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <!-- The app name is brand text, not a heading: each page owns its single <h1>. -->
  <header class="app-header">
    <RouterLink class="app-header__brand" to="/">AirGap UX</RouterLink>
    <div v-if="$slots.default" class="app-header__actions">
      <slot />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-header__brand {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--color-text);
  text-decoration: none;

  &:hover,
  &:focus-visible {
    color: var(--color-accent);
  }
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
</style>
