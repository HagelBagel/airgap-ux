This summary is designed for a technical "architect" or coding assistant LLM. It outlines the core logic, tech stack, and user experience for **Sovereign JTBD**, a local-first UX research tool.

---

# Project Brief: Sovereign JTBD (V1)

## 1. Vision & Problem Statement
* **The Problem:** UX consultants cannot use cloud AI (Otter, Gong) for sensitive client data due to NDAs and privacy risks. Additionally, cloud AI has a significant carbon footprint.
* **The Solution:** A local-first, browser-based PWA that uses **WebGPU** to transcribe and analyze user research (Videos/Audio). It uses the **Strategyn (ODI)** framework to mathematically calculate "Opportunity Scores" from qualitative interviews.
* **Unique Selling Proposition (USP):** 100% Privacy (Zero-data-transfer), Carbon-Efficient (Local processing), and Methodologically Rigorous (Strategyn Formula).

## 2. Core Technical Architecture (2026 Stack)
* **Frontend:** Vite + Vue3 / Nuxt.js (Static Export).
* **Local AI Runtime:** `Transformers.js` (v3+) leveraging **WebGPU** for hardware acceleration.
* **Models (Quantized for Browser):**
    * **Transcription:** `Whisper-base-int8` or `Whisper-small`.
    * **Diarization:** `Pyannote 3.1` or `WhisperX` pipeline for "Who Spoke When."
    * **Reasoning/Extraction:** `Gemma 4-nano` (2B-4B) or `Qwen 3.6-35B-A3B` (MoE) for entity extraction and scoring.
* **Local Storage:** `IndexedDB` for persistence of video blobs, transcripts, and JSON state.
* **Vector Engine:** `Voy` or `Wasm-Vector-DB` for local semantic search across files.

## 3. The "Strategyn" Logic Engine
The app must extract "Desired Outcomes" and assign them two scores on a 1-10 scale based on transcript sentiment:
1.  **Importance ($I$):** How critical is the task to the user?
2.  **Satisfaction ($S$):** How well does their current solution work?

**Formula:**
$$I + \max(I - S, 0) = \text{Opportunity Score}$$

## 4. Primary User Workflow (V1)
1.  **Ingestion:** User drags `.mp4` or `.wav` files into the browser.
2.  **Local Processing:**
    * Audio is extracted and transcribed via WebGPU.
    * Diarization identifies Speaker 01, 02, etc.
    * AI scans for "Pain Points" (low satisfaction) and "Goals" (importance).
3.  **The "Draft" View:** The app generates a table of **Job Cards**.
    * **Average Score:** If multiple speakers discuss a job, the app averages their $I$ and $S$.
    * **Variance Warning:** If $S$ differs by >3 points between speakers, flag as a **"Conflict/Tension Map"** (Amber ⚠️ icon).
4.  **Refinement:** Researcher clicks a card to see "Evidence" (time-stamped quotes), then manually adjusts sliders to finalize the score.
5.  **Export:** Download a structured JSON or CSV (Fields: Description, Originator, Importance, Satisfaction, Opp_Score, Carbon_Saved).

## 5. Key UI/UX Components
* **The Power Meter:** A small widget showing GPU load and "CO2 saved" vs. Cloud processing.
* **The Tension Map:** Visual indicator for variance in speaker sentiment.
* **The Air-Gap Toggle:** A UI state that confirms the browser is offline but still processing.

## 6. Prompt for Coding Assistant
> "I want to build a React PWA that uses Transformers.js and WebGPU to process local video files. The goal is to extract 'Jobs-to-be-Done' and score them using the Strategyn formula. Start by setting up a file-drop component that extracts audio from video using the Web Audio API and routes it to a local Whisper-base model for transcription."

---

### Implementation Note for Version 1
Prioritize **"Single-File-to-Table"** first. Once the AI can reliably turn one video into five rows of JTBD data, implement the **"Average/Variance"** logic for multiple files.

---

## Project setup ToDo list

- [ ] Initialize app scaffold (Vue 3 + Vite + TypeScript + PWA plugin).
- [ ] Add code quality and consistency baseline (ESLint + Prettier + TypeScript strict mode).
- [ ] Set up local-first architecture primitives (Web Worker, IndexedDB layer, offline cache strategy).
- [ ] Deliver V1 vertical slice: drag file -> local transcription -> draft JTBD table.

### 1) Initial folders to create

