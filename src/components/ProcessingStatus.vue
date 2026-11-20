<script setup lang="ts">
import { computed } from 'vue'
import type { ProcessingStage } from '../domain/types'
import { useResearchStore } from '../stores/useResearchStore'
import { exportJson } from '../services/export/exportJson'
import { exportCsv } from '../services/export/exportCsv'
import ProcessingTimeStats from './ProcessingTimeStats.vue'
import ProcessingTaskList from './ProcessingTaskList.vue'

const props = defineProps<{
  stage: ProcessingStage
  loadProgress: number
  progressDetail: string
  usedFallback: boolean
  startedAt: number | null
  allowCalibrationLearning: boolean
}>()

const store = useResearchStore()

const canExport = computed(() => 
  props.stage === 'done' && 
  store.currentProject && 
  store.currentProject.jobCards.length > 0
)

async function handleExportJson() {
  if (!store.currentProject) return
  await exportJson(store.currentProject.jobCards, store.currentProject.name)
}

async function handleExportCsv() {
  if (!store.currentProject) return
  await exportCsv(store.currentProject.jobCards, store.currentProject.name)
}

const isWorking = computed(() =>
  !['idle', 'done', 'error'].includes(props.stage),
)

const isLoadingModels = computed(() => props.stage === 'loading-models')

const progressPercent = computed(() => Math.round(props.loadProgress * 100))

const statusLabel = computed<string>(() => {
  switch (props.stage) {
    case 'loading-models': return 'Loading models…'
    case 'extracting':     return 'Analyzing Outcomes…'
    case 'scoring':        return 'Calculating Opportunity Scores…'
    default:               return ''
  }
})
</script>

<template>
  <div class="processing-status">

    <!-- Status strip: visible while pipeline is active -->
    <div
      v-if="isWorking"
      class="processing-status__strip"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <!-- Progress bar: model-loading phase only -->
      <div v-if="isLoadingModels" class="processing-status__bar-wrap">
        <div
          class="processing-status__bar"
          role="progressbar"
          :aria-valuenow="progressPercent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="processing-status__fill"
            :style="{ width: `${progressPercent}%` }"
          ></div>
        </div>
        <span class="processing-status__percent" aria-hidden="true">{{ progressPercent }}%</span>
      </div>

      <!-- Stage label with animated pulse dot -->
      <p class="processing-status__label">
        <span class="processing-status__dot" aria-hidden="true"></span>
        {{ statusLabel }}
      </p>

      <p v-if="props.progressDetail" class="processing-status__detail">
        {{ props.progressDetail }}
      </p>

      <!-- Task checklist showing each pipeline stage -->
      <ProcessingTaskList :stage="props.stage" />

      <p
        v-if="props.usedFallback"
        class="processing-status__fallback"
        aria-live="polite"
      >
        Fallback extraction used
      </p>

      <ProcessingTimeStats
        :started-at="props.startedAt"
        :progress="props.loadProgress"
        :is-working="isWorking"
        :stage="props.stage"
        :allow-calibration-learning="props.allowCalibrationLearning"
      />
    </div>

    <!-- Export buttons -->
    <div class="processing-status__right-section">
      <!-- Export buttons: only show when processing is complete and there's data -->
      <div v-if="canExport" class="processing-status__export-buttons">
        <button
          @click="handleExportJson"
          class="processing-status__export-btn"
          title="Export outcomes as JSON file"
        >
          Export JSON
        </button>
        <button
          @click="handleExportCsv"
          class="processing-status__export-btn"
          title="Export outcomes as CSV file"
        >
          Export CSV
        </button>
      </div>

    </div>

  </div>
</template>

<style scoped>
.processing-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  min-height: 52px;
}

/* ── Status strip (left side) ────────────────────────────────────────────────── */
.processing-status__strip {
  display: grid;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
}

/* Progress bar */
.processing-status__bar-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.processing-status__bar {
  flex: 1;
  height: 5px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.processing-status__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--c-forest-600), var(--c-forest-400));
  border-radius: var(--radius-full);
  transition: width 1000ms var(--ease-out);
}

.processing-status__percent {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  min-width: 2.8ch;
  text-align: right;
}

/* Stage label */
.processing-status__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.processing-status__detail {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  line-height: 1.35;
  opacity: 0.95;
}

.processing-status__dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-forest-500);
  flex-shrink: 0;
  animation: status-pulse 1.8s ease-in-out infinite;
}

.processing-status__fallback {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  border: 1px solid var(--c-amber-200);
  background: var(--c-amber-100);
  color: var(--c-amber-700);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
}

@keyframes status-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.75); }
}

/* ── Right Section (Export buttons) ──────────────────────────────────────── */
.processing-status__right-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.processing-status__export-buttons {
  display: flex;
  gap: var(--space-2);
}

.processing-status__export-btn {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms var(--ease-out);
  white-space: nowrap;
}

.processing-status__export-btn:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.processing-status__export-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>
