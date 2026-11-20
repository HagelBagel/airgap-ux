<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useResearchStore, MOCK_MODE } from '../stores/useResearchStore'
import { useProjectsStore } from '../stores/useProjectsStore'
import { MOCK_SEGMENTS } from '../services/ai/mockData'
import ResearchWorkbench from '../components/ResearchWorkbench.vue'
import ProcessingStatus from '../components/ProcessingStatus.vue'
import AppHeader from '../components/AppHeader.vue'

const props = defineProps<{ id: string }>()

const store = useResearchStore()
const projects = useProjectsStore()

// ── Open Project ─────────────────────────────────────────────────────────────
// There is no GET /api/projects/:id yet, so the name comes from the list.

const project = computed(() => projects.byId(props.id))

/** The id `store.openProject` last ran for; the dashboard waits for it. */
const openedId = ref<string | null>(null)
const isOpen = computed(() => openedId.value === props.id && project.value !== undefined)

async function openFromList(id: string, refresh = false): Promise<void> {
  await (refresh ? projects.load() : projects.ensureLoaded())
  const found = projects.byId(id)
  // Ignore a lookup that finished after the route moved on to another id.
  if (!found || id !== props.id) return
  // Opening a different Project discards the in-memory analysis.
  store.openProject(found)
  openedId.value = id
}

watch(() => props.id, (id) => openFromList(id), { immediate: true })

// ── Derived UI state ──────────────────────────────────────────────────────────

const isIdle     = computed(() => store.processingStage === 'idle')
const hasResults = computed(() =>
  (store.currentProject?.jobCards?.length ?? 0) > 0,
)

// ── Actions ───────────────────────────────────────────────────────────────────

// Transcript import is not built yet (see ADR 0002); in Mock Mode the sample
// transcript keeps the analysis UI usable in the meantime.
function analyzeSampleTranscript(): void {
  if (!project.value) return
  store.analyzeSegments(MOCK_SEGMENTS, project.value.name)
}

function reset(): void {
  store.resetProject()
}

</script>

<template>
  <div class="dashboard">

    <AppHeader>
      <button
        v-if="isOpen && store.currentProject"
        class="dashboard__reset-btn"
        type="button"
        @click="reset"
      >
        ↺ Start over
      </button>
    </AppHeader>

    <main class="dashboard__body">
      <div class="dashboard__page-heading">
        <RouterLink class="dashboard__back" to="/">← Projects</RouterLink>
        <!-- The page's one <h1>: the Project name, or a generic label until it is known. -->
        <h1 class="dashboard__title">{{ project?.name ?? 'Project' }}</h1>
      </div>

      <!-- ── Project lookup states ───────────────────────────────────────────── -->
      <template v-if="!isOpen">
        <div v-if="projects.status === 'error'" class="dashboard__error" role="alert">
          <p class="dashboard__error-text">Could not load the project: {{ projects.error }}</p>
          <button class="dashboard__error-retry" type="button" @click="openFromList(props.id, true)">Try again</button>
        </div>
        <div v-else-if="projects.status === 'ready' && !project" class="dashboard__lookup">
          <p>Project not found.</p>
          <RouterLink to="/">Back to projects</RouterLink>
        </div>
        <p v-else class="dashboard__lookup">Loading project…</p>
      </template>

      <!-- ── Main content ────────────────────────────────────────────────────── -->
      <template v-else>

        <!-- Processing status strip -->
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

      </template>
    </main>
  </div>
</template>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────────── */
.dashboard {
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr;
}

/* ── Page heading ────────────────────────────────────────────────────────────── */
.dashboard__page-heading {
  display: grid;
  gap: var(--space-2);
}

.dashboard__back {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  text-decoration: none;

  &:hover,
  &:focus-visible {
    color: var(--color-accent);
  }
}

.dashboard__lookup {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  padding: var(--space-8);
  text-align: center;
  color: var(--color-text-muted);
}

.dashboard__logo {
  width: 28px;
  height: 28px;
  color: var(--color-accent);
}

.dashboard__title {
  font-size: var(--text-2xl);
  font-weight: 700;
  overflow-wrap: anywhere;
  letter-spacing: -0.03em;
  color: var(--color-text);
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