- [ ] `src/app/` (app bootstrap and app-level providers).
- [ ] `src/components/` (UI components).
- [ ] `src/components/job-cards/` (job card table, card row, evidence drawer).
- [ ] `src/components/upload/` (dropzone, file list, progress widgets).
- [ ] `src/components/power-meter/` (GPU load and carbon widget UI).
- [ ] `src/components/tension-map/` (variance and conflict indicators).
- [ ] `src/views/` (route/page views).
- [ ] `src/router/` (Vue Router setup).
- [ ] `src/stores/` (Pinia stores).
- [ ] `src/workers/` (AI and heavy processing workers).
- [ ] `src/services/` (model runners, transcript pipeline, scoring).
- [ ] `src/services/ai/` (transformers.js model loading and inference glue).
- [ ] `src/services/storage/` (IndexedDB and persistence adapters).
- [ ] `src/services/export/` (JSON/CSV export builders).
- [ ] `src/domain/` (core entities and business rules).
- [ ] `src/domain/strategyn/` (Importance, Satisfaction, Opportunity Score formula).
- [ ] `src/domain/transcript/` (speaker segments, evidence model).
- [ ] `src/composables/` (reusable Composition API logic).
- [ ] `src/styles/` (global tokens and base styles).
- [ ] `src/utils/` (small pure helpers).
- [ ] `public/models/` (optional local model manifests or placeholders).
- [ ] `tests/unit/` (unit tests).
- [ ] `tests/e2e/` (end-to-end tests).
- [ ] `.github/prompts/` (project prompts and guidance).

### 2) Initial files to create

- [ ] `src/main.ts` (app entry).
- [ ] `src/App.vue` (root shell).
- [ ] `src/router/index.ts` (routing).
- [ ] `src/stores/researchProject.ts` (project state: files, transcripts, job cards, scores).
- [ ] `src/stores/processing.ts` (pipeline state: model download, warm-up, progress, errors).
- [ ] `src/workers/ai.worker.ts` (transcription and extraction worker).
- [ ] `src/workers/messages.ts` (typed worker message contracts).
- [ ] `src/services/ai/transformersRuntime.ts` (model init with WebGPU options).
- [ ] `src/services/ai/transcriptionPipeline.ts` (audio to transcript).
- [ ] `src/services/ai/jtbdExtractionPipeline.ts` (goals, pain points, evidence extraction).
- [ ] `src/services/storage/indexedDb.ts` (database init and data access).
- [ ] `src/services/storage/repositories.ts` (project, transcript, job card repositories).
- [ ] `src/services/export/exportCsv.ts` (CSV export with required fields).
- [ ] `src/services/export/exportJson.ts` (JSON export with required fields).
- [ ] `src/domain/strategyn/opportunityScore.ts` (I + max(I - S, 0)).
- [ ] `src/domain/strategyn/variance.ts` (multi-speaker variance/conflict checks).
- [ ] `src/domain/types.ts` (core shared interfaces).
- [ ] `src/components/upload/FileDropzone.vue`.
- [ ] `src/components/job-cards/JobCardsTable.vue`.
- [ ] `src/components/job-cards/JobCardEvidencePanel.vue`.
- [ ] `src/components/tension-map/TensionMapBadge.vue`.
- [ ] `src/components/power-meter/PowerMeter.vue`.
- [ ] `src/styles/tokens.css` (eco color variables and spacing scale).
- [ ] `src/styles/base.css` (global reset and typography baseline).
- [ ] `vite.config.ts` (PWA and worker-friendly build config).
- [ ] `tsconfig.json` and `tsconfig.app.json` (strict TS config).
- [ ] `.eslintrc.cjs` and `.prettierrc`.
- [ ] `manifest.webmanifest` (PWA metadata).
- [ ] `README.md` (local-first constraints, setup, and architecture notes).

### 3) Packages to install

- [ ] Core app/runtime:
    - `npm install vue vue-router pinia`
- [ ] AI runtime + browser inference:
    - `npm install @xenova/transformers`
- [ ] Local storage and utilities:
    - `npm install idb`
- [ ] Optional local semantic search (pick one for V1+):
    - `npm install voy-search`
    - or evaluate an equivalent WASM vector DB package before adoption.
- [ ] PWA/offline support:
    - `npm install -D vite-plugin-pwa workbox-window`
- [ ] TypeScript + Vue tooling:
    - `npm install -D typescript vue-tsc @vitejs/plugin-vue vite`
- [ ] Lint/format:
    - `npm install -D eslint prettier eslint-config-prettier eslint-plugin-vue @typescript-eslint/parser @typescript-eslint/eslint-plugin`
- [ ] Testing:
    - `npm install -D vitest @vue/test-utils jsdom playwright`

### 4) Post-install setup checks

- [ ] Verify WebGPU availability and add graceful fallback messaging.
- [ ] Confirm worker build output and message channel typing.
- [ ] Smoke test offline mode after first model cache (air-gap behavior).
- [ ] Validate Strategyn scoring with unit tests for formula and variance rules.
- [ ] Add a sample fixture input and expected 5-row JTBD draft output for regression tests.

### 5) Bootstrap command sequence (PowerShell, in order)

Run these commands from the project root. This creates a fresh Vue 3 + Vite + TypeScript app, adds required packages, and scaffolds the initial folder/file layout.

