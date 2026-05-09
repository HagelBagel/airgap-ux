<script setup lang="ts">
import { computed } from 'vue'
import { useEtaCalibration } from '../composables/useEtaCalibration'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const etaCalibration = useEtaCalibration()

const calibrationRunsLabel = computed(() => {
  const runs = etaCalibration.profile.value.completedRuns
  return runs === 1 ? '1 calibration run' : `${runs} calibration runs`
})

const hasCalibrationRuns = computed(() => etaCalibration.profile.value.completedRuns > 0)

function handleBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <div v-if="isOpen" class="app-settings" @click="handleBackdropClick">
    <div class="app-settings__dialog">
      <header class="app-settings__header">
        <h2 class="app-settings__title">Settings</h2>
        <button class="app-settings__close" @click="emit('close')" aria-label="Close settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </header>

      <main class="app-settings__content">
        <section class="app-settings__section">
          <h3 class="app-settings__section-title">ETA Calibration</h3>
          <div class="app-settings__eta-controls">
            <label class="app-settings__eta-toggle" title="Learns per-stage timing on this device to improve ETA estimates.">
              <input
                v-model="etaCalibration.autoCalibrate"
                type="checkbox"
                class="app-settings__eta-checkbox"
              />
              Auto-calibrate ETA
            </label>

            <span class="app-settings__eta-runs" :title="calibrationRunsLabel">
              {{ calibrationRunsLabel }}
            </span>

            <button
              class="app-settings__eta-reset"
              type="button"
              :disabled="!hasCalibrationRuns"
              @click="etaCalibration.resetCalibration"
            >
              Reset ETA
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-settings {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.app-settings__dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.app-settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.app-settings__title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text);
}

.app-settings__close {
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

.app-settings__close:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.app-settings__content {
  padding: var(--space-5);
}

.app-settings__section {
  margin-bottom: var(--space-6);
}

.app-settings__section:last-child {
  margin-bottom: 0;
}

.app-settings__section-title {
  margin: 0 0 var(--space-4) 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text);
}

.app-settings__eta-controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.app-settings__eta-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
}

.app-settings__eta-checkbox {
  margin: 0;
  accent-color: var(--c-forest-600);
}

.app-settings__eta-runs {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-weight: 500;
}

.app-settings__eta-reset {
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--text-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  align-self: flex-start;
}

.app-settings__eta-reset:hover:not(:disabled) {
  background: var(--color-surface-active);
  border-color: var(--c-forest-600);
}

.app-settings__eta-reset:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
