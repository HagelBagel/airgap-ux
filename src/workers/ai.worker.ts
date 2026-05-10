/**
 * ai.worker.ts
 *
 * Web Worker that runs all AI inference off the main thread so the UI never
 * freezes during model loading, transcription, or JTBD extraction.
 *
 * Supports "Mock Mode" — pass mockMode: true in any message payload to get
 * realistic pre-canned data instantly, with no GPU or model download needed.
 * This lets UI development and integration testing proceed independently.
 *
 * Message protocol: see workers/messages.ts
 * Scoring formula:  see domain/strategyn/opportunityScore.ts
 */

import {
  pipeline,
  env,
  type AutomaticSpeechRecognitionPipeline,
  type TextGenerationPipeline,
} from '@huggingface/transformers';

import type { WorkerInMessage, WorkerOutMessage } from './messages';
import type { Evidence, JobCard, SpeakerOutcome, SpeakerSegment } from '../domain/types';
import { computeOpportunityScore } from '../domain/strategyn/opportunityScore';
import { batchSegmentsBySpeaker, type SpeakerBatch } from '../services/ai/jtbdExtractionPipeline';

// ─── Transformers.js v3 environment ───────────────────────────────────────────
// Models are fetched from the Hugging Face Hub and cached in the browser's
// Cache API so the app works offline after the first load.
env.allowLocalModels = false;
env.useBrowserCache  = true;

// ─── Model registry ───────────────────────────────────────────────────────────
// Quantized ONNX models from the onnx-community namespace.
// Whisper-base: ~150 MB in q4 decoder variant — good balance of speed/accuracy.
// Qwen 2.5 0.5B: smallest chat model that reliably outputs structured JSON.
const WHISPER_MODEL_ID = 'onnx-community/whisper-base';
const LLM_MODEL_ID     = 'onnx-community/Qwen2.5-0.5B-Instruct';
const LLM_MAX_NEW_TOKENS = 320;
const LLM_BATCH_TIMEOUT_MS = 120_000; // Increased to 2 minutes for better processing

// ─── Singleton pipeline cache ──────────────────────────────────────────────────
let asr: AutomaticSpeechRecognitionPipeline | null = null;
let llm: TextGenerationPipeline | null = null;

// ─── Typed postMessage helpers ─────────────────────────────────────────────────
function post(msg: WorkerOutMessage): void {
  self.postMessage(msg);
}

// Throttle: only forward a PROGRESS message when the reported fraction has
// moved by at least this amount since the last post. Prevents rapid-fire
// per-chunk callbacks from Transformers.js causing visible bar jitter.
// 3% threshold eliminates jitter during rapid initial model downloads while
// still allowing smooth progress perception.
const PROGRESS_THRESHOLD = 0.03; // 3 percentage points
let _lastPostedProgress = -1;
let _lastPostedStage = '';
let _lastPostedDetail = '';

function postProgress(stage: string, progress: number, detail?: string): void {
  const normalizedDetail = detail ?? '';
  const progressChanged =
    Math.abs(progress - _lastPostedProgress) >= PROGRESS_THRESHOLD || progress === 1;
  const detailChanged = stage !== _lastPostedStage || normalizedDetail !== _lastPostedDetail;

  if (!progressChanged && !detailChanged) return;

  _lastPostedProgress = progress;
  _lastPostedStage = stage;
  _lastPostedDetail = normalizedDetail;
  post({ type: 'PROGRESS', payload: { stage, progress, detail } });
}

// ─── Message dispatch ──────────────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<WorkerInMessage>): Promise<void> => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case 'LOAD_MODELS':
        await handleLoadModels(msg.payload.mockMode);
        break;
      case 'TRANSCRIBE':
        await handleTranscribe(msg.payload);
        break;
      case 'RUN_STRATEGYN_ANALYSIS':
        await handleRunStrategynAnalysis(msg.payload);
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ type: 'ERROR', payload: { stage: msg.type, message } });
  }
};

