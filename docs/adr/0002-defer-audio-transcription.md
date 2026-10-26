# 0002: Defer audio and video transcription

## Status

Accepted (2026-10-26).

## Context

The app transcribed interview audio and video in the browser with Whisper (`onnx-community/whisper-base` through transformers.js and WebGPU), then extracted JTBD outcomes from the result. The transcripts weren't good enough to build on, and the rest of the product (projects, tagging, insights grounded in quotes, data handling) can be built and tested with transcripts that researchers already have.

## Decision

Take audio and video transcription out of scope and remove its code from `main`. Don't hide it behind a feature flag.

The last commit with the working pipeline is tagged **`archive/audio-transcription`** (commit `a6876f9`).

Code to remove (in a separate change):

- `src/services/audio/audioPreprocessor.ts`
- `src/composables/useMediaSync.ts`, `useWavesurferSync.ts`, `useEtaCalibration.ts`
- `src/components/VideoPlayer.vue`, `WaveformTimeline.vue` and their specs
- The Whisper half of `src/workers/ai.worker.ts`, the `TRANSCRIBE` / `TRANSCRIPTION_COMPLETE` messages in `messages.ts`, and the audio queueing and decoding in `useResearchStore.ts`
- The dependencies `wavesurfer.js` and `@xenova/transformers` (unused)

What stays: `SpeakerSegment` (`src/domain/types.ts`) as the shape of a transcript, whatever produced it. Uploaded text transcripts produce segments now; a future transcription feature would produce the same type. Timestamps become optional, because many text transcripts don't have them.

## Why not a feature flag

- About 1,500 lines of code, plus the main store's design, would have to keep compiling and passing tests for a feature nobody uses.
- The test-coverage and WCAG 2.2 AA goals would apply to flagged UI as well, or the flag would need exemptions.
- transformers.js and the Whisper models will have changed by the time transcription comes back, so the code would need reworking anyway. Git history keeps it just as well.

## Lessons to carry forward

- `whisper-base` quality was the limiting factor. Try larger or newer models, or server-side transcription (see [0003](0003-in-browser-ai-analysis-behind-provider-interface.md)), before rebuilding the UI.
- Audio preprocessing (80 Hz high-pass, compressor, resample to 16 kHz mono) lived in `OfflineAudioContext`.
- Video/waveform sync used an `isInternalChange` guard to stop the two players from triggering each other.
- Throttling worker `PROGRESS` messages (3% threshold) kept the UI responsive.
