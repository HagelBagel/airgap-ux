/**
 * Core domain types for Sovereign JTBD.
 * All AI inference and scoring results are represented with these interfaces.
 */

/** A timestamped speech segment attributed to a single speaker. */
export interface SpeakerSegment {
  speakerId: string;
  text: string;
  startTime: number; // seconds
  endTime: number;   // seconds
}

/** A verbatim (or near-verbatim) quote used to justify an Importance or Satisfaction score. */
export interface Evidence {
  speakerId: string;
  text: string;
  startTime: number; // seconds
  endTime: number;   // seconds
}

/**
 * One speaker's scored view of a single Desired Outcome.
 * opportunityScore = importance + max(importance − satisfaction, 0)
 */
export interface SpeakerOutcome {
  speakerId: string;
  description: string;
  importance: number;    // 1–10
  satisfaction: number;  // 1–10
  opportunityScore: number;
  evidence: Evidence[];
}

/**
 * A consolidated Job Card aggregating all speakers' views on one Desired Outcome.
 * hasTension = true when satisfaction differs by more than 3 points across speakers.
 */
export interface JobCard {
  id: string;
  description: string;
  averageImportance: number;
  averageSatisfaction: number;
  opportunityScore: number; // derived from average I and S
  hasTension: boolean;
  evidence: Evidence[];
  speakerOutcomes: SpeakerOutcome[];
  hasBeenManuallyEdited?: boolean; // Set to true when manually merged or edited via UI
}

/** Full state of a research project persisted in IndexedDB. */
export interface ResearchProject {
  id: string;
  name: string;
  createdAt: number;       // epoch ms
  segments: SpeakerSegment[];
  jobCards: JobCard[];
}

/** Lifecycle stages of the AI processing pipeline. */
export type ProcessingStage =
  | 'idle'
  | 'loading-models'
  | 'transcribing'
  | 'extracting'
  | 'scoring'
  | 'done'
  | 'error';