// ─── Handler: LOAD_MODELS ──────────────────────────────────────────────────────
async function handleLoadModels(mockMode: boolean): Promise<void> {
  if (mockMode) {
    postProgress('loading-models', 1.0, 'Mock mode — skipping model download');
    post({ type: 'MODELS_READY', payload: { mockMode: true } });
    return;
  }

  // --- Whisper (ASR) ---
  postProgress('loading-models', 0.0, 'Downloading Whisper…');
  asr = await pipeline('automatic-speech-recognition', WHISPER_MODEL_ID, {
    device: 'webgpu',
    // Encoder in fp32 for accuracy; merged decoder in q4 for speed.
    dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' },
    progress_callback: (p: ProgressCallbackPayload) => {
      if (p.status === 'progress') {
        postProgress('loading-models', (p.progress ?? 0) / 200, `Whisper: ${p.file ?? ''}`);
      }
    },
  });

  // --- LLM (text generation) ---
  postProgress('loading-models', 0.5, 'Downloading LLM…');
  llm = await pipeline('text-generation', LLM_MODEL_ID, {
    device: 'webgpu',
    dtype: 'q4f16',
    progress_callback: (p: ProgressCallbackPayload) => {
      if (p.status === 'progress') {
        postProgress('loading-models', 0.5 + (p.progress ?? 0) / 200, `LLM: ${p.file ?? ''}`);
      }
    },
  });

  postProgress('loading-models', 1.0, 'Models ready');
  post({ type: 'MODELS_READY', payload: { mockMode: false } });
}

// ─── Handler: TRANSCRIBE ───────────────────────────────────────────────────────
async function handleTranscribe(payload: {
  audioData: Float32Array;
  sampleRate: number;
  mockMode: boolean;
}): Promise<void> {
  if (payload.mockMode) {
    postProgress('transcribing', 1.0, 'Mock transcription complete');
    post({ type: 'TRANSCRIPTION_COMPLETE', payload: { segments: MOCK_SEGMENTS } });
    return;
  }

  if (!asr) throw new Error('ASR model not loaded — send LOAD_MODELS first.');

  postProgress('transcribing', 0.0, 'Transcribing audio…');

  // Whisper requires 16 kHz mono PCM.
  const audio =
    payload.sampleRate === 16_000
      ? payload.audioData
      : resampleTo16k(payload.audioData, payload.sampleRate);

  const result = (await asr(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
    language: 'english',
  })) as AsrResult;

  // Speaker diarization is a future milestone; for now every chunk is
  // tagged with an alternating placeholder speaker ID.
  const segments: SpeakerSegment[] = (result.chunks ?? []).map((chunk, i) => ({
    speakerId: `Speaker_${String((i % 2) + 1).padStart(2, '0')}`,
    text: chunk.text.trim(),
    startTime: chunk.timestamp?.[0] ?? 0,
    endTime: chunk.timestamp?.[1] ?? 0,
  }));

  postProgress('transcribing', 1.0, `Transcribed ${segments.length} segments`);
  post({ type: 'TRANSCRIPTION_COMPLETE', payload: { segments } });
}

// ─── Handler: RUN_STRATEGYN_ANALYSIS ──────────────────────────────────────────
async function handleRunStrategynAnalysis(payload: {
  segments: SpeakerSegment[];
  mockMode: boolean;
}): Promise<void> {
  if (payload.mockMode) {
    postProgress('extracting', 0.5, 'Mock extraction…');
    postProgress('scoring',    1.0, 'Mock scoring complete');
    post({
      type: 'ANALYSIS_COMPLETE',
      payload: { jobCards: MOCK_JOB_CARDS, usedFallback: false },
    });
    return;
  }

  const { jobCards, usedFallback } = await runStrategynAnalysis(payload.segments);
  post({ type: 'ANALYSIS_COMPLETE', payload: { jobCards, usedFallback } });
}

// ─── Core: Strategyn Analysis ──────────────────────────────────────────────────
/**
 * runStrategynAnalysis
 *
 * 1. Groups transcript segments by speaker into consecutive "speaker turns" (SpeakerBatch).
 * 2. Formats each turn as a metadata-prefixed context block for the LLM.
 * 3. Sends each block to the LLM and accumulates outcomes from all blocks.
 * 4. Merges outcomes with identical descriptions from different speakers (synthesis).
 * 5. Applies the Strategyn formula: opportunityScore = I + max(I − S, 0)
 * 6. Matches each LLM-provided evidence quote back to a timestamped segment.
 * 7. Returns an array of JobCards ready for the Pinia store.
 */