```powershell
# 1) Create Vue 3 + TS app in current folder (safe to run in an empty repo)
npm create vite@latest . -- --template vue-ts

# 2) Install baseline runtime and dev dependencies
npm install vue-router pinia @xenova/transformers idb
npm install -D vite-plugin-pwa workbox-window
npm install -D eslint prettier eslint-config-prettier eslint-plugin-vue @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D vitest @vue/test-utils jsdom playwright

# 3) Create initial folders
New-Item -ItemType Directory -Force -Path src/app,src/components,src/components/job-cards,src/components/upload,src/components/power-meter,src/components/tension-map,src/views,src/router,src/stores,src/workers,src/services,src/services/ai,src/services/storage,src/services/export,src/domain,src/domain/strategyn,src/domain/transcript,src/composables,src/styles,src/utils,public/models,tests/unit,tests/e2e | Out-Null

# 4) Create initial files (empty placeholders where implementation follows)
New-Item -ItemType File -Force -Path src/router/index.ts,src/stores/researchProject.ts,src/stores/processing.ts,src/workers/ai.worker.ts,src/workers/messages.ts,src/services/ai/transformersRuntime.ts,src/services/ai/transcriptionPipeline.ts,src/services/ai/jtbdExtractionPipeline.ts,src/services/storage/indexedDb.ts,src/services/storage/repositories.ts,src/services/export/exportCsv.ts,src/services/export/exportJson.ts,src/domain/strategyn/opportunityScore.ts,src/domain/strategyn/variance.ts,src/domain/types.ts,src/components/upload/FileDropzone.vue,src/components/job-cards/JobCardsTable.vue,src/components/job-cards/JobCardEvidencePanel.vue,src/components/tension-map/TensionMapBadge.vue,src/components/power-meter/PowerMeter.vue,src/styles/tokens.css,src/styles/base.css,.eslintrc.cjs,.prettierrc | Out-Null

# 5) Ensure PWA manifest file exists at app root
if (-Not (Test-Path "public/manifest.webmanifest")) {
    New-Item -ItemType File -Path "public/manifest.webmanifest" | Out-Null
}

# 6) Add Playwright browser binaries (required for e2e execution)
npx playwright install

# 7) Verify install and scaffold integrity
npm run build
```

If `npm create vite@latest .` refuses to run in a non-empty folder, use:

```powershell
npm create vite@latest sovereign-jtbd -- --template vue-ts
```

Then move into that folder and run steps 2-7:

```powershell
Set-Location sovereign-jtbd
```

My apologies—I was over-complicating things. Here is a clear breakdown of the features and sub-tasks we’ve mapped out for your **JTBD/ODI Insight Workbench**, organized by functional area.

### 1. Audio Pre-processing Pipeline

* **Web Audio API Service:**
* Implement `OfflineAudioContext` for fast, background processing.
* **High-Pass Filter:** Set to 80Hz to remove low-frequency background rumble.
* **Dynamics Compressor:** Normalize audio levels (Threshold -24dB, Ratio 12) to make speech consistent.
* **Resampling Logic:** Convert all incoming files to **16kHz Mono** (Whisper's "Gold Standard").
* **PCM Encoder:** Custom helper to convert processed buffers into 16-bit WAV Blobs.



---

### 2. Media Player & Timeline UI

* **"Studio" Playback Architecture:**
* **Master/Slave Sync:** Muted HTML5 `<video>` follows the Wavesurfer (Audio) play-head.
* **Wavesurfer Integration:** Display normalized waveforms using the processed `cleanBlob`.
* **Transport Controls:** Unified Play/Pause and 5s skip buttons.


* **Waveform Visualization:**
* **Scrubbing Logic:** Bidirectional sync between timeline clicking and video frames.
* **Speaker Regions:** Visual color-coding on the timeline to show who is speaking and when (Multi-track visualization).



---

### 3. Transcription & Analysis Engine

* **Local AI Integration:**
* Integration of **local Whisper** models (aiming for 'Small' or 'Distil' versions for accuracy).
* **Traceability View:** Side-by-side layout showing the transcript next to the media player.


* **Evidence Curation:**
* "Highlight-to-Card" workflow for extracting specific quotes from the transcript.
* **Contextual Linking:** Clicking an insight card jumps the media player to that exact timestamp.



---

### 4. Strategy & Data Management

* **JTBD/ODI Frameworks:**
* **Priority Index:** Calculation of "Opportunity" using renamed formulas to respect IP (Importance + Gap logic).
* **Outcome Mapping:** Categorizing segments into Desired Outcomes or Pain Points.


* **Local-First Architecture:**
* No cloud uploads; all media stays on the user's local machine.
* Export functionality for "Codebooks" or research summaries.



---

### 5. Technical Maintenance & Sync Fixes

* **Circular Loop Prevention:** Implementation of the `isInternalChange` guard in Vue composables.
* **Buffer Management:** Ensuring video and audio are both "Ready" before allowing playback to start.
* **Error Handling:** Fallback logic to original files if the pre-processor fails.

---

**Is there a specific section here you’d like to prioritize next, or should we refine the "Speaker Regions" logic for that multi-track look?**