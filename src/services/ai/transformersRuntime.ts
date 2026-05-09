/**
 * transformersRuntime.ts
 *
 * Centralised configuration for @huggingface/transformers (v3+).
 * Import this module once at app startup (e.g. in main.ts) to apply
 * environment settings before the worker is constructed.
 *
 * The actual pipeline singletons live inside ai.worker.ts so that all
 * model inference runs off the main thread.
 */

import { env } from '@huggingface/transformers';

/**
 * Apply recommended environment settings for an air-gapped PWA:
 *  - Models are fetched from the Hugging Face Hub on first use.
 *  - Weights are cached in the browser's Cache API for offline access.
 *  - Local model files (from public/models/) are allowed as an override.
 */
export function configureTransformersRuntime(): void {
  env.allowLocalModels = true;   // allow public/models/ overrides
  env.useBrowserCache  = true;   // persist weights in Cache API (offline-first)
}

/**
 * Model identifiers used across the app.
 * Keeping them here avoids duplication between the worker and any
 * future management UI that shows model metadata.
 */
export const MODEL_IDS = {
  whisper: 'onnx-community/whisper-base',
  llm:     'onnx-community/Qwen2.5-0.5B-Instruct',
} as const;
