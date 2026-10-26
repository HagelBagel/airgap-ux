<script setup lang="ts">
import { computed, ref } from 'vue'
import { useResearchStore, MOCK_MODE } from '../stores/useResearchStore'
import { MOCK_SEGMENTS } from '../services/ai/mockData'
import ResearchWorkbench from '../components/ResearchWorkbench.vue'
import ProcessingStatus from '../components/ProcessingStatus.vue'
import AppSettings from '../components/AppSettings.vue'

const store = useResearchStore()

// ── Settings dialog state ────────────────────────────────────────────────────
const isSettingsOpen = ref(false)

// ── Derived UI state ──────────────────────────────────────────────────────────

const isIdle     = computed(() => store.processingStage === 'idle')
const hasResults = computed(() =>
  (store.currentProject?.jobCards?.length ?? 0) > 0,
)

// ── Actions ───────────────────────────────────────────────────────────────────

// Transcript import is not built yet (see ADR 0002); in Mock Mode the sample
// transcript keeps the analysis UI usable in the meantime.
function analyzeSampleTranscript(): void {
  store.analyzeSegments(MOCK_SEGMENTS, 'Sample interview')
}

function reset(): void {
  store.resetProject()
}

</script>

<template>
  <div class="dashboard">

    <!-- ── Top bar ─────────────────────────────────────────────────────────── -->
    <header class="dashboard__header">
      <div class="dashboard__brand">
        <h1 class="dashboard__title">Sovereign JTBD</h1>
        <div class="dashboard__subtitle">Jobs-to-be-Done Research Assistant</div>
      </div>
      
      <div class="dashboard__controls">
        
      </div>
      
      <div class="dashboard__actions">
        <button
          class="dashboard__btn"
          @click="isSettingsOpen = true"
        >
          <svg class="dashboard__btn-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 1.54l4.24 4.24M20.46 20.46l-4.24-4.24M1.54 20.46l4.24-4.24"></path>
          </svg>
          Settings
        </button>

        <button
          v-if="store.currentProject"
          class="dashboard__reset-btn"
          type="button"
          @click="reset"
        >
          ↺ New Project
        </button>
      </div>
    </header>

    <!-- ── Main content ────────────────────────────────────────────────────── -->
    <main class="dashboard__body">

      <!-- Processing status strip + Sovereign Badge -->
      <ProcessingStatus
        :stage="store.processingStage"
        :load-progress="store.loadProgress"
        :progress-detail="store.processingDetail"
        :used-fallback="store.usedFallback"
        :started-at="store.processingStartedAt"
        :allow-calibration-learning="!MOCK_MODE"
      />

      <!-- Transcript import placeholder: only shown when idle -->
      <section v-if="isIdle" class="dashboard__section">
        <div class="dashboard__import">
          <p class="dashboard__import-text">Transcript import is coming soon.</p>
          <button
            v-if="MOCK_MODE"
            class="dashboard__import-btn"
            type="button"
            @click="analyzeSampleTranscript"
          >
            Analyse sample transcript
          </button>
        </div>
      </section>

      <!-- Error state -->
      <section v-if="store.processingStage === 'error'" class="dashboard__section">
        <div class="dashboard__error" role="alert">
          <svg class="dashboard__error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/>
          </svg>
          <p class="dashboard__error-text">{{ store.error }}</p>
          <button class="dashboard__error-retry" type="button" @click="reset">
            Try again
          </button>
        </div>
      </section>
      
      
      <!-- Results grid: stays visible after processing is done -->      
      <section v-if="hasResults" class="dashboard__section">
        <ResearchWorkbench :transcriptBlocks="store.currentProject?.segments ?? []" />
      </section>

      <!-- Empty state after successful processing with no results -->
      <section
        v-if="store.processingStage === 'done' && !hasResults"
        class="dashboard__section"
      >
        <div class="dashboard__empty">
          <p>No outcomes could be extracted from this transcript.</p>
          <p class="dashboard__empty-hint">Try a longer interview, or check the transcript in the store.</p>
          <button class="dashboard__reset-btn" type="button" @click="reset">
            Start over
          </button>
        </div>
      </section>

    </main>
  </div>

  <!-- Settings Dialog -->
  <AppSettings :is-open="isSettingsOpen" @close="isSettingsOpen = false" />
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────────── */
.dashboard {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}

/* ── Header ──────────────────────────────────────────────────────────────────── */
.dashboard__header {
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

.dashboard__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.dashboard__logo {
  width: 28px;
  height: 28px;
  color: var(--color-accent);
}

.dashboard__title {
  font-size: var(--text-lg);
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--color-text);
}

.dashboard__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.dashboard__eta-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  user-select: none;
}

.dashboard__eta-checkbox {
  accent-color: var(--color-accent);
}

.dashboard__eta-runs {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.dashboard__eta-reset {
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  transition:
    border-color var(--duration-fast),
    color var(--duration-fast);
}

.dashboard__eta-reset:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.dashboard__eta-reset:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.dashboard__mock-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--c-forest-50);
  color: var(--c-forest-700);
  border: 1px solid var(--c-forest-200);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}


.dashboard__mock-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-forest-500);
  /* Slow pulse to draw attention without being distracting */
  animation: pulse 2.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

.dashboard__reset-btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  transition:
    border-color var(--duration-fast),
    color        var(--duration-fast);
}

.dashboard__reset-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.dashboard__settings-btn {
  background: none;
  border: none;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dashboard__settings-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

/* ── Body ────────────────────────────────────────────────────────────────────── */
.dashboard__body {
  padding: var(--space-8) var(--space-6);
  max-width: 1200px;
  width: 100%;
  margin-inline: auto;
  display: grid;
  gap: var(--space-8);
  align-content: start;
}

.dashboard__section {
  display: grid;
  gap: var(--space-4);
}

/* ── Error state ─────────────────────────────────────────────────────────────── */
.dashboard__error {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-lg);
  color: #991b1b;
}

.dashboard__error-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #dc2626;
}

.dashboard__error-text {
  flex: 1;
  font-size: var(--text-sm);
}

.dashboard__error-retry {
  padding: var(--space-1) var(--space-3);
  border: 1px solid #fca5a5;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 600;
  color: #991b1b;
  background: var(--c-white);
  transition: background var(--duration-fast);
}

.dashboard__error-retry:hover {
  background: #fef2f2;
}



/* ── Transcript import placeholder ────────────────────────────────────────────── */
.dashboard__import {
  display: grid;
  justify-items: center;
  gap: var(--space-4);
  padding: var(--space-8);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
  text-align: center;
  color: var(--color-text-muted);
}

.dashboard__import-btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-accent);
  transition:
    background var(--duration-fast),
    color      var(--duration-fast);
}

.dashboard__import-btn:hover {
  background: var(--color-accent);
  color: var(--c-white);
}

/* ── Empty state ─────────────────────────────────────────────────────────────── */
.dashboard__empty {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-muted);
}

.dashboard__empty-hint {
  font-size: var(--text-sm);
}
</style>
