/**
 * useResearchStore.ts
 *
 * The single Pinia store that bridges the UI and the AI worker.
 * All worker communication, pipeline sequencing, and reactive state live here.
 *
 * Toggle MOCK_MODE in src/featureFlags.ts.
 */

import { defineStore } from 'pinia';
import { ref, readonly } from 'vue';

import type { JobCard, ProcessingStage, ResearchProject, SpeakerSegment } from '../domain/types';
import type { WorkerInMessage, WorkerOutMessage } from '../workers/messages';
import { computeOpportunityScore } from '../domain/strategyn/opportunityScore';
import { averageOutcome, hasTension } from '../domain/strategyn/variance';
import { MOCK_MODE } from '../featureFlags';

// Re-export so existing consumers (e.g. ResearchDashboard) can keep importing
// MOCK_MODE from this module without breaking changes.
export { MOCK_MODE };

// ─── Store ──────────────────────────────────────────────────────────────────────
export const useResearchStore = defineStore('research', () => {

  // ── Public reactive state ────────────────────────────────────────────────────

  /** Current stage of the AI pipeline. Drives UI status indicators. */
  const processingStage = ref<ProcessingStage>('idle');

  /** 0–1 fraction for progress bars and the Power Meter widget. */
  const loadProgress = ref(0);

  /** The active research project: segments, job cards, metadata. */
  const currentProject = ref<ResearchProject | null>(null);

  /** Last pipeline error message, or null when healthy. */
  const error = ref<string | null>(null);

  /** Human-readable progress detail from the worker (e.g. batch counters). */
  const processingDetail = ref('');

  /** True when analysis used deterministic fallback extraction. */
  const usedFallback = ref(false);

  /** Epoch ms when current processing run started. */
  const processingStartedAt = ref<number | null>(null);

  // ── Internal worker state ────────────────────────────────────────────────────

  let worker: Worker | null = null;
  let modelsReady = false;

  /**
   * Segments queued while models are still loading.
   * Sent as a RUN_STRATEGYN_ANALYSIS message the moment MODELS_READY arrives.
   */
  let pendingSegments: SpeakerSegment[] | null = null;

  // ── Worker lifecycle ─────────────────────────────────────────────────────────

  /** Create the worker exactly once. Safe to call multiple times. */
  function initWorker(): void {
    if (worker) return;
    worker = new Worker(
      new URL('../workers/ai.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.onmessage = handleWorkerMessage;
    worker.onerror   = (e: ErrorEvent) => {
      error.value           = e.message;
      processingStage.value = 'error';
    };
  }

  function postToWorker(msg: WorkerInMessage): void {
    worker?.postMessage(msg);
  }

  // ── Worker → store message handler ───────────────────────────────────────────

  function handleWorkerMessage(event: MessageEvent<WorkerOutMessage>): void {
    const msg = event.data;

    switch (msg.type) {

      // ── Pipeline progress update ───────────────────────────────────────────
      case 'PROGRESS':
        processingStage.value = msg.payload.stage as ProcessingStage;
        loadProgress.value    = msg.payload.progress;
        processingDetail.value = msg.payload.detail ?? '';
        break;

      // ── Models loaded (or mock-mode fast-path) ─────────────────────────────
      case 'MODELS_READY':
        modelsReady = true;
        // Flush any segments that were queued before models finished loading.
        if (pendingSegments) {
          const segments = pendingSegments;
          pendingSegments = null;
          postToWorker({
            type:    'RUN_STRATEGYN_ANALYSIS',
            payload: { segments, mockMode: MOCK_MODE },
          });
        }
        break;

      // ── JTBD extraction complete → apply variance, persist to store ────────
      case 'ANALYSIS_COMPLETE': {
        const jobCards = applyVariance(msg.payload.jobCards);
        ensureProject();
        currentProject.value!.jobCards = jobCards;
        usedFallback.value            = msg.payload.usedFallback;
        processingStage.value          = 'done';
        loadProgress.value             = 1;
        processingDetail.value         = '';
        break;
      }

      // ── Worker-side error ─────────────────────────────────────────────────
      case 'ERROR':
        error.value           = `[${msg.payload.stage}] ${msg.payload.message}`;
        processingStage.value = 'error';
        processingDetail.value = '';
        break;
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  /**
   * Primary entry point: run JTBD analysis on transcript segments.
   *
   * Models are loaded on first use; segments that arrive before MODELS_READY
   * are queued and sent as soon as the worker reports ready.
   */
  function analyzeSegments(segments: SpeakerSegment[], projectName: string): void {
    error.value           = null;
    usedFallback.value    = false;
    processingStartedAt.value = Date.now();
    processingStage.value = 'loading-models';
    loadProgress.value    = 0;
    processingDetail.value = '';
    ensureProject(projectName);
    currentProject.value!.segments = segments;

    initWorker();

    if (modelsReady) {
      // Models already warmed up (e.g. second transcript in a session).
      postToWorker({ type: 'RUN_STRATEGYN_ANALYSIS', payload: { segments, mockMode: MOCK_MODE } });
    } else {
      // Queue the segments; they are flushed when MODELS_READY fires.
      pendingSegments = segments;
      postToWorker({ type: 'LOAD_MODELS', payload: { mockMode: MOCK_MODE } });
    }
  }

  /**
   * Tear down the worker and reset all state.
   * Call before processing a new set of files.
   */
  function resetProject(): void {
    worker?.terminate();
    worker              = null;
    modelsReady         = false;
    pendingSegments     = null;
    currentProject.value  = null;
    processingStage.value = 'idle';
    loadProgress.value    = 0;
    error.value           = null;
    usedFallback.value    = false;
    processingDetail.value = '';
    processingStartedAt.value = null;
  }

  /**
   * Manually adjust a job card's Importance or Satisfaction score.
   * Recomputes the Opportunity Score and re-evaluates tension in place.
   * This backs the slider controls in the Evidence Drawer (V1 refinement step).
   */
  function updateCardScore(
    cardId: string,
    patch: { importance?: number; satisfaction?: number },
  ): void {
    if (!currentProject.value) return;
    const card = currentProject.value.jobCards.find(c => c.id === cardId);
    if (!card) return;

    const I = patch.importance   ?? card.averageImportance;
    const S = patch.satisfaction ?? card.averageSatisfaction;

    card.averageImportance   = I;
    card.averageSatisfaction = S;
    card.opportunityScore    = computeOpportunityScore(I, S);
  }

  /**
   * Create a manual job card from selected text.
   *
   * @param text - Selected transcript text
   * @param speakerId - ID of the speaker who said the text
   */
  function createManualCard(text: string, speakerId: string): void {
    ensureProject();
    
    const newCard: JobCard = {
      id: crypto.randomUUID(),
      description: 'Manual Entry',
      averageImportance: 5,
      averageSatisfaction: 5,
      opportunityScore: computeOpportunityScore(5, 5),
      hasTension: false,
      evidence: [{
        speakerId,
        text,
        startTime: 0, // Manual entries don't have timestamps
        endTime: 0,
      }],
      speakerOutcomes: [{
        speakerId,
        description: 'Manual Entry',
        importance: 5,
        satisfaction: 5,
        opportunityScore: computeOpportunityScore(5, 5),
        evidence: [{
          speakerId,
          text,
          startTime: 0,
          endTime: 0,
        }],
      }],
      hasBeenManuallyEdited: true,
    };
    
    currentProject.value!.jobCards.push(newCard);
  }

  /**
   * Prepare simplified export data with schema: Outcome, Speaker, Importance, Satisfaction, Quote
   * 
   * Returns a flat array where each row represents a speaker's view of a job card.
   * Manual entries are included with their description as the Outcome.
   */
  function prepareExportData(): Array<{
    Outcome: string
    Speaker: string
    Importance: number
    Satisfaction: number
    Quote: string
  }> {
    if (!currentProject.value) return [];

    const exportData: Array<{
      Outcome: string
      Speaker: string
      Importance: number
      Satisfaction: number
      Quote: string
    }> = [];

    for (const card of currentProject.value.jobCards) {
      for (const outcome of card.speakerOutcomes) {
        // Concatenate all evidence text for this speaker outcome
        const quoteText = outcome.evidence
          .map(e => e.text)
          .filter(Boolean)
          .join(' '); // Join with space between quotes

        exportData.push({
          Outcome: outcome.description,
          Speaker: outcome.speakerId,
          Importance: outcome.importance,
          Satisfaction: outcome.satisfaction,
          Quote: quoteText
        });
      }
    }

    return exportData;
  }

  /**
   * Merge multiple job cards into a single primary card.
   *
   * Behavior:
   * - Takes the first cardId as the primary card
   * - Appends all evidence from secondary cards to the primary's evidence list
   * - Recalculates average importance and satisfaction across all merged cards
   * - Removes secondary cards from the jobCards array
   * - Sets hasBeenManuallyEdited flag on the primary card to true
   *
   * @param cardIds - Array of card IDs to merge (first is primary)
   */
  function mergeCards(cardIds: string[]): void {
    if (!currentProject.value || cardIds.length < 2) return;

    const primaryId = cardIds[0]!;
    const secondaryIds = new Set(cardIds.slice(1));

    const primaryCard = currentProject.value.jobCards.find(c => c.id === primaryId);
    if (!primaryCard) return;

    // Collect all secondary cards and their evidence
    const cardsToMerge = currentProject.value.jobCards.filter(c =>
      secondaryIds.has(c.id),
    );

    // Gather all evidence from both primary and secondary cards
    const allEvidence = [...primaryCard.evidence];
    const allSpeakerOutcomes = [...primaryCard.speakerOutcomes];

    for (const card of cardsToMerge) {
      allEvidence.push(...card.evidence);
      allSpeakerOutcomes.push(...card.speakerOutcomes);
    }

    // Recalculate averages across all merged cards
    const importances = cardsToMerge.map(c => c.averageImportance);
    const satisfactions = cardsToMerge.map(c => c.averageSatisfaction);

    importances.unshift(primaryCard.averageImportance);
    satisfactions.unshift(primaryCard.averageSatisfaction);

    const avgImportance =
      importances.reduce((a, b) => a + b, 0) / importances.length;
    const avgSatisfaction =
      satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length;

    // Update primary card with merged data
    primaryCard.evidence = allEvidence;
    primaryCard.speakerOutcomes = allSpeakerOutcomes;
    primaryCard.averageImportance = avgImportance;
    primaryCard.averageSatisfaction = avgSatisfaction;
    primaryCard.opportunityScore = computeOpportunityScore(avgImportance, avgSatisfaction);
    primaryCard.hasBeenManuallyEdited = true;

    // Remove secondary cards from the array
    currentProject.value.jobCards = currentProject.value.jobCards.filter(
      c => c.id !== primaryId && !secondaryIds.has(c.id),
    );
    currentProject.value.jobCards.unshift(primaryCard);
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  function ensureProject(name?: string): void {
    if (!currentProject.value) {
      currentProject.value = {
        id:        crypto.randomUUID(),
        name:      name ?? 'Untitled Project',
        createdAt: Date.now(),
        segments:  [],
        jobCards:  [],
      };
    }
  }

  /**
   * For each job card that has multiple speaker outcomes, recompute the
   * consolidated averages and set hasTension based on the variance rule.
   * Single-speaker cards pass through unchanged.
   */
  function applyVariance(jobCards: JobCard[]): JobCard[] {
    return jobCards.map(card => {
      if (card.speakerOutcomes.length < 2) return card;

      const avgI = averageOutcome(card.speakerOutcomes, 'importance');
      const avgS = averageOutcome(card.speakerOutcomes, 'satisfaction');

      return {
        ...card,
        averageImportance:   avgI,
        averageSatisfaction: avgS,
        opportunityScore:    computeOpportunityScore(avgI, avgS),
        hasTension:          hasTension(card.speakerOutcomes),
      };
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  return {
    // State (readonly refs — mutations go through actions)
    processingStage: readonly(processingStage),
    loadProgress:    readonly(loadProgress),
    currentProject,     // writable so components can bind sliders
    error:           readonly(error),
    processingDetail: readonly(processingDetail),
    usedFallback:    readonly(usedFallback),
    processingStartedAt: readonly(processingStartedAt),

    // Actions
    analyzeSegments,
    resetProject,
    updateCardScore,
    mergeCards,
    createManualCard,
    prepareExportData,

    // Expose the toggle value so components can show "Mock Mode" badges
    MOCK_MODE,
  };
});
