
<template>
  <div class="research-workbench">
    <div class="transcript-column">
      <div class="transcript-container">
        <ul v-for="(block, index) in transcriptBlocks" :key="index" class="transcript-block">
          <li>
            <span class="speaker-id">{{ block.speakerId }}</span>
            <p>{{ block.text }}</p>
          </li>
        </ul>
      </div>
    </div>
    <div class="job-cards-column">
      <header class="dashboard__results-header">
          <div class="dashboard__results-header-left">
            <h2 class="dashboard__results-title">Desired Outcomes</h2>
            <span class="dashboard__results-count">
              {{ sortedCards.length }} outcome{{ sortedCards.length !== 1 ? 's' : '' }}
            </span>
          </div>
          <div class="dashboard__results-actions">
            <button
              class="dashboard__export-btn"
              type="button"
              @click="handleExportJson"
              title="Export as JSON"
            >
              ↓ JSON
            </button>
            <button
              class="dashboard__export-btn"
              type="button"
              @click="handleExportCsv"
              title="Export as CSV"
            >
              ↓ CSV
            </button>
          </div>
        </header>
        <JobCardsTable :cards="sortedCards" />
    </div>
  </div>
</template>

<script>
import JobCardsTable from './JobCardsTable.vue';

export default {
  components: {
    JobCardsTable
  },
  data() {
    return {
      transcriptBlocks: [
        { speakerId: 'S1', text: 'Hello, how are you?' },
        { speakerId: 'S2', text: 'I am fine. Thank you.' },
        // Add more blocks as needed
      ]
    };
  }
};
</script>

<style scoped>
.research-workbench {
  display: grid;
  grid-template-columns: 40% 60%;
  height: 100vh; /* Adjust to your needs */
}

.transcript-column, .job-cards-column {
  overflow-y: auto;
  padding: 1rem;
}

.transcript-container {
  max-height: calc(100vh - 2rem); /* Adjust for padding */
}

.transcript-block {
  list-style-type: none;
  margin-bottom: 0.5rem;
}

.speaker-id {
  font-weight: bold;
}

/* ── Results header ──────────────────────────────────────────────────────────── */
.dashboard__results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.dashboard__results-header-left {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.dashboard__results-title {
  font-size: var(--text-xl);
  font-weight: 700;
}

.dashboard__results-count {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.dashboard__results-actions {
  display: flex;
  gap: var(--space-2);
}

.dashboard__export-btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface);
  transition:
    border-color var(--duration-fast),
    color        var(--duration-fast),
    background   var(--duration-fast);
}

.dashboard__export-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-background);
}
</style>