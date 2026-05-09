<script setup lang="ts">
import { ref, computed } from 'vue'
import { useResearchStore } from '../../stores/useResearchStore'
import TensionMapBadge from '../tension-map/TensionMapBadge.vue'
import JobCardEvidencePanel from './JobCardEvidencePanel.vue'
import type { JobCard } from '../../domain/types'

const props = defineProps<{
  card: JobCard
  isSelected?: boolean
  isHovered?: boolean
}>()

const emit = defineEmits<{
  'selection-change': [cardId: string, checked: boolean]
  'card-hover': [cardId: string | null]
  'card-click': [cardId: string]
}>()

const store = useResearchStore()

// ── Local slider state ────────────────────────────────────────────────────────
// Mirrors props on mount so sliders are initialised correctly.
// Kept local to avoid mutating the prop directly and to enable
// live score preview while dragging (before the debounced store update fires).
const localImportance   = ref(Math.round(props.card.averageImportance))
const localSatisfaction = ref(Math.round(props.card.averageSatisfaction))

// ── Live score preview ────────────────────────────────────────────────────────
// Recomputes the opportunity score instantly as the slider moves,
// giving tactile feedback without waiting for the store round-trip.
const displayScore = computed(() =>
  localImportance.value + Math.max(localImportance.value - localSatisfaction.value, 0),
)

// ── Heatmap colour modifier ───────────────────────────────────────────────────
// Maps the live score to one of three CSS modifier classes:
//   > 15  → Forest green (prime opportunity)
//   10–15 → Sage green   (moderate opportunity)
//   < 10  → Slate grey   (low priority / over-served)
const scoreClass = computed(() => {
  const s = displayScore.value
  if (s > 15) return 'job-card--high'
  if (s >= 10) return 'job-card--mid'
  return 'job-card--low'
})

// ── Debounced store update ────────────────────────────────────────────────────
// Fires 300 ms after the user stops moving a slider.
// This keeps Pinia state in sync without triggering a re-render on every tick.
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onSliderInput(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.updateCardScore(props.card.id, {
      importance:   localImportance.value,
      satisfaction: localSatisfaction.value,
    })
  }, 300)
}

function handleSelectionChange(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('selection-change', props.card.id, target.checked)
}

function handleMouseEnter(): void {
  emit('card-hover', props.card.id)
}

function handleMouseLeave(): void {
  emit('card-hover', null)
}

function handleCardClick(): void {
  emit('card-click', props.card.id)
}
</script>

<template>
  <article 
    class="job-card" 
    :class="[scoreClass, { 'job-card--hovered': props.isHovered }]"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleCardClick"
  >

    <!-- ── Header: score ring + tension badge ──────────────────────────────── -->
    <header class="job-card__header">
      <div class="job-card__score" :title="`Opportunity Score: ${displayScore}`">
        <span class="job-card__score-value">{{ displayScore }}</span>
        <span class="job-card__score-label">Opportunity</span>
      </div>

      <div class="job-card__badges">
        <TensionMapBadge v-if="card.hasTension" />
        <label v-if="props.isSelected !== undefined" class="job-card__select-label" :for="`select-${card.id}`">
          <input
            :id="`select-${card.id}`"
            type="checkbox"
            :checked="props.isSelected"
            @change="handleSelectionChange"
          />
          <span>Select</span>
        </label>
      </div>
    </header>

    <!-- ── Desired Outcome description ────────────────────────────────────── -->
    <p class="job-card__description">{{ card.description }}</p>

    <!-- ── Strategyn sliders ──────────────────────────────────────────────── -->
    <div class="job-card__sliders" role="group" aria-label="Score refinement">

      <div class="job-card__slider-row">
        <label class="job-card__slider-label" :for="`importance-${card.id}`">
          Importance
        </label>
        <input
          :id="`importance-${card.id}`"
          class="job-card__range"
          type="range"
          min="1"
          max="10"
          step="1"
          v-model.number="localImportance"
          @input="onSliderInput"
          :aria-valuetext="`Importance: ${localImportance} out of 10`"
        />
        <span class="job-card__slider-value">{{ localImportance }}</span>
      </div>

      <div class="job-card__slider-row">
        <label class="job-card__slider-label" :for="`satisfaction-${card.id}`">
          Satisfaction
        </label>
        <input
          :id="`satisfaction-${card.id}`"
          class="job-card__range"
          type="range"
          min="1"
          max="10"
          step="1"
          v-model.number="localSatisfaction"
          @input="onSliderInput"
          :aria-valuetext="`Satisfaction: ${localSatisfaction} out of 10`"
        />
        <span class="job-card__slider-value">{{ localSatisfaction }}</span>
      </div>

    </div>

    <!-- ── Evidence quotes (collapsible) ──────────────────────────────────── -->
    <JobCardEvidencePanel
      v-if="card.evidence.length"
      :evidence="card.evidence"
    />

  </article>
