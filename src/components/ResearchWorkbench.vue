<template>
  <div class="research-workbench">
    <div class="transcript-column">
      <div class="transcript-container">
        <div v-for="(block, index) in transcriptBlocks" :key="index" class="transcript-block">
          <span class="speaker-id">{{ block.speakerId }}</span>
          <p @mouseup="handleSelection($event, block.speakerId)" v-html="highlightTranscriptText(block.text)"></p>
        </div>
      </div>
    </div>
    <div class="job-cards-column">
      <JobCardsTable 
        :cards="jobCards" 
        :active-card-id="activeCardId" 
        @card-hover="activeCardId = $event" 
        @card-click="scrollToEvidence"
      />
    </div>
    
    <!-- Floating menu for text selection -->
    <div 
      v-if="showFloatingMenu" 
      class="floating-menu"
      :style="{ 
        left: floatingMenuPosition.x + 'px', 
        top: floatingMenuPosition.y + 'px'
      }"
    >
      <button @click="createCard" class="create-card-btn">
        Create Card
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import JobCardsTable from './job-cards/JobCardsTable.vue'
import { useResearchStore } from '../stores/useResearchStore'

interface TranscriptBlock {
  speakerId: string
  text: string
}

interface Props {
  transcriptBlocks: TranscriptBlock[]
}

defineProps<Props>()

const store = useResearchStore()
const jobCards = computed(() => store.currentProject?.jobCards ?? [])

// Card hover sync state
const activeCardId = ref<string | null>(null)

// Text selection state
const showFloatingMenu = ref(false)
const floatingMenuPosition = ref({ x: 0, y: 0 })
const selectedText = ref('')
const selectedSpeakerId = ref('')

// Transcript highlighting function
function highlightTranscriptText(text: string): string {
  if (!activeCardId.value) return text
  
  const activeCard = jobCards.value.find(card => card.id === activeCardId.value)
  if (!activeCard) return text
  
  // Get all evidence text from the active card
  const evidenceTexts = activeCard.evidence.map(e => e.text).filter(Boolean)
  
  let highlightedText = text
  
  // Highlight each evidence string in the transcript
  evidenceTexts.forEach(evidenceText => {
    if (evidenceText && text.includes(evidenceText)) {
      const regex = new RegExp(`(${evidenceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="highlight-active">$1</mark>')
    }
  })
  
  return highlightedText
}

// Scroll-to-Source functionality
function scrollToEvidence(cardId: string): void {
  const card = jobCards.value.find(c => c.id === cardId)
  if (!card) return
  
  // Get all evidence text from the card
  const evidenceTexts = card.evidence.map(e => e.text).filter(Boolean)
  if (evidenceTexts.length === 0) return
  
  // Find the first transcript block that contains any evidence text
  const transcriptBlocks = document.querySelectorAll('.transcript-block')
  
  for (let i = 0; i < transcriptBlocks.length; i++) {
    const block = transcriptBlocks[i] as HTMLElement
    const blockText = block.textContent || ''
    
    // Check if this block contains any of the evidence texts
    const hasEvidence = evidenceTexts.some(evidenceText => 
      blockText.includes(evidenceText)
    )
    
    if (hasEvidence) {
      // Scroll to the transcript block smoothly
      block.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      })
      
      // Briefly highlight the found block
      block.classList.add('transcript-block--highlighted')
      setTimeout(() => {
        block.classList.remove('transcript-block--highlighted')
      }, 2000)
      
      break
    }
  }
}

function handleSelection(event: MouseEvent, speakerId: string): void {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) {
    showFloatingMenu.value = false
    return
  }
  
  const text = selection.toString().trim()
  if (text) {
    selectedText.value = text
    selectedSpeakerId.value = speakerId
    
    // Position floating menu near mouse
    floatingMenuPosition.value = {
      x: event.clientX + 10,
      y: event.clientY - 40
    }
    showFloatingMenu.value = true
  }
}

function createCard(): void {
  store.createManualCard(selectedText.value, selectedSpeakerId.value)
  
  // Reset selection
  showFloatingMenu.value = false
  selectedText.value = ''
  selectedSpeakerId.value = ''
  window.getSelection()?.removeAllRanges()
}
</script>

<style scoped>
.research-workbench {
  display: grid;
  grid-template-columns: 40% 60%;
  height: 100vh;
}

.transcript-column {
  overflow-y: auto;
  padding: 1rem;
  border-right: 1px solid #e5e7eb;
}

.job-cards-column {
  overflow-y: auto;
  padding: 1rem;
}

.transcript-container {
  max-height: calc(100vh - 2rem);
}

.transcript-block {
  margin-bottom: 1rem;
}

.speaker-id {
  display: inline-block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.transcript-block p {
  margin: 0;
  line-height: 1.5;
  cursor: text;
  user-select: text;
}

.transcript-block p:hover {
  background-color: rgba(59, 130, 246, 0.05);
}

.floating-menu {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 4px;
}

.create-card-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.create-card-btn:hover {
  background: #2563eb;
}

.create-card-btn:active {
  background: #1d4ed8;
}

/* Transcript highlighting */
.highlight-active {
  background-color: rgba(250, 204, 21, 0.3);
  color: #854d0e;
  padding: 1px 2px;
  border-radius: 2px;
  transition: background-color 0.2s ease-in-out;
}

/* Scroll-to-Source highlighting */
.transcript-block--highlighted {
  background-color: rgba(59, 130, 246, 0.1);
  border-left: 3px solid #3b82f6;
  transition: all 0.3s ease-in-out;
}
</style>