async function runStrategynAnalysis(
  segments: SpeakerSegment[],
): Promise<{ jobCards: JobCard[]; usedFallback: boolean }> {
  if (!llm) throw new Error('LLM not loaded — send LOAD_MODELS first.');

  // Build one logical task per consecutive speaker turn.
  const batches = batchSegmentsBySpeaker(segments);
  postProgress('extracting', 0.1, `Processing ${batches.length} speaker batch(es)…`);

  const allOutcomes: LlmOutcome[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    const batchNumber = i + 1;

    const batchText = batch.text;

    postProgress(
      'extracting',
      0.1 + (i / batches.length) * 0.6,
      `Extracting outcomes from batch ${batchNumber}/${batches.length}…`,
    );

    const chatMessages = [
      { role: 'system' as const, content: JTBD_SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: `Analyze the following speaker turn block:\n\n${batchText}`,
      },
    ];

    try {
      let output: LlmOutput[];
      try {
        output = (await withTimeout(
          (llm as TextGenerationPipeline)(chatMessages as never, {
            max_new_tokens: LLM_MAX_NEW_TOKENS,
            temperature: 0.1,
            do_sample: false,
          }),
          LLM_BATCH_TIMEOUT_MS,
          `Extraction timed out for batch ${batchNumber}/${batches.length}`,
        )) as LlmOutput[];
      } catch {
        console.warn(`Batch ${batchNumber} timed out, using fallback for this batch`);
        output = [];
      }

      const rawText: string =
        (output[0]?.generated_text as ChatMessage[] | undefined)?.at(-1)?.content ?? '';
      const parsed = extractJson<LlmResponse>(rawText);

      const rawOutcomes = parsed?.outcomes ?? [];
      const normalizedOutcome = normalizeBatchOutcome(rawOutcomes, batch);
      if (normalizedOutcome) {
        if (rawOutcomes.length > 1) {
          postProgress(
            'extracting',
            0.1 + (i / batches.length) * 0.6,
            `Batch ${batchNumber}/${batches.length}: collapsed ${rawOutcomes.length} outcomes into 1 primary card`,
          );
        }
        allOutcomes.push(normalizedOutcome);
      }
    } catch (err) {
      // Log but don't fail — continue processing other batches
      console.warn(
        `Failed to extract outcomes from batch ${batchNumber}/${batches.length}:`,
        err,
      );
    }
  }

  postProgress('extracting', 0.8, 'Synthesizing outcomes across speakers…');

  if (allOutcomes.length === 0) {
    // No outcomes extracted from any batch — use fallback
    postProgress('extracting', 0.85, 'No structured outcomes from LLM; deriving fallback outcomes…');
    const fallbackJobCards = buildFallbackJobCards(segments);
    postProgress('scoring', 1.0, `Derived ${fallbackJobCards.length} fallback outcome(s)`);
    return { jobCards: fallbackJobCards, usedFallback: true };
  }

  postProgress('scoring', 0.9, 'Calculating Opportunity Scores…');

  // Convert outcomes to JobCards, using outcome index as the ID
  const jobCards: JobCard[] = allOutcomes.map((outcome: LlmOutcome & { speakerId?: string }, idx) => {
    const importance = clamp(outcome.importance, 1, 10);
    const satisfaction = clamp(outcome.satisfaction, 1, 10);
    const opportunityScore = computeOpportunityScore(importance, satisfaction);

    const evidence: Evidence[] = outcome.evidenceQuotes.map(quote =>
      matchQuoteToSegment(quote, segments),
    );

    const speakerId = outcome.speakerId ?? 'aggregate';

    const speakerOutcome: SpeakerOutcome = {
      speakerId,
      description: outcome.description,
      importance,
      satisfaction,
      opportunityScore,
      evidence,
    };

    return {
      id: `jc-${idx + 1}`,
      description: outcome.description,
      averageImportance: importance,
      averageSatisfaction: satisfaction,
      opportunityScore,
      hasTension: false, // multi-speaker variance is applied in the Pinia store
      evidence,
      speakerOutcomes: [speakerOutcome],
    };
  });

  postProgress('scoring', 1.0, `Scored ${jobCards.length} Desired Outcomes`);
  return { jobCards, usedFallback: false };
}

