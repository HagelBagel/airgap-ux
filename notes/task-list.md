## Hosted-first pivot (ADRs 0001-0003)

- [x] Record decisions as ADRs 0001-0003 and update CLAUDE.md
- [x] Remove audio/video transcription code and deps (ADR 0002)
- [x] Make `SpeakerSegment` timestamps optional; add plain-text transcript parser (HFP-001, #16)
- [x] Draft Postgres schema (users, projects, transcripts, segments, tags, insights, evidence); settles where parsing runs and how evidence references segments (HFP-002, ADR 0004)
- [x] Choose migration tool (suggested: dbmate) and local Postgres setup (suggested: Docker `postgres:17`)
- [x] Write Postgres migrations from ADR 0004 (owner writes these by hand; Claude reviews)
- [ ] Rework `FileDropzone` (still audio/video only, currently unused) for transcript upload and wire it into the dashboard
- [ ] Introduce `AnalysisProvider` interface around the in-browser worker (ADR 0003)
- [ ] Choose EU host for API + Postgres
- [ ] Scaffold own API with SQL migrations
- [x] Remove vault flow (HomeView, VaultSelector, requiresVault); `/` opens the dashboard. Code archived at tag `archive/vault-flow` (HFP-004, #22)
- [ ] Project list backed by the API (HFP-005), then sign-in
  - [x] Server plumbing, app UI, tests, ADR 0005 draft (Claude, 2026-11-06)
  - [x] Owner: write the three SQL statements in `server/src/projects/queries.ts` (list, create, delete; each scoped by `owner_id`, placeholders described in the comments)
  - [x] Owner: write `db/seed.sql` inserting the dev User with id `00000000-0000-4000-8000-000000000001` (= `DEV_USER_ID` in `.env`), optionally a sample Project. Make it safe to run twice (e.g. `ON CONFLICT DO NOTHING`)
  - [x] Owner: write the migration `npx dbmate new projects_name_check` adding `CHECK (char_length(btrim(name)) BETWEEN 1 AND 200)` on `projects.name`
  - [x] Run it all, from the repo root (Docker running):
    ```bash
    docker compose up -d --wait     # Postgres
    npx dbmate up                   # migrate the dev database (also updates db/schema.sql)
    npm run db:test:prepare         # create/migrate airgap_test; re-run after each new migration
    cd server
    npm test                        # 29 tests; on 2026-11-06, 9 failed waiting on the steps above
    npm run seed                    # insert the dev User
    npm run dev                     # API on http://127.0.0.1:3001/api
    ```
    Then `npm run dev` at the root and open the app: create a Project, open it, go back.
  - [x] Accept ADR 0005 (change status from Proposed), tick this item, open the PR (`Closes #24`)
- [ ] Add a way to delete a Project in the UI (found 2026-11-09 in HFP-005). `DELETE /api/projects/:id` exists and is tested, but the project list has no delete action and `projectsApi` has no delete call. The delete cascades to transcripts, segments and excerpts, so it needs a confirmation step
- [ ] Update notes/project-brief.md to the new scope
- [ ] Create root `GLOSSARY.md` (referenced by CLAUDE.md and `docs/agents/domain.md`, but missing): project, transcript, segment, speaker, tag, insight, evidence, job card, desired outcome, opportunity score, tension
- [ ] Add segment ID + offsets to the domain `Evidence` type; worker returns them instead of word-overlap matching (ADR 0004)
- [ ] Rework `mergeCards` to ADR 0004's merge rule (primary card's rating per participant wins) and compute averages from ratings, not from card averages
- [ ] Later: move excerpts from an old transcript version to a new one (re-anchor by exact text, flag misses for review)
- [ ] Block 2: decide whether to remove participant names from `raw_text` / segment text on upload (ADR 0004 consequence)

## Rename to AirGap UX, drop brand names (found 2026-10-31)

The app is called **AirGap UX**, not "Sovereign JTBD", and must not use the brand names "Strategyn" or "ODI" (use "opportunity score" instead). The README is already done. Do this on its own `chore/` branch.

- [x] Rename the package `sovereign-jtbd` in `package.json` / `package-lock.json`, and the app title in `index.html`
- [x] Rename `src/domain/strategyn/` and update its imports; remove "Strategyn"/"ODI" from code, comments and UI text (`types.ts`, `ai.worker.ts`, `messages.ts`, `useResearchStore.ts` + spec, `mockData.ts`, `JobCard.vue`, `ProcessingStatus.vue`, `ResearchDashboard.vue`, `tokens.css`)
- [x] Rename the local DB user/name `sovereign` in `compose.yaml`, `.env` (`DATABASE_URL`) and the README `psql` command. Needs `docker compose down -v`, which wipes the local database
- [x] Update `CLAUDE.md`, `.github/prompts/system.prompt.md` and `notes/project-brief.md`; leave dated history (`progress.md`, `market-research.md`) as is

## Pre-existing breakages (found 2026-10-26)

- [x] Fix `ResearchWorkbench.vue` import of `./JobCardsTable.vue` (restored the pre-`a6876f9` component)
- [ ] Fix `vue-tsc -b` error: `test` key rejected in `vite.config.ts` (the `showDirectoryPicker` error went away with the vault code in HFP-004)
- [ ] Resolve `vite-plugin-pwa` peer conflict with Vite 8 (npm needs `--legacy-peer-deps`)
- [ ] Upgrade the frontend from Vitest 4 to Vitest 5 so it matches `server/` (found 2026-11-06 in HFP-005). Check `.windsurf/skills/vitest-4-reference.md` and the write-unit-test skill for anything version-specific

## ResearchWorkbench follow-ups (found 2026-10-26)

- [ ] Remove `v-html` from transcript rendering: transcript and evidence text are inserted as raw HTML (XSS risk once researchers upload transcripts). Render highlights as text nodes instead
- [ ] Make the "Create Card" floating menu keyboard-accessible (currently mouse-selection only; WCAG 2.2 AA)
- [ ] Replace hard-coded colours in `ResearchWorkbench.vue` with tokens from `src/styles/tokens.css`
- [ ] Decide whether to bring back the "Desired Outcomes / N outcomes" heading that the stub in `a6876f9` added

## Analysis re-entry bug (found 2026-11-05)

Calling `analyzeSegments` again before `MODELS_READY` arrives (`src/stores/useResearchStore.ts:137`) causes, without any error:
- the first call's segments are lost, because `pendingSegments` holds one array and is overwritten
- `LOAD_MODELS` is posted again, because `modelsReady` is still false. The worker's `onmessage` is async, so both `pipeline()` loads run at once: two copies of the model in memory, `llm` overwritten by whichever finishes last, and two `PROGRESS` streams interleaved (the progress bar can jump backwards)
- the second `MODELS_READY` finds `pendingSegments` empty and does nothing
- the second call's `projectName` is ignored, because `ensureProject()` keeps the existing project

Mock mode hides it. It isn't reachable from the UI today (the sample button is only shown while `processingStage` is `idle`), but it will be once transcript upload exists.

- [ ] Decide what a second call while analysis is in flight should do: ignore it, queue it, or cancel the first run. Decide this as part of the `AnalysisProvider` interface (ADR 0003) rather than patching the store
- [ ] Track model loading separately from "ready" (e.g. a `loading | ready` state, or one shared load promise) so `LOAD_MODELS` is sent at most once per worker
- [ ] Add a store test: two `analyzeSegments` calls before `MODELS_READY` → exactly one `LOAD_MODELS` posted, and a defined outcome for both sets of segments

## Stale job card sliders after a merge (found 2026-11-05)

`JobCard.vue:26–27` sets up its slider state once, from the prop: `localImportance = ref(Math.round(props.card.averageImportance))` (same for satisfaction). That copies the value when the card first appears. Nothing in the file uses `watch` on `props.card`, so later changes to the card don't reach the sliders.

`mergeCards` (`src/stores/useResearchStore.ts:323–324`) changes the primary card's averages but keeps its `id`. `JobCardsTable.vue:65–66` keys cards by `card.id`, so Vue reuses the same `JobCard` component. The sliders and the live score (`displayScore`, `JobCard.vue:32`) keep showing the old values while the store holds the new averages. No error appears. Touching a slider then sends the stale value back through `updateCardScore` and overwrites the merged average.

The same applies to any other change to a card's averages that doesn't come from its own sliders (e.g. a future reload from the API).

- [ ] Keep the sliders in sync with the prop: `watch` `props.card.averageImportance` / `averageSatisfaction` and reset the local refs (keeping the debounce for the user's own dragging)
- [ ] Add a component test: mount `JobCard`, change the card's averages from outside, and expect the sliders to show the new values
- [ ] Related: `currentProject` is returned writable from the store, "so components can bind sliders" (`useResearchStore.ts:377`), but the sliders use `updateCardScore`. Make it `readonly` like the rest so every change goes through an action, which is where API saving will go

## LPM-001: Select a Vault Folder

Superseded by ADR 0001. The vault flow was removed in HFP-004 (#22); the code is archived at tag `archive/vault-flow`.

- [x] LPM-001: Add "Select Vault" UI action
- [x] LPM-001: Open native directory picker on action
- [x] LPM-001: Request read/write access to selected folder
- [x] LPM-001: Register selected folder as active vault
- [x] LPM-001: Make HomeView the app entry point and gate /dashboard behind vault selection
- [ ] ~~LPM-001: Store vault directory handle in IndexedDB~~ (dropped: superseded by ADR 0001)
- [ ] ~~LPM-001: Ensure vault contents are never uploaded to server~~ (dropped: superseded by ADR 0001)

00004 - Bug: still cannot hear processed audio (dropped)

DONE 00003 - Add audio processing step to todo list

DONE 00002 - Make media player more compact (maybe resizable?) and remove temp gain slider

DONE 00001 - Update existing unit tests


