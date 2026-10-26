# 0003: In-browser AI analysis behind a provider interface

## Status

Accepted (2026-10-26).

## Context

Hosting the data (see [0001](0001-hosted-first-own-api-and-eu-postgres.md)) doesn't mean the AI analysis has to run on a server. Interview transcripts contain personal data. Sending them to a model provider would make that provider a data processor, which brings a data processing agreement, EU hosting of the model, transfer assessments and a line in the privacy notice.

JTBD extraction already runs in the browser: `onnx-community/Qwen2.5-0.5B-Instruct` in a Web Worker, with deterministic extraction as a fallback when the model returns invalid JSON (`usedFallback`).

## Decision

- **The default is to run analysis in the browser.** The model runs in a Web Worker; the transcript text never leaves the client for AI purposes. Only the results (job cards and their evidence links) are saved through our API.
- **Analysis goes through a provider interface** so the app doesn't depend on where the model runs. Roughly: an `AnalysisProvider` takes transcript segments and returns job cards whose evidence references segment IDs. The in-browser worker is the first implementation.
- **A server-side provider can be added later** as a second implementation, without changing the UI or the stored data.

## Conditions for a server-side provider

A server-side provider is only allowed if:

- the model runs in the EU, either self-hosted or under a provider with a data processing agreement;
- the user explicitly chooses it, per project or per run, and the UI says what data is sent and where;
- the record of processing and the privacy notice are updated before it ships;
- it passes the same grounding evals as the in-browser provider.

## Consequences

- Every provider's output must carry evidence that points to real segments, so the grounding eval set can check it whatever model is used.
- The small in-browser model limits analysis quality. The provider interface is where we'd improve that.
- The worker no longer loads Whisper (see [0002](0002-defer-audio-transcription.md)), so first-time model download and warm-up get faster.