function buildFallbackJobCards(segments: SpeakerSegment[]): JobCard[] {
  const meaningful = segments
    .map(s => ({ ...s, cleanText: s.text.trim() }))
    .filter(s => s.cleanText.length >= 24)
    .slice(0, 5);

  if (meaningful.length === 0) {
    const description = 'Understand user needs from interview transcript';
    const importance = 6;
    const satisfaction = 4;
    const opportunityScore = computeOpportunityScore(importance, satisfaction);

    return [
      {
        id: 'jc-fallback-1',
        description,
        averageImportance: importance,
        averageSatisfaction: satisfaction,
        opportunityScore,
        hasTension: false,
        evidence: [],
        speakerOutcomes: [
          {
            speakerId: 'aggregate',
            description,
            importance,
            satisfaction,
            opportunityScore,
            evidence: [],
          },
        ],
      },
    ];
  }

  return meaningful.map((segment, idx) => {
    const description = `Address need from transcript segment ${idx + 1}`;
    const importance = 6;
    const satisfaction = 4;
    const opportunityScore = computeOpportunityScore(importance, satisfaction);
    const evidence: Evidence[] = [
      {
        speakerId: segment.speakerId,
        text: segment.cleanText,
        startTime: segment.startTime,
        endTime: segment.endTime,
      },
    ];

    return {
      id: `jc-fallback-${idx + 1}`,
      description,
      averageImportance: importance,
      averageSatisfaction: satisfaction,
      opportunityScore,
      hasTension: false,
      evidence,
      speakerOutcomes: [
        {
          speakerId: 'aggregate',
          description,
          importance,
          satisfaction,
          opportunityScore,
          evidence,
        },
      ],
    };
  });
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeBatchOutcome(outcomes: LlmOutcome[], batch: SpeakerBatch): LlmOutcome | null {
  if (outcomes.length === 0) return null;

  const primary = selectPrimaryOutcome(outcomes);
  const combinedTurnText = extractTurnText(batch.text);

  return {
    description: primary.description?.trim() || 'Summarized desired outcome from speaker turn',
    importance: clamp(Number(primary.importance) || 6, 1, 10),
    satisfaction: clamp(Number(primary.satisfaction) || 4, 1, 10),
    evidenceQuotes:
      Array.isArray(primary.evidenceQuotes) && primary.evidenceQuotes.length > 0
        ? primary.evidenceQuotes.filter(Boolean).map(quote => quote.trim())
        : [combinedTurnText],
    // Enforce strict attribution to the speaker-turn metadata.
    speakerId: batch.speakerId,
  };
}

function selectPrimaryOutcome(outcomes: LlmOutcome[]): LlmOutcome {
  if (outcomes.length === 1) return outcomes[0]!;

  let best = outcomes[0]!;
  let bestScore = rankOutcome(best);

  for (let i = 1; i < outcomes.length; i++) {
    const candidate = outcomes[i]!;
    const score = rankOutcome(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function rankOutcome(outcome: LlmOutcome): number {
  const importance = clamp(Number(outcome.importance) || 0, 0, 10);
  const satisfaction = clamp(Number(outcome.satisfaction) || 0, 0, 10);
  const opportunity = computeOpportunityScore(importance, satisfaction);
  const evidenceCount = Array.isArray(outcome.evidenceQuotes) ? outcome.evidenceQuotes.length : 0;
  return opportunity + evidenceCount * 0.1;
}

function extractTurnText(batchText: string): string {
  const marker = '| TEXT:';
  const idx = batchText.indexOf(marker);
  if (idx === -1) return batchText;
  return batchText.slice(idx + marker.length).trim();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}


/** Nearest-neighbour resample — fast, good enough for speech. */
function resampleTo16k(audio: Float32Array, originalRate: number): Float32Array {
  const ratio = originalRate / 16_000;
  const resampled = new Float32Array(Math.floor(audio.length / ratio));
  for (let i = 0; i < resampled.length; i++) {
    resampled[i] = audio[Math.round(i * ratio)];
  }
  return resampled;
}

/**
 * Extract the first valid JSON object from a string.
 * Handles LLM output wrapped in markdown ```json … ``` fences.
 */
function extractJson<T>(text: string): T | null {
  // Strip markdown code fences if present.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate  = fenceMatch ? fenceMatch[1] : text;
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;

  // Repair common LLM output issues before parsing:
  // 1. Trailing commas before } or ]  (most frequent small-model mistake)
  // 2. Ellipsis / truncation markers left by the model
  const jsonStr = objectMatch[0]
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\.{3,}\s*([}\]])/g, '$1');

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Find the transcript segment whose text best matches a given evidence quote.
 * Uses word-overlap (Jaccard-style) scoring for robust fuzzy matching.
 */
function matchQuoteToSegment(quote: string, segments: SpeakerSegment[]): Evidence {
  const quoteWords = new Set(quote.toLowerCase().split(/\W+/).filter(Boolean));
  let bestScore = -1;
  let bestSegment = segments[0];

  for (const segment of segments) {
    const segWords = segment.text.toLowerCase().split(/\W+/).filter(Boolean);
    const overlap  = segWords.filter(w => quoteWords.has(w)).length;
    const score    = overlap / Math.max(quoteWords.size, 1);
    if (score > bestScore) {
      bestScore   = score;
      bestSegment = segment;
    }
  }

  return {
    speakerId: bestSegment.speakerId,
    text:      quote,
    startTime: bestSegment.startTime,
    endTime:   bestSegment.endTime,
  };
}

// ─── Internal types (LLM I/O) ──────────────────────────────────────────────────

interface LlmOutcome {
  description: string;
  importance: number;
  satisfaction: number;
  evidenceQuotes: string[];
  speakerId?: string; // Attached during batch processing to track origin
}

interface LlmResponse {
  outcomes: LlmOutcome[];
}

interface ChatMessage {
  role: string;
  content: string;
}

interface LlmOutput {
  generated_text: ChatMessage[] | string;
}

interface ProgressCallbackPayload {
  status: string;
  file?: string;
  progress?: number;
}

interface AsrChunk {
  text: string;
  timestamp?: [number, number];
}

interface AsrResult {
  text: string;
  chunks?: AsrChunk[];
}

// ─── JTBD System Prompt ────────────────────────────────────────────────────────
const JTBD_SYSTEM_PROMPT = `\
You are a JTBD Research Consultant. Your goal is to synthesize transcript segments into cohesive "Outcome Statements."

Input Contract: You will receive one metadata-prefixed speaker-turn block in this exact format:
SPEAKER_ID: [ID] | TEXT: [full combined turn text]

One Card Constraint: For every batch provided, output exactly one primary Job Card. Do not fragment a single speaker turn into multiple JSON objects.

Synthesis Rule: Identify the most important Desired Outcome or Pain Point in the block. Use that as the card description.

Evidence Stacking: Concatenate all relevant sentences from the block into evidenceQuotes while preserving verbatim quote text.

Strict Attribution: You MUST use the SPEAKER_ID provided in the block as speakerId in JSON. Never use "aggregate".

Score Weighting: Look for high-intensity adjectives such as "nightmare" and "game changer". If present, push Importance and Satisfaction toward extremes (1 or 10). Do not default to 5 or 6.

Output cardinality rule: Return exactly one item in outcomes for each input block.

Output Format: Ensure the description is concise and professional (not "Segment X").

Return ONLY a valid JSON object — no prose, no markdown fences:
{
  "outcomes": [
    {
      "speakerId": "Speaker_01",
      "description": "...",
      "importance": 8,
      "satisfaction": 3,
      "evidenceQuotes": ["quote from transcript", "another quote"]
    }
  ]
}`;

// ─── Mock Data ─────────────────────────────────────────────────────────────────
// Realistic UX research scenario: project management software.
// Used when mockMode: true — lets UI development proceed without a GPU.

const MOCK_SEGMENTS: SpeakerSegment[] = [
  {
    speakerId: 'Speaker_01',
    text: "I spend at least two hours every morning trying to figure out what each team member is actually working on. It's exhausting and I feel like I'm always behind.",
    startTime: 12.3,
    endTime:   20.1,
  },
  {
    speakerId: 'Speaker_02',
    text: "When I need to prioritize, I have to manually check four different tools. By the time I have the full picture, half the day is already gone.",
    startTime: 25.0,
    endTime:   32.8,
  },
  {
    speakerId: 'Speaker_01',
    text: "Getting sign-off is the real bottleneck. I send an email, wait three days, and then it gets buried. The project just stalls.",
    startTime: 45.2,
    endTime:   53.9,
  },
  {
    speakerId: 'Speaker_02',
    text: "Approvals are a bit painful, but honestly I've mostly worked around it by calling people directly. It's not ideal, but it works most of the time.",
    startTime: 58.0,
    endTime:   67.5,
  },
  {
    speakerId: 'Speaker_01',
    text: "Reporting to the client is always a last-minute scramble. I manually copy numbers from three spreadsheets. One wrong paste and the whole thing is wrong.",
    startTime: 80.0,
    endTime:   90.2,
  },
];

function buildMockJobCard(
  id: string,
  description: string,
  importance: number,
  satisfaction: number,
  evidenceItems: Pick<Evidence, 'speakerId' | 'text' | 'startTime' | 'endTime'>[],
): JobCard {
  const opportunityScore = computeOpportunityScore(importance, satisfaction);
  const evidence: Evidence[] = evidenceItems.map(e => ({ ...e }));

  return {
    id,
    description,
    averageImportance:   importance,
    averageSatisfaction: satisfaction,
    opportunityScore,
    hasTension: false,
    evidence,
    speakerOutcomes: [
      {
        speakerId: 'aggregate',
        description,
        importance,
        satisfaction,
        opportunityScore,
        evidence,
      },
    ],
  };
}

const MOCK_JOB_CARDS: JobCard[] = [
  // Score: 9 + max(9−2, 0) = 9 + 7 = 16  ← prime opportunity
  buildMockJobCard(
    'mock-1',
    'Track team task status without manual cross-checking',
    9,
    2,
    [
      {
        speakerId: 'Speaker_01',
        text: "I spend at least two hours every morning trying to figure out what each team member is actually working on.",
        startTime: 12.3,
        endTime:   20.1,
      },
      {
        speakerId: 'Speaker_02',
        text: "I have to manually check four different tools. By the time I have the full picture, half the day is already gone.",
        startTime: 25.0,
        endTime:   32.8,
      },
    ],
  ),

  // Score: 8 + max(8−2, 0) = 8 + 6 = 14  ← prime opportunity
  buildMockJobCard(
    'mock-2',
    'Obtain stakeholder sign-off without email delays',
    8,
    2,
    [
      {
        speakerId: 'Speaker_01',
        text: "Getting sign-off is the real bottleneck. I send an email, wait three days, and then it gets buried.",
        startTime: 45.2,
        endTime:   53.9,
      },
    ],
  ),

  // Score: 8 + max(8−1, 0) = 8 + 7 = 15  ← prime opportunity
  buildMockJobCard(
    'mock-3',
    'Generate client-ready status reports without manual data entry',
    8,
    1,
    [
      {
        speakerId: 'Speaker_01',
        text: "I manually copy numbers from three spreadsheets. One wrong paste and the whole thing is wrong.",
        startTime: 80.0,
        endTime:   90.2,
      },
    ],
  ),

  // Tension card: Speaker_01 satisfaction = 2, Speaker_02 satisfaction = 7
  // Difference = 5 points → hasTension = true (threshold > 3)
  // Score from averages: 7 + max(7 − 4.5, 0) = 7 + 2.5 = 9.5
  {
    id:                  'mock-4',
    description:         'Get approval decisions without synchronous phone calls',
    averageImportance:   7,
    averageSatisfaction: 4.5,
    opportunityScore:    7 + Math.max(7 - 4.5, 0),
    hasTension:          true,
    evidence: [
      {
        speakerId: 'Speaker_01',
        text: "Getting sign-off is the real bottleneck. The project just stalls.",
        startTime: 45.2,
        endTime:   53.9,
      },
      {
        speakerId: 'Speaker_02',
        text: "I've mostly worked around it by calling people directly. It works most of the time.",
        startTime: 58.0,
        endTime:   67.5,
      },
    ],
    speakerOutcomes: [
      {
        speakerId:         'Speaker_01',
        description:       'Get approval decisions without synchronous phone calls',
        importance:        7,
        satisfaction:      2,
        // 7 + max(7−2, 0) = 12
        opportunityScore:  computeOpportunityScore(7, 2),
        evidence: [
          {
            speakerId: 'Speaker_01',
            text: "Getting sign-off is the real bottleneck. The project just stalls.",
            startTime: 45.2,
            endTime:   53.9,
          },
        ],
      },
      {
        speakerId:         'Speaker_02',
        description:       'Get approval decisions without synchronous phone calls',
        importance:        7,
        satisfaction:      7,
        // 7 + max(7−7, 0) = 7
        opportunityScore:  computeOpportunityScore(7, 7),
        evidence: [
          {
            speakerId: 'Speaker_02',
            text: "I've mostly worked around it by calling people directly. It works most of the time.",
            startTime: 58.0,
            endTime:   67.5,
          },
        ],
      },
    ],
  },
];
