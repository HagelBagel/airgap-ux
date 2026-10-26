# Project Progress — Sovereign JTBD

---

## 2026-04-28 — Initial Setup Session

### What was done

#### Documentation
- Created `.github/prompts/system.prompt.md` — project-level system prompt with Vue 3 + WebGPU + Strategyn/ODI constraints.
- Created `notes/project-brief.md` — full technical brief including vision, stack, Strategyn formula, user workflow, and UI components.
- Appended **Project Setup ToDo List** to the brief — initial folder/file structure and package install plan.
- Appended **Bootstrap Command Sequence** to the brief — ordered, executable PowerShell commands covering scaffold, installs, and folder/file creation.

#### Project Scaffold
- Initialized **Vue 3 + Vite 8 + TypeScript** app (`sovereign-jtbd`) via `npm create vite@latest`.
- Preserved existing `.github/` and `notes/` directories during scaffold.

#### Dependencies installed
| Category | Packages |
|---|---|
| Runtime | `vue`, `vue-router`, `pinia`, `@xenova/transformers`, `idb` |
| PWA / Offline | `vite-plugin-pwa`, `workbox-window` (installed with `--legacy-peer-deps` due to Vite 8 peer conflict) |
| Linting / Formatting | `eslint`, `prettier`, `eslint-config-prettier`, `eslint-plugin-vue`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin` |
| Testing | `vitest`, `@vue/test-utils`, `jsdom`, `playwright` |
| Playwright browsers | Chromium (147.0.7727.15), Chrome Headless Shell, FFmpeg |

**Total installed: 677 packages.**

> Note: 8 audit vulnerabilities exist in dev/test tooling only (not production code). Run `npm audit fix` when convenient.

#### Folder structure created
```
src/
  app/
  components/
    job-cards/
    upload/
    power-meter/
    tension-map/
  views/
  router/
  stores/
  workers/
  services/
    ai/
    storage/
    export/
  domain/
    strategyn/
    transcript/
  composables/
  styles/
  utils/
public/
  models/
tests/
  unit/
  e2e/
