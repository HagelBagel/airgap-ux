<script setup lang="ts">
// Rendered only when JobCard.hasTension is true.
// Communicates that two or more speakers rated Satisfaction differently
// by more than 3 points — a signal of conflicting user segments.
</script>

<template>
  <span class="tension-badge" role="img" aria-label="Tension: speakers disagree on satisfaction">
    <svg
      class="tension-badge__icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fill-rule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clip-rule="evenodd"
      />
    </svg>
    Tension
  </span>
</template>

<style scoped>
.tension-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--c-amber-100);
  color: var(--c-amber-700);
  border: 1px solid var(--c-amber-200);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  flex-shrink: 0;

  .tension-badge__icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
}
</style>
