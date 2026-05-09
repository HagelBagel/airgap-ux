<script setup lang="ts">
import { computed } from 'vue'
import type { ProcessingStage } from '../domain/types'

const props = defineProps<{
  stage: ProcessingStage
}>()

const TASK_STAGES: Array<{ id: ProcessingStage; label: string }> = [
  { id: 'loading-models', label: 'Loading Models' },
  { id: 'transcribing', label: 'Transcribing' },
  { id: 'extracting', label: 'Analyzing Outcomes' },
  { id: 'scoring', label: 'Calculating Scores' },
]

const STAGE_ORDER: ProcessingStage[] = ['loading-models', 'transcribing', 'extracting', 'scoring']

const tasks = computed(() => {
  const currentIndex = STAGE_ORDER.indexOf(props.stage)

  return TASK_STAGES.map((task) => {
    const taskIndex = STAGE_ORDER.indexOf(task.id)
    let status: 'completed' | 'in-progress' | 'pending'

    if (currentIndex === -1) {
      status = 'pending'
    } else if (taskIndex < currentIndex) {
      status = 'completed'
    } else if (taskIndex === currentIndex) {
      status = 'in-progress'
    } else {
      status = 'pending'
    }

    return { ...task, status }
  })
})
</script>

<template>
  <div class="task-list">
    <ul class="task-list__items">
      <li v-for="task in tasks" :key="task.id" class="task-list__item" :class="`task-list__item--${task.status}`">
        <span class="task-list__indicator">
          <svg
            v-if="task.status === 'completed'"
            class="task-list__icon task-list__icon--check"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          <span v-else-if="task.status === 'in-progress'" class="task-list__pulse" aria-hidden="true"></span>
          <span v-else class="task-list__dot" aria-hidden="true"></span>
        </span>
        <span class="task-list__label">{{ task.label }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.task-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.task-list__items {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.task-list__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background var(--duration-fast);
}

.task-list__item--completed {
  color: var(--c-forest-700);
  background: rgba(45, 106, 79, 0.08);
}

.task-list__item--in-progress {
  color: var(--color-text);
  background: rgba(45, 106, 79, 0.12);
  font-weight: 600;
}

.task-list__item--pending {
  color: var(--color-text-muted);
  background: transparent;
}

.task-list__indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.task-list__icon--check {
  width: 18px;
  height: 18px;
  color: var(--c-forest-600);
}

.task-list__pulse {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-forest-500);
  animation: task-pulse 1.5s ease-in-out infinite;
}

.task-list__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-border);
}

@keyframes task-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.3);
  }
}
</style>
