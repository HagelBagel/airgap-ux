/**
 * Typed message contracts for ai.worker.ts.
 * Import these types in both the worker and the main thread to keep the
 * communication channel fully type-safe.
 */

import type { JobCard, SpeakerSegment } from '../domain/types';

// ─── Inbound: main thread → worker ────────────────────────────────────────────

export interface LoadModelsMsg {
  type: 'LOAD_MODELS';
  payload: {
    /** When true the worker returns mock data immediately without loading models. */
    mockMode: boolean;
  };
}

export interface TranscribeMsg {
  type: 'TRANSCRIBE';
  payload: {
    /** Raw PCM audio samples (mono). */
    audioData: Float32Array;
    /** Original sample rate of audioData (worker resamples to 16 kHz as needed). */
    sampleRate: number;
    mockMode: boolean;
  };
}

export interface RunStrategynAnalysisMsg {
  type: 'RUN_STRATEGYN_ANALYSIS';
  payload: {
    /** Transcript segments produced by TRANSCRIBE (or loaded from storage). */
    segments: SpeakerSegment[];
    mockMode: boolean;
  };
}

export type WorkerInMessage =
  | LoadModelsMsg
  | TranscribeMsg
  | RunStrategynAnalysisMsg;

// ─── Outbound: worker → main thread ───────────────────────────────────────────

export interface ProgressMsg {
  type: 'PROGRESS';
  payload: {
    /** Pipeline stage label (matches ProcessingStage). */
    stage: string;
    /** 0–1 completion fraction. */
    progress: number;
    detail?: string;
  };
}

export interface ModelsReadyMsg {
  type: 'MODELS_READY';
  payload: {
    mockMode: boolean;
  };
}

export interface TranscriptionCompleteMsg {
  type: 'TRANSCRIPTION_COMPLETE';
  payload: {
    segments: SpeakerSegment[];
  };
}

export interface AnalysisCompleteMsg {
  type: 'ANALYSIS_COMPLETE';
  payload: {
    jobCards: JobCard[];
    /** True when deterministic fallback extraction was used instead of LLM JSON output. */
    usedFallback: boolean;
  };
}

export interface WorkerErrorMsg {
  type: 'ERROR';
  payload: {
    /** The WorkerInMessage.type that triggered this error. */
    stage: string;
    message: string;
  };
}

export type WorkerOutMessage =
  | ProgressMsg
  | ModelsReadyMsg
  | TranscriptionCompleteMsg
  | AnalysisCompleteMsg
  | WorkerErrorMsg;
