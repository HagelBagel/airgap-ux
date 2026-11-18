# HFP roadmap: what to work on next

## Task

Overview of the open hosted-first work, ordered by what blocks what. The child issues are listed below. Pick the first open, unblocked one in the track you feel like working on. Close this issue when they're all done, or replace it with the next roadmap.

Blocking is set with GitHub's issue dependencies ("Blocked by" on each issue). An issue is ready when all its blockers are closed.

## Track A: transcript upload (in order)

1. #31 HFP-008: Project delete fails once a Participant has Segments (bug, migration)
2. #32 HFP-009: render transcript highlights without `v-html` (XSS)
3. #33 HFP-010: decision on participant names in transcript text
4. #34 HFP-011: upload a plain-text transcript. Blocked by #31, #32, #33

## Track B: analysis (can run alongside A)

5. #35 HFP-012: `AnalysisProvider` interface (ADR 0003)
6. #36 HFP-013: analysis started twice before the model is ready. Blocked by #35
7. #37 HFP-014: evidence points at a segment and offsets. Blocked by #34, #35
8. #38 HFP-015: merge job cards by ADR 0004's rule. Blocked by #37
9. #39 HFP-016: move excerpts to a new transcript version (later). Blocked by #34, #37

## Standalone (no blockers, good for a short session)

- #40 HFP-017: job card sliders show stale values after a merge
- #41 HFP-018: upgrade the frontend to Vitest 5
- #42 HFP-019: resolve the `vite-plugin-pwa` peer conflict
- #43 HFP-020: fill in `GLOSSARY.md` (best before HFP-011)
- #44 HFP-021: update the project brief
- #45 HFP-022: create a job card from the keyboard
- #46 HFP-023: ResearchWorkbench colour tokens and results heading

## Decisions (no code blocked yet)

- #47 HFP-024: EU host for the API and Postgres (before any real user data)
- #48 HFP-025: sign-in

## Source

Planning ID: HFP-roadmap (issue #30)
