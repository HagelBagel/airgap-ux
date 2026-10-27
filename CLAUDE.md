# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sovereign JTBD (package name `sovereign-jtbd`): a Vue 3 app for UX researchers. Researchers sign in, upload interview transcripts (text), tag them, link insights to quotes, and run Jobs-to-be-Done analysis with a small LLM in the browser. Outcomes are scored with the Strategyn/ODI Opportunity formula. Product context: `notes/project-brief.md`; story backlog: `notes/epics/user-stories.md`.

**Direction (2026-10-26):** the app is moving from local-first and air-gapped to **hosted first with our own API and Postgres in the EU**. Read `docs/adr/` before designing anything:
- `0001`: hosted first, own API + EU Postgres (supersedes the vault ADR `notes/epics/adr.md`)
- `0002`: audio/video transcription deferred; the code is archived at tag `archive/audio-transcription` and removed from `main`
- `0003`: AI analysis runs in the browser behind an `AnalysisProvider` interface; a server-side provider may come later
- `0004`: data model. Transcripts never change after upload; quotes are excerpts (segment + offsets) shared by tags, insights and job-card ratings; scores are computed from ratings. The owner writes the migrations by hand, so review them rather than writing them

The Architecture section below describes the code **as it is today**, including the vault parts that are on their way out. Don't build new features on them.

## Commands

```bash
npm run dev            # Vite dev server
npm run build          # vue-tsc -b && vite build
npm test               # vitest run (all *.spec.ts)
npx vitest run src/components/VaultSelector.spec.ts   # single test file
npx vitest run -t "test name"                          # single test by name
npm run type-check     # vue-tsc --noEmit
npm run lint-check     # eslint src/ --max-warnings 0
npm run code-quality   # type-check + lint + test (run before committing)
```

- ESLint (`eslint.config.js`, flat config) **ignores all `.vue` files**; only `vue-tsc` checks SFCs. Browser globals must be listed explicitly in `eslint.config.js` (`no-undef` is off, but add new globals there when introducing them).
- Tests use **jsdom** with Vitest globals (configured in `vite.config.ts`). `.github/prompts/system.prompt.md` names Vitest Browser Mode as the target, but do not switch environments without discussing it first.
- `VITE_MOCK_MODE=true` (in `.env`) makes the worker return canned data instantly with no model download or GPU; read via `src/featureFlags.ts` (`MOCK_MODE`). Default is real inference.

## Architecture

**Main thread ↔ worker bridge.** All transformers.js inference runs in `src/workers/ai.worker.ts`. `src/stores/useResearchStore.ts` (the main Pinia store) creates the worker once (`initWorker`), posts typed messages, and applies results to state. The message contract lives in `src/workers/messages.ts`: inbound `LOAD_MODELS` / `RUN_STRATEGYN_ANALYSIS`, outbound `PROGRESS` / `MODELS_READY` / `ANALYSIS_COMPLETE` / `ERROR`. Every message carries `mockMode`. The worker must never import Vue or Pinia; when you add a message, update `messages.ts` and handle it on both sides. The entry point is `analyzeSegments(segments, projectName)`; the store queues segments that arrive before `MODELS_READY`. Mock transcript and job cards live in `src/services/ai/mockData.ts`. There is no transcript import yet: in Mock Mode the dashboard offers "Analyse sample transcript".

**Models.** `onnx-community/Qwen2.5-0.5B-Instruct`, cached in the browser Cache API after the first load. Model IDs are duplicated in the worker and in `src/services/ai/transformersRuntime.ts` (`MODEL_IDS`); keep both in sync. `configureTransformersRuntime()` runs in `main.ts` before anything else. The worker throttles `PROGRESS` posts (3% threshold). Analysis falls back to deterministic extraction when the LLM output isn't valid JSON (`usedFallback`).

**Domain logic** (`src/domain/strategyn/`) is pure and framework-free: `opportunityScore.ts` implements `Importance + max(Importance − Satisfaction, 0)` (required test cases: I=1,S=10 → 1; I=10,S=1 → 19). `variance.ts` averages multi-speaker outcomes and flags "tension" when Satisfaction differs by more than 3 between speakers. Shared types are in `src/domain/types.ts`.

**Routing / vault.** Hash-history router (`src/router/index.ts`). `/` is `HomeView` (vault selection); `/dashboard` has `meta.requiresVault` and redirects to `/` unless `useVaultStore().activeVault` is set. The vault uses the File System Access API (`showDirectoryPicker({ mode: 'readwrite' })`).

**Placeholders.** `src/stores/processing.ts`, `src/stores/researchProject.ts`, `src/services/storage/indexedDb.ts`, and `src/services/storage/repositories.ts` are empty scaffold files. IndexedDB persistence (`idb`) is not wired up yet. `vite-plugin-pwa` is installed but not configured in `vite.config.ts`.

## Hard constraints

From `.github/prompts/system.prompt.md`, `.windsurf/skills/implement-feature/SKILL.md` and `docs/adr/`. Where those older prompt files still say "air-gapped" or "no cloud", the ADRs win.

- **Privacy / personal data:** data is stored only in our own API and Postgres, hosted in the EU. No third-party analytics, trackers or cloud AI APIs. Collect only what a feature needs, document new personal data before shipping it, and make sure a user's or project's data can actually be deleted.
- **AI work** runs in the browser in Web Workers, behind the `AnalysisProvider` interface (ADR 0003). Transcript text is never sent to a model provider. Load models with `dtype: 'fp16'` or quantized, and show progress state during download/warm-up.
- **Vue:** Composition API with `<script setup lang="ts">` only. **Pinia** setup-style stores (`defineStore('id', () => {...})`) for shared state.
- **Styling:** scoped CSS only, using native CSS nesting and custom properties (tokens in `src/styles/tokens.css`), with BEM / component-first class names. **No Tailwind** or other utility frameworks.
- **Job-card scores** must always carry Evidence (quotes linked to transcript segments) so a human can verify them.
- **Tests:** co-locate them as `*.spec.ts`. Mock transformers pipelines; never download real models in tests. Test worker communication with `postMessage` mocks. Test style guidance: `.windsurf/skills/write-unit-test/SKILL.md` (Vitest 4 notes in `.windsurf/skills/vitest-4-reference.md`).

## Workflow conventions

- Branches: `<type>/<planning-id>-<short-slug>` (e.g. `feat/lpm-001-select-vault-action`; types `feat` / `fix` / `chore`). Branch from a clean, up-to-date `main`. Propose the `git checkout -b` command for approval before running it.
- Commits: `feat(lpm-001-a): ...`. PRs target `main`, and the body references the issue (`Closes #N`). Issue drafts live in `.github/generated-issues/`.
- Before implementing, read the issue's acceptance criteria and the relevant ADRs in `docs/adr/`. Outline tests before writing code.
- After implementing a feature, append a dated entry to `notes/progress.md` (files changed, key decisions, next steps) and tick the matching item in `notes/task-list.md`.
- Don't implement follow-on work you discover along the way on the same branch. Add it to `notes/task-list.md` and raise it with the user.

## Agent skills

### Issue tracker

GitHub Issues on `HagelBagel/airgap-ux` via `gh`; drafts go in `.github/generated-issues/` first. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/` (the legacy vault ADR at `notes/epics/adr.md` is superseded by ADR 0001). See `docs/agents/domain.md`.
