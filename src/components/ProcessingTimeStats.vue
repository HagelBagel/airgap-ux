<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ProcessingStage } from '../domain/types'
import { useEtaCalibration } from '../composables/useEtaCalibration'

const props = defineProps<{
  startedAt: number | null
  progress: number
  isWorking: boolean
  stage: ProcessingStage
  allowCalibrationLearning: boolean
}>()

const {
  autoCalibrate,
  stageOrder,
  isCalibratedStage,
  getEstimatedStageSeconds,
  recordRun,
} = useEtaCalibration()

const now = ref(Date.now())
let timerId: ReturnType<typeof setInterval> | null = null
const stageStartedAt = ref<number | null>(null)
const runDurations = ref<Partial<Record<ProcessingStage, number>>>({})
const lastCommittedRunStartedAt = ref<number | null>(null)

watch(
  () => props.startedAt,
  (value) => {
    if (value === null) {
      stageStartedAt.value = null
      runDurations.value = {}
      return
    }

    runDurations.value = {}
    stageStartedAt.value = Date.now()
  },
  { immediate: true },
)

watch(
  () => props.stage,
  (nextStage, prevStage) => {
    const transitionAt = Date.now()

    if (prevStage && isCalibratedStage(prevStage) && stageStartedAt.value !== null) {
      const duration = Math.max(1, Math.floor((transitionAt - stageStartedAt.value) / 1000))
      runDurations.value[prevStage] = (runDurations.value[prevStage] ?? 0) + duration
    }

    stageStartedAt.value = isCalibratedStage(nextStage) ? transitionAt : null

    if (
      nextStage === 'done'
      && props.startedAt
      && props.startedAt !== lastCommittedRunStartedAt.value
      && props.allowCalibrationLearning
      && autoCalibrate.value
    ) {
      recordRun(runDurations.value)
      lastCommittedRunStartedAt.value = props.startedAt
      runDurations.value = {}
    }

    if (nextStage === 'idle' || nextStage === 'error') {
      runDurations.value = {}
    }
  },
)

function startTicker(): void {
  if (timerId) return
  timerId = setInterval(() => {
    now.value = Date.now()
  }, 1000)
}

function stopTicker(): void {
  if (!timerId) return
  clearInterval(timerId)
  timerId = null
}

onMounted(() => {
  startTicker()
})

onBeforeUnmount(() => {
  stopTicker()
})

const elapsedSeconds = computed(() => {
  if (!props.startedAt) return 0
  return Math.max(0, Math.floor((now.value - props.startedAt) / 1000))
})

const remainingSeconds = computed<number | null>(() => {
  if (!props.isWorking) return 0
  const stage = props.stage
  if (!isCalibratedStage(stage)) return null

  const stageEstimate = getEstimatedStageSeconds(stage)
  const stageElapsed = stageStartedAt.value
    ? Math.max(0, Math.floor((now.value - stageStartedAt.value) / 1000))
    : 0

  const p = Math.min(Math.max(props.progress, 0), 1)
  let currentStageRemaining: number

  if (p > 0.05 && p < 1) {
    const rateEstimated = Math.floor((stageElapsed * (1 - p)) / p)
    // Guardrail: avoid wildly unstable estimates from noisy progress updates.
    currentStageRemaining = Math.min(
      Math.max(rateEstimated, Math.floor(stageEstimate * 0.2)),
      stageEstimate * 2,
    )
  } else if (p >= 1) {
    currentStageRemaining = 0
  } else {
    currentStageRemaining = Math.max(stageEstimate - stageElapsed, Math.floor(stageEstimate * 0.35))
  }

  const stageIndex = stageOrder.indexOf(stage)
  const futureStages = stageOrder.slice(stageIndex + 1)
  const futureRemaining = futureStages.reduce(
    (sum, s) => sum + getEstimatedStageSeconds(s),
    0,
  )

  return Math.max(0, currentStageRemaining + futureRemaining)
})

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const elapsedLabel = computed(() => formatDuration(elapsedSeconds.value))
const etaLabel = computed(() => {
  if (!props.isWorking) return '00:00'
  if (remainingSeconds.value === null) return '--:--'
  return formatDuration(remainingSeconds.value)
})
</script>

<template>
  <div class="processing-time">
    <p class="processing-time__item">
      <span class="processing-time__key">Elapsed</span>
      <span class="processing-time__value">{{ elapsedLabel }}</span>
    </p>
    <p class="processing-time__item">
      <span class="processing-time__key">Remaining</span>
      <span class="processing-time__value">{{ etaLabel }}</span>
    </p>
  </div>
</template>

<style scoped>
.processing-time {
  display: inline-flex;
  align-items: center;
  gap: var(--space-4);
  color: var(--color-text-muted);
  flex-wrap: wrap;
}

.processing-time__item {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  margin: 0;
}

.processing-time__key {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.processing-time__value {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text);
}
</style>