</template>

<style scoped>
/* ── Card shell ──────────────────────────────────────────────────────────────── */
.job-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--score-accent);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: grid;
  gap: var(--space-4);
  transition:
    box-shadow var(--duration-base) var(--ease-out),
    border-left-color var(--duration-base) var(--ease-out);

  &:hover {
    box-shadow: var(--shadow-md);
  }

  /* ── Heatmap modifier classes ───────────────────────────────────────────── */
  /*
   * Each class sets three local custom properties that flow into the score
   * ring, the evidence quote border, the slider thumb, and the left accent.
   */
  &.job-card--high {
    --score-accent: var(--c-forest-700);
    --score-bg:     var(--c-forest-100);
    --score-text:   var(--c-forest-800);
  }

  &.job-card--mid {
    --score-accent: var(--c-forest-500);
    --score-bg:     var(--c-forest-50);
    --score-text:   var(--c-forest-700);
  }

  &.job-card--low {
    --score-accent: var(--c-slate-400);
    --score-bg:     var(--c-slate-100);
    --score-text:   var(--c-slate-600);
  }
}

/* ── Header ──────────────────────────────────────────────────────────────────── */
.job-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

/* ── Score ring ──────────────────────────────────────────────────────────────── */
.job-card__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: var(--score-bg);
  flex-shrink: 0;
  transition: background var(--duration-base) var(--ease-out);
}

.job-card__score-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  line-height: 1;
  color: var(--score-text);
  font-variant-numeric: tabular-nums;
  transition: color var(--duration-base) var(--ease-out);
}

.job-card__score-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--score-text);
  opacity: 0.65;
  margin-top: 3px;
}

/* ── Badges ──────────────────────────────────────────────────────────────────── */
.job-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: flex-start;
}

.job-card__mock-pill {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  background: var(--c-forest-50);
  color: var(--c-forest-700);
  border: 1px solid var(--c-forest-200);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.job-card__select-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--c-forest-50);
  color: var(--c-forest-700);
  border: 1px solid var(--c-forest-200);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}

.job-card__select-label input {
  margin: 0;
  accent-color: var(--c-forest-600);
}

/* ── Description ─────────────────────────────────────────────────────────────── */
.job-card__description {
  font-size: var(--text-sm);
  color: var(--color-text);
  line-height: 1.55;
}

/* ── Sliders ─────────────────────────────────────────────────────────────────── */
.job-card__sliders {
  display: grid;
  gap: var(--space-3);
}

.job-card__slider-row {
  display: grid;
  grid-template-columns: 88px 1fr 28px;
  align-items: center;
  gap: var(--space-2);
}

.job-card__slider-label {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.job-card__range {
  width: 100%;
  height: 4px;
  cursor: pointer;
  accent-color: var(--score-accent);
  /* Remove the default tall click target padding on Webkit */
  -webkit-appearance: none;
  appearance: none;
  background: transparent;

  &::-webkit-slider-runnable-track {
    height: 4px;
    background: var(--score-bg);
    border-radius: var(--radius-full);
  }

  &::-moz-range-track {
    height: 4px;
    background: var(--score-bg);
    border-radius: var(--radius-full);
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--score-accent);
    margin-top: -6px;
    transition: transform var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-fast) var(--ease-out);
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: none;
    background: var(--score-accent);
  }

  &:focus-visible {
    outline: none;

    &::-webkit-slider-thumb {
      box-shadow: 0 0 0 3px var(--color-surface), 0 0 0 5px var(--score-accent);
    }
  }

  &:hover::-webkit-slider-thumb {
    transform: scale(1.2);
  }
}

.job-card__slider-value {
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--score-text);
  text-align: right;
  font-variant-numeric: tabular-nums;
  transition: color var(--duration-base) var(--ease-out);
}

/* Hover state */
.job-card--hovered {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
</style>
