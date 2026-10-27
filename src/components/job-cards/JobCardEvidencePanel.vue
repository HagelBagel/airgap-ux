<script setup lang="ts">
import { ref } from 'vue'
import type { Evidence } from '../../domain/types'

const props = defineProps<{
  evidence: Evidence[]
}>()

const isOpen = ref(false)

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
</script>

<template>
  <div class="evidence-panel">
    <button
      class="evidence-panel__toggle"
      type="button"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <svg
        class="evidence-panel__chevron"
        :class="{ 'evidence-panel__chevron--open': isOpen }"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
      Evidence
      <span class="evidence-panel__count">{{ evidence.length }}</span>
    </button>

    <ul v-if="isOpen" class="evidence-panel__list">
      <li
        v-for="(item, i) in evidence"
        :key="i"
        class="evidence-panel__item"
      >
        <span class="evidence-panel__speaker">
          {{ item.speakerId }}
          <span
            v-if="item.startTime !== undefined"
            class="evidence-panel__timestamp"
          >· {{ formatTime(item.startTime) }}</span>
        </span>
        <blockquote class="evidence-panel__quote">"{{ item.text }}"</blockquote>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.evidence-panel {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.evidence-panel__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  padding: 0;
  transition: color var(--duration-fast);
}

.evidence-panel__toggle:hover {
  color: var(--color-accent);
}

.evidence-panel__chevron {
  width: 14px;
  height: 14px;
  transition: transform var(--duration-base) var(--ease-out);
}

.evidence-panel__chevron--open {
  transform: rotate(180deg);
}

.evidence-panel__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  font-size: 10px;
  color: var(--color-text-muted);
}

.evidence-panel__list {
  list-style: none;
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.evidence-panel__item {
  display: grid;
  gap: var(--space-1);
}

.evidence-panel__speaker {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-accent);
  letter-spacing: 0.03em;
}

.evidence-panel__timestamp {
  font-weight: 400;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.evidence-panel__quote {
  font-size: var(--text-sm);
  color: var(--color-text);
  line-height: 1.55;
  padding-left: var(--space-3);
  border-left: 2px solid var(--score-accent);
  font-style: italic;
}
</style>
