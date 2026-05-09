<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useResearchStore } from '../../stores/useResearchStore'
import JobCard from './JobCard.vue'
import type { JobCard as JobCardType } from '../../domain/types'

const props = defineProps<{
  cards: JobCardType[]
  activeCardId?: string | null
}>()

const emit = defineEmits<{
  'card-hover': [cardId: string | null]
  'card-click': [cardId: string]
}>()

const store = useResearchStore()
const selectedCardIds = ref<string[]>([])

const selectedCount = computed(() => selectedCardIds.value.length)
const shouldShowActionBar = computed(() => selectedCount.value >= 2)

function isSelected(cardId: string): boolean {
  return selectedCardIds.value.includes(cardId)
}

function onCardCheckboxChange(cardId: string, checked: boolean): void {
  if (checked) {
    if (!selectedCardIds.value.includes(cardId)) {
      selectedCardIds.value.push(cardId)
    }
  }
}

function clearSelection(): void {
  selectedCardIds.value = []
}

function mergeSelected(): void {
  if (selectedCardIds.value.length < 2) return
  store.mergeCards([...selectedCardIds.value])
  clearSelection()
}

function handleCardHover(cardId: string | null): void {
  emit('card-hover', cardId)
}

function handleCardClick(cardId: string): void {
  emit('card-click', cardId)
}

watch(
  () => props.cards,
  cards => {
    const validIds = new Set(cards.map(card => card.id))
    selectedCardIds.value = selectedCardIds.value.filter(id => validIds.has(id))
  },
  { deep: true },
)
</script>

<template>
  <div class="cards-grid">
    <article
      v-for="card in cards"
      :key="card.id"
      class="cards-grid__item"
      :class="{ 'cards-grid__item--selected': isSelected(card.id) }"
    >
      <JobCard 
        :card="card" 
        :is-selected="isSelected(card.id)" 
        :is-hovered="props.activeCardId === card.id"
        @selection-change="onCardCheckboxChange" 
        @card-hover="handleCardHover"
        @card-click="handleCardClick"
      />
    </article>
  </div>

  <div v-if="shouldShowActionBar" class="action-bar" role="region" aria-label="Card actions">
    <p class="action-bar__meta">{{ selectedCount }} cards selected</p>
    <button class="action-bar__merge" type="button" @click="mergeSelected">
      Merge Selected
    </button>
    <button class="action-bar__clear" type="button" @click="clearSelection">
      Clear
    </button>
  </div>
</template>

<style scoped>
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

.cards-grid__item {
  position: relative;
}

.cards-grid__item--selected {
  border-radius: var(--radius-lg);
  box-shadow: 0 0 0 2px var(--c-forest-400);
}

.cards-grid__select {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 4px 8px;
  background: color-mix(in srgb, var(--color-surface) 92%, white 8%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  cursor: pointer;
}

.cards-grid__select input {
  margin: 0;
  accent-color: var(--c-forest-600);
}

.action-bar {
  position: fixed;
  left: 50%;
  bottom: var(--space-5);
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px 14px;
  background: color-mix(in srgb, var(--color-surface) 94%, black 6%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-lg);
}

.action-bar__meta {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-weight: 600;
}

.action-bar__merge {
  border: 1px solid var(--c-forest-700);
  background: var(--c-forest-700);
  color: white;
  font-size: var(--text-sm);
  font-weight: 700;
  border-radius: var(--radius-full);
  padding: 8px 14px;
  cursor: pointer;
}

.action-bar__clear {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-weight: 600;
  border-radius: var(--radius-full);
  padding: 8px 12px;
  cursor: pointer;
}

@media (max-width: 640px) {
  .action-bar {
    left: var(--space-3);
    right: var(--space-3);
    bottom: var(--space-3);
    transform: none;
    justify-content: space-between;
  }
}
</style>