```

#### Placeholder files created (26 total)
`src/router/index.ts`, `src/stores/researchProject.ts`, `src/stores/processing.ts`, `src/workers/ai.worker.ts`, `src/workers/messages.ts`, `src/services/ai/transformersRuntime.ts`, `src/services/ai/transcriptionPipeline.ts`, `src/services/ai/jtbdExtractionPipeline.ts`, `src/services/storage/indexedDb.ts`, `src/services/storage/repositories.ts`, `src/services/export/exportCsv.ts`, `src/services/export/exportJson.ts`, `src/domain/strategyn/opportunityScore.ts`, `src/domain/strategyn/variance.ts`, `src/domain/types.ts`, `src/components/upload/FileDropzone.vue`, `src/components/job-cards/JobCardsTable.vue`, `src/components/job-cards/JobCardEvidencePanel.vue`, `src/components/tension-map/TensionMapBadge.vue`, `src/components/power-meter/PowerMeter.vue`, `src/styles/tokens.css`, `src/styles/base.css`, `.eslintrc.cjs`, `.prettierrc`, `public/manifest.webmanifest`, `README.md`

#### Build verification
`npm run build` — **✓ built in 1.67s**, no errors. Output in `dist/`.

---

## Next Steps (updated 2026-04-29 — session 2)

- [ ] Wire `processMedia` end-to-end in Mock Mode: drop a file → see mock job cards render
- [ ] Implement IndexedDB persistence (`src/services/storage/`)
- [ ] Write Strategyn formula unit tests (edge cases: I=1,S=10 → 1; I=10,S=1 → 19)
- [ ] Add `PowerMeter.vue` — GPU load + CO₂ saved widget in the header
- [ ] Multi-file averaging: when >1 file processed, merge `SpeakerOutcome` arrays before scoring
- [ ] V1 vertical slice end-to-end (real AI): one file → transcript → 5-row JTBD draft table

---

## 2026-04-29 — UI Layer: JobCard + ResearchDashboard

### What was done

#### Design system
- **`src/styles/tokens.css`** — full design token system:
  - Forest Green palette (`--c-forest-*`) for high-opportunity heatmap
  - Amber palette (`--c-amber-*`) for tension/conflict indicators
  - Slate palette (`--c-slate-*`) for neutral/low-priority states
  - Semantic roles (`--color-*`), spacing (`--space-*`), radii, typography, shadows, motion
- **`src/styles/base.css`** — CSS reset + root typography; imports tokens.css
- **`src/main.ts`** — added `import './styles/base.css'` so tokens are globally available

#### Components

| File | Purpose |
|---|---|
| `TensionMapBadge.vue` | Amber pill badge (⚠ icon + "Tension") rendered when `hasTension` is true |
| `JobCardEvidencePanel.vue` | Collapsible evidence section with speaker ID, timestamp, and blockquote; chevron animates on open |
| `JobCard.vue` *(new file)* | Core card: score ring (76 px circle coloured by heatmap class), description, Strategyn sliders, evidence panel |
| `JobCardsTable.vue` | Responsive CSS grid (`auto-fill, minmax(320px, 1fr)`) of `JobCard` components |
| `FileDropzone.vue` | Drag-and-drop zone with active state, hidden file input, browse button |
| `ResearchDashboard.vue` *(new view)* | Full-page shell: sticky header, drop zone, progress bar, error state, sorted results grid |

#### Heatmap design
- Score `> 15` → `.job-card--high` → forest green accent (`--c-forest-700`), green score ring
- Score `10–15` → `.job-card--mid` → sage green accent (`--c-forest-500`), light mint ring
- Score `< 10` → `.job-card--low` → slate accent (`--c-slate-400`), grey ring
- Modifier classes override three local custom properties: `--score-accent`, `--score-bg`, `--score-text`; these propagate automatically into the slider thumb, evidence quote border, and score value colour

#### Slider behaviour
- `localImportance` / `localSatisfaction` refs initialised from props
- `displayScore` computed live as slider moves — instant visual feedback, no store round-trip on every tick
- `onSliderInput` debounces the `store.updateCardScore()` call by 300 ms
- Custom `::-webkit-slider-thumb` styling (size 16 px, border-radius 50 %, accent-color per card class, scale-up on hover)

#### Router
- `src/router/index.ts` updated: root `/` now lazy-loads `ResearchDashboard.vue`

#### Build verification
`npm run build` — **✓ built in 2.19s**, 71 modules, zero TypeScript errors.
CSS correctly code-split: `ResearchDashboard-*.css` (11.5 kB) emitted separately. WASM chunk warning is expected (ONNX runtime).


---

## 2026-04-29 — Worker-First Architecture + Pinia Store

### What was done

#### Dependencies
- Installed `@huggingface/transformers@4.2.0` (`--legacy-peer-deps`). This is the v3+ package (renamed from `@xenova/transformers` at v3.0).

#### Domain layer
- **`src/domain/types.ts`** — all core interfaces: `SpeakerSegment`, `Evidence`, `SpeakerOutcome`, `JobCard`, `ResearchProject`, `ProcessingStage`.
- **`src/domain/strategyn/opportunityScore.ts`** — pure `computeOpportunityScore(I, S)` function with input clamping.
- **`src/domain/strategyn/variance.ts`** — `hasTension(speakerOutcomes)` (max−min satisfaction > 3 threshold) and `averageOutcome()` helper.

#### Worker layer
- **`src/workers/messages.ts`** — fully typed discriminated union message contracts (`WorkerInMessage` / `WorkerOutMessage`) shared between worker and main thread.
- **`src/workers/ai.worker.ts`** — complete Web Worker implementation:
  - Handles `LOAD_MODELS`, `TRANSCRIBE`, `RUN_STRATEGYN_ANALYSIS` messages.
  - Real path: Whisper (ASR) + Qwen2.5-0.5B (LLM) loaded via `@huggingface/transformers` onto WebGPU.
  - Mock path: returns pre-canned `MOCK_SEGMENTS` and `MOCK_JOB_CARDS` instantly, covering normal cards, high-opportunity cards, and a tension card (5-point satisfaction spread).
  - LLM extraction uses structured JSON prompt → `extractJson()` → `matchQuoteToSegment()` (Jaccard word-overlap fuzzy match).
  - Mock Mode controlled per-message via `payload.mockMode: boolean`.

#### Services layer
- **`src/services/ai/transformersRuntime.ts`** — `configureTransformersRuntime()` (env flags) + `MODEL_IDS` constants.

#### Store layer
- **`src/stores/useResearchStore.ts`** — Pinia store bridging the UI and worker:
  - `export const MOCK_MODE = true` — single toggle at top of file for Fast UI Mode.
  - Worker lifecycle: lazy init on first `processMedia()`, terminated by `resetProject()`.
  - Sequencing: `MODELS_READY` → TRANSCRIBE → `TRANSCRIPTION_COMPLETE` → RUN_STRATEGYN_ANALYSIS → `ANALYSIS_COMPLETE` → `applyVariance()` → update store.
  - Audio decoded on main thread via `AudioContext.decodeAudioData()`, mixed to mono Float32Array; skipped entirely in Mock Mode.
  - `updateCardScore(cardId, patch)` recomputes formula in-place for Evidence Drawer sliders.
  - Exposes `processingStage`, `loadProgress`, `currentProject`, `error` as reactive readonly refs.

#### App bootstrap
- **`src/App.vue`** — stripped to blank shell with `<router-view />`.
- **`src/main.ts`** — added `createPinia()` and `configureTransformersRuntime()` calls.
- **`src/router/index.ts`** — minimal router wired to `HomeView`.
- **`src/views/HomeView.vue`** — empty placeholder view created.
- **`vite.config.ts`** — added `worker.format: 'es'` and `optimizeDeps.exclude: ['@huggingface/transformers']`.

#### Build verification
`npm run build` — **✓ built in 999ms**, no TypeScript errors. (Large WASM chunk warning from ONNX runtime is expected and non-blocking.)

---

## 2026-04-29 — Real-Time Pipeline Visibility + ETA Calibration

### What was done

#### Feature Flags
- **`src/featureFlags.ts`** (new file) — centralized `MOCK_MODE` export, replacing inline constant in store for easier testing toggles.

#### Processing Status Component Suite

| File | Purpose |
|---|---|
| `ProcessingStatus.vue` | Top-level status strip: progress bar (loading-models phase), stage label with pulsing dot, fallback badge, sovereign privacy badge, time stats |
| `ProcessingTimeStats.vue` | Elapsed time (mm:ss) and remaining time display; auto-learns stage durations; triggers calibration recordRun on 'done' |
| `ProcessingTaskList.vue` *(new file)* | Visual task checklist: maps `ProcessingStage` enum to 4 UI tasks with status indicators (✓ completed, ● in-progress, ○ pending) |
| `useEtaCalibration.ts` (composable) | Persistent per-device ETA profile; localStorage-backed; auto-learns stage durations; confidence blending for estimates |

#### ResearchDashboard enhancements
- Added sticky header with **Mock Mode badge**, **Auto-calibrate toggle**, **runs counter** (e.g. "Learned from 3 runs"), **Reset ETA button**
- Integrated `useEtaCalibration` composable
- Wired `allowCalibrationLearning` prop (disabled in MOCK_MODE) to ProcessingStatus

#### Problem fixes

| Issue | Root Cause | Solution |
|---|---|---|
| CSS nesting not recognized | Volar not supporting scoped Vue style nesting syntax | Flattened all nested selectors (& syntax) to standalone BEM classes |
| AudioContext autoplay warning | Web Audio API strict user-gesture requirement | Switched to `OfflineAudioContext` for audio decoding (no autoplay restriction) |
| Transformers.js language warning | Whisper pipeline not passed explicit language param | Added `language: 'english'` to pipeline call |
| LLM JSON parsing failures | Qwen 2.5 0.5B produces syntactic errors (trailing commas, ellipsis) | Implemented `extractJson()` with repair logic: strip trailing commas, handle ellipsis truncation |
| Progress bar jitter | Worker sending progress updates too frequently (100+/sec) | Added 1% threshold throttle in worker + 600ms CSS transition easing |
| ETA showing 27 minutes and rising | Single global progress metric unsuitable for multi-stage pipeline | Switched to per-stage estimate tracking; confidence blending as more runs complete |
| Users unable to trust/calibrate ETA | Hidden defaults prevent transparency | Added user-visible calibration controls: auto-toggle, runs counter, reset button |

#### ETA Calibration System
- **Profile storage**: localStorage key `airgapux.eta-calibration.v1` persists:
  - Per-stage average seconds (from completed runs)
  - Sample count per stage (confidence indicator)
  - Auto-calibration enabled flag
- **Confidence blending**: `estimate = default * (1 - confidence) + learned * confidence`
  - Confidence = samples / (samples + constant smoothing factor)
- **Auto-learn**: On `processingStage` transition to 'done', if `allowCalibrationLearning=true`, records actual durations per stage
- **User controls**:
  - Toggle auto-calibration on/off
  - View "Learned from N runs" counter
  - Reset to factory defaults

#### Build verification
`npm run build` — **✓ built successfully**. No new logic errors. (Pre-existing Vue SFC "no default export" Volar warning remains cosmetic.)

---

## 2026-04-30 — JSON Export

### What was done

#### Export service
- **`src/services/export/exportJson.ts`** — implemented `exportJson(cards, projectName)`:
  - Reconstructs the `LlmResponse` shape from store `JobCard[]`: each outcome contains `description`, `importance`, `satisfaction`, `opportunityScore`, and `evidenceQuotes` (plain text array).
  - Adds top-level metadata: `exportedAt` (ISO 8601 timestamp) and `projectName`.
  - **Primary path**: uses the File System Access API (`showSaveFilePicker`) so the user selects the exact save folder and filename.
  - **Fallback path**: creates a Blob URL and triggers a classic `<a download>` for browsers without the API.
  - Output filename pattern: `<project-name>_jtbd.json` (special characters replaced with `_`).

### Next Steps
- Hook exports into IndexedDB persistence layer
- Multi-file averaging: when >1 file processed, merge `SpeakerOutcome` arrays before scoring
- V1 vertical slice end-to-end (real AI): one file → transcript → 5-row JTBD draft table

---

## 2026-05-02 — Mock Mode Fix & Progress Bar Jitter Fix

### What was done

#### Mock Mode Bug Fixed
- **Root cause**: `MOCK_MODE` was hardcoded to `true`, forcing all file drops to trigger mock analysis (5 sec instant mock outcomes) instead of real transcription.
- **Solution**: Changed [src/featureFlags.ts](src/featureFlags.ts) to read from `VITE_MOCK_MODE` env variable. Real analysis now the default; mock only runs if explicitly set.
- **Impact**: Dropped files now trigger real Whisper + Strategyn analysis instead of pre-canned outcomes.

#### Progress Bar Jitter Eliminated
- **Root cause**: 1% throttle threshold too loose during rapid model downloads (100+ callbacks/sec); too many crossed the boundary.
- **Solution**: 
  - Increased `PROGRESS_THRESHOLD` from `0.01` (1%) to `0.03` (3%) in [src/workers/ai.worker.ts](src/workers/ai.worker.ts#L56)
  - Extended CSS transition from `600ms` to `1000ms` in [src/components/ProcessingStatus.vue](src/components/ProcessingStatus.vue#L109) for smoother visual motion
- **Result**: Progress bar now stays smooth from 0–100% instead of jittering until ~20%.

#### Build verification
`npm run build` — **✓ built in 3.23s**, 84 modules. No TypeScript errors.

---

## 2026-05-02 — JSON & CSV Export Implementation

### What was done

#### Export services refactored

| File | Changes |
|---|---|
| `src/services/export/exportJson.ts` | Refactored to export speaker-level outcomes (not aggregated job cards). Format: flat array of objects with `title`, `speaker`, `importance`, `satisfaction`, `evidence`. Uses first evidence quote as string, or empty if no evidence. Preserves File System Access API + blob fallback. |
| `src/services/export/exportCsv.ts` *(new)* | Implemented full CSV export with same speaker-level data structure. CSV columns: title, speaker, importance, satisfaction, evidence. Includes proper field escaping (quotes, newlines, commas). Same file picker / blob fallback pattern. |

#### ResearchDashboard.vue enhancements
- Imported `exportJson` and `exportCsv` functions
- Added `handleExportJson()` and `handleExportCsv()` handler functions
- Added two export buttons (↓ JSON, ↓ CSV) to results header, aligned right
- Updated results header layout to flex with space-between for button placement
- Added `.dashboard__export-btn` styles with hover effects (accent color, background shift)

#### Example output format
```json
[
  {
    "title": "Real-time dashboard updates",
    "speaker": "Speaker_01",
    "importance": 9,
    "satisfaction": 9,
    "evidence": "Being able to see the opportunity scores update in real time... is a game changer"
  },
  {
    "title": "Local memory management/upload process",
    "speaker": "Speaker_02",
    "importance": 10,
    "satisfaction": 2,
    "evidence": "I'm struggling with the upload process... it's a nightmare."
  }
]
```

#### Build verification
`npm run build` — **✓ built in 6.07s**, 84 modules transformed. No TypeScript errors.

---

## 2026-05-02 — JTBD Synthesis, Speaker Batching, and Manual Card Curation

### What was done

#### JTBD prompt moved from atomic extraction to synthesis
- Updated [src/workers/ai.worker.ts](src/workers/ai.worker.ts) system prompt to instruct the model as a JTBD Research Consultant with explicit synthesis behavior.
- Added guidance to combine same-speaker segments into cohesive Desired Outcomes instead of producing one card per segment.
- Added extreme scoring rules (full 1-10 usage), strict speaker attribution, and professional card title requirements.

#### Speaker batching implemented for extraction
- Implemented [src/services/ai/jtbdExtractionPipeline.ts](src/services/ai/jtbdExtractionPipeline.ts):
  - `batchSegmentsBySpeaker(segments, maxChunkSize = 500)` groups consecutive transcript segments by `speakerId`.
  - `chunkBatch()` splits long speaker turns only when combined text exceeds 500 characters.
- Updated [src/workers/ai.worker.ts](src/workers/ai.worker.ts) extraction flow to:
  - Process speaker batches instead of sending one monolithic transcript block.
  - Send each speaker-turn batch to the LLM and accumulate outcomes.
  - Preserve speaker attribution on extracted outcomes.

#### Store-level manual curation: mergeCards action
- Added `mergeCards(cardIds: string[])` to [src/stores/useResearchStore.ts](src/stores/useResearchStore.ts):
  - Uses first selected card as Primary.
  - Appends evidence from all secondary cards into Primary.
  - Recalculates average Importance and Satisfaction across merged cards.
  - Recomputes Opportunity Score from the merged averages.
  - Deletes secondary cards from store state.
  - Sets `hasBeenManuallyEdited = true` on Primary.
- Extended [src/domain/types.ts](src/domain/types.ts) `JobCard` with optional `hasBeenManuallyEdited?: boolean`.

#### JobCards UI: selection + floating merge action bar
- Updated [src/components/job-cards/JobCardsTable.vue](src/components/job-cards/JobCardsTable.vue):
  - Added per-card checkbox selection state.
  - Added bottom floating Action Bar shown when 2+ cards are selected.
  - Added "Merge Selected" button wired to `store.mergeCards(selectedIds)`.
  - Clears selection after merge.
  - Added "Clear" action and selection pruning when card list changes.

#### Verification notes
- Type diagnostics checked on updated files via editor problems:
  - No new errors in [src/services/ai/jtbdExtractionPipeline.ts](src/services/ai/jtbdExtractionPipeline.ts), [src/stores/useResearchStore.ts](src/stores/useResearchStore.ts), and [src/domain/types.ts](src/domain/types.ts).
  - Existing workspace-wide Vue SFC default-export diagnostics remain in multiple components/views and are pre-existing.

---

## 2026-05-14 — LPM-001-a: Add "Select Vault" UI action (GitHub #4)

### Files created
- `src/stores/vault.ts` — new Pinia setup store with `selectVault()` action, `activeVault`, `isSelecting`, and `error` state.
- `src/components/VaultSelector.vue` — button component that calls `vault.selectVault()`. Scoped CSS, CSS custom properties for theming.
- `src/components/VaultSelector.spec.ts` — 2 passing tests: renders button, calls store on click.
- `src/views/HomeView.vue` — wired `VaultSelector` into the home view; shows vault name once selected.

### Key decisions
- Used `window.showDirectoryPicker({ mode: 'readwrite' })` per ADR (File System Access API).
- `AbortError` (user cancels picker) is silently ignored — not treated as an error.
- Raw media is never stored; only the `FileSystemDirectoryHandle` and `name` are held in store state (IndexedDB persistence is a separate task, LPM-001-e).

### Next steps
- [ ] LPM-001-b: Open native directory picker on action (already implemented as part of `selectVault()` — may close directly)
- [ ] LPM-001-c: Request read/write access to selected folder
- [ ] LPM-001-d: Register selected folder as active vault
- [ ] LPM-001-e: Store vault directory handle in IndexedDB
- [ ] LPM-001-f: Ensure vault contents are never uploaded to server

---

## 2026-10-26 — Remove audio/video transcription (ADR 0002)

### Files changed
- Deleted: `services/audio/audioPreprocessor.ts`, `composables/useMediaSync.ts`, `composables/useWavesurferSync.ts`, `components/VideoPlayer.vue` + spec, `components/WaveformTimeline.vue` + spec, empty `services/ai/transcriptionPipeline.ts`.
- `workers/ai.worker.ts`: removed Whisper loading, `TRANSCRIBE` handler, resampling and ASR types. Model loading now reports progress for the LLM only.
- `workers/messages.ts`: removed `TRANSCRIBE` and `TRANSCRIPTION_COMPLETE`.
- New `services/ai/mockData.ts`: mock transcript and job cards moved out of the worker so the store can use the transcript too.
- `stores/useResearchStore.ts`: `processMedia(blob)` replaced by `analyzeSegments(segments, projectName)`, which queues segments until `MODELS_READY`. New `useResearchStore.spec.ts` covers queueing, the warm path, applying results, and reset.
- `views/ResearchDashboard.vue`: removed video, waveform and playback controls. When idle, it shows a "transcript import is coming" notice, plus an "Analyse sample transcript" button in Mock Mode.
- `ProcessingStage` lost `audio-preprocessing` and `transcribing`; status label, task list, ETA calibration and their specs updated.
- Removed `wavesurfer.js` and `@xenova/transformers`; removed the `OfflineAudioContext`/`AudioBuffer` ESLint globals; removed `whisper` from `MODEL_IDS`.

### Key decisions
- Pure removal: real-mode analysis has no entry point until the text import lands. Mock Mode keeps the analysis UI demoable.
- `useEtaCalibration` kept (it also times model loading and LLM stages); only its `transcribing` stage was removed. ADR 0002 corrected.
- `FileDropzone.vue` kept but unused; it will be reworked for transcript upload.

### Next steps
- Plain-text transcript parser + optional timestamps; reuse the drop zone for upload.
- Pre-existing breakages logged in `notes/task-list.md` (`ResearchWorkbench` import, `vue-tsc -b` errors).
