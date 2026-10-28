## Hosted-first pivot (ADRs 0001-0003)

- [x] Record decisions as ADRs 0001-0003 and update CLAUDE.md
- [x] Remove audio/video transcription code and deps (ADR 0002)
- [x] Make `SpeakerSegment` timestamps optional; add plain-text transcript parser (HFP-001, #16)
- [x] Draft Postgres schema (users, projects, transcripts, segments, tags, insights, evidence); settles where parsing runs and how evidence references segments (HFP-002, ADR 0004)
- [x] Choose migration tool (suggested: dbmate) and local Postgres setup (suggested: Docker `postgres:17`)
- [ ] Write Postgres migrations from ADR 0004 (owner writes these by hand; Claude reviews)
- [ ] Rework `FileDropzone` (still audio/video only, currently unused) for transcript upload and wire it into the dashboard
- [ ] Introduce `AnalysisProvider` interface around the in-browser worker (ADR 0003)
- [ ] Choose EU host for API + Postgres
- [ ] Scaffold own API with SQL migrations
- [ ] Replace vault flow (HomeView, VaultSelector, requiresVault) with sign-in + project list
- [ ] Update notes/project-brief.md to the new scope
- [ ] Create root `GLOSSARY.md` (referenced by CLAUDE.md and `docs/agents/domain.md`, but missing): project, transcript, segment, speaker, tag, insight, evidence, job card, desired outcome, opportunity score, tension
- [ ] Add segment ID + offsets to the domain `Evidence` type; worker returns them instead of word-overlap matching (ADR 0004)
- [ ] Rework `mergeCards` to ADR 0004's merge rule (primary card's rating per participant wins) and compute averages from ratings, not from card averages
- [ ] Later: move excerpts from an old transcript version to a new one (re-anchor by exact text, flag misses for review)
- [ ] Block 2: decide whether to remove participant names from `raw_text` / segment text on upload (ADR 0004 consequence)

## Pre-existing breakages (found 2026-10-26)

- [x] Fix `ResearchWorkbench.vue` import of `./JobCardsTable.vue` (restored the pre-`a6876f9` component)
- [ ] Fix `vue-tsc -b` errors: `window.showDirectoryPicker` untyped in `src/stores/vault.ts`; `test` key rejected in `vite.config.ts`
- [ ] Resolve `vite-plugin-pwa` peer conflict with Vite 8 (npm needs `--legacy-peer-deps`)

## ResearchWorkbench follow-ups (found 2026-10-26)

- [ ] Remove `v-html` from transcript rendering: transcript and evidence text are inserted as raw HTML (XSS risk once researchers upload transcripts). Render highlights as text nodes instead
- [ ] Make the "Create Card" floating menu keyboard-accessible (currently mouse-selection only; WCAG 2.2 AA)
- [ ] Replace hard-coded colours in `ResearchWorkbench.vue` with tokens from `src/styles/tokens.css`
- [ ] Decide whether to bring back the "Desired Outcomes / N outcomes" heading that the stub in `a6876f9` added

## LPM-001: Select a Vault Folder

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


