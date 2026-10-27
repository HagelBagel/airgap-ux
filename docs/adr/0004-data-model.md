# 0004: Data model for projects, transcripts and quotes

## Status

Accepted (2026-10-27). Migrations are written by hand from this ADR.

## Context

[0001](0001-hosted-first-own-api-and-eu-postgres.md) moves data into our own EU Postgres. Today a project lives only in the Pinia store's memory, so there is no data to migrate.

The app does four things with an uploaded transcript: researchers read it, tag passages, write insights that cite passages, and build job cards (AI-generated or manual) whose scores cite passages. Every one of these needs to point at "the exact quote". Today that link is weak: `Evidence` has no segment ID, and the worker matches quotes back to segments by word overlap. [0003](0003-in-browser-ai-analysis-behind-provider-interface.md) already requires evidence to reference segment IDs.

## Decision

### Ownership and access

A user owns projects, and everything else belongs to a project. Access control is `projects.owner_id = current user`. Shared projects (`project_members`) wait until someone needs them. Auth tables (credentials, sessions) are decided in the sign-in work, not here.

### Transcripts never change after upload

A transcript stores its `raw_text` and is parsed into segments once, on upload, on the server (as 0001 says). The server's segments are the ones that get stored; the client may run the same parser for a preview.

Segments, and therefore quotes, are never re-parsed or edited. A changed file is uploaded as a **new version** (`replaces_transcript_id`), and the old version keeps its quotes. On upload:

- same `content_hash` as an existing transcript in the project: warn that it is already uploaded;
- same filename, different hash: ask whether it is a new version or a separate transcript.

No diff is stored; both texts are kept, so a diff can be computed when needed. Moving quotes from an old version to a new one is a later feature.

### A quote is an excerpt: a segment plus offsets

`excerpts` is the one table for quotes. Tags, insights and job-card ratings link to excerpts through join tables, so one quote can back all three. An excerpt lies inside a single segment, so it always has exactly one speaker. The quote text is not stored; it is a substring of the segment text, which never changes.

### Speakers are participants

Each project has `participants` with a pseudonymous `label` ("P3") and an optional real `display_name`. Segments keep the `speaker_label` exactly as written in the file and point to a participant (null for text with no speaker).

### Scores are computed, with an optional override

`outcome_ratings` holds one importance/satisfaction rating per participant per job card. Averages, opportunity score and tension are computed from the ratings, not stored. The score sliders write `override_importance` / `override_satisfaction` on the job card, so the researcher's judgement sits next to the computed value and the AI's ratings stay intact for the grounding evals.

**Merging cards:** the primary card's rating for a participant wins; the merged card's excerpts are moved onto that rating, and its other ratings are moved to the primary card.

### Tables

Every table has `id uuid` primary key and `created_at` / `updated_at`, except the join tables (see below), which have a composite primary key and `created_at` only. Every foreign key cascades on delete, so deleting a user or project deletes everything under it.

| Table | Columns |
|---|---|
| `users` | `email` (citext, unique), `display_name` (null) |
| `projects` | `owner_id` → users, `name` |
| `participants` | `project_id`, `label` (unique per project), `display_name` (null, personal data), `role` (`participant` \| `interviewer`) |
| `transcripts` | `project_id`, `title`, `original_filename` (null), `raw_text`, `content_hash`, `source` (`upload`; later `transcription`), `replaces_transcript_id` (null), `interviewed_on` (date, null) |
| `segments` | `transcript_id`, `ordinal` (unique per transcript), `participant_id` (null), `speaker_label`, `text`, `start_char`, `end_char` (position in `raw_text`), `start_time`, `end_time` (null until transcription) |
| `excerpts` | `segment_id`, `start_offset`, `end_offset` (within segment text, start < end) |
| `tags` | `project_id`, `name` (unique per project), `description` (null) |
| `insights` | `project_id`, `title`, `body` |
| `job_cards` | `project_id`, `description`, `origin` (`ai` \| `manual`), `override_importance`, `override_satisfaction` (1–10, null) |
| `outcome_ratings` | `job_card_id`, `participant_id`, `importance`, `satisfaction` (1–10); unique per card and participant |
| `excerpt_tags` | `excerpt_id`, `tag_id` |
| `insight_excerpts` | `insight_id`, `excerpt_id` |
| `rating_excerpts` | `rating_id`, `excerpt_id` |

## Alternatives rejected

- **Re-parsing a changed transcript in place and patching offsets.** If the patching is wrong, a quote silently points at words the participant never said, which breaks grounding.
- **Storing only `raw_text`, with quotes as character offsets into it.** Simpler, but the speaker of a quote would have to be recomputed on every read.
- **A separate evidence table per feature.** Easier at first, but the same sentence would be stored once per tag, insight and card.
- **Storing averages and opportunity scores.** They drift from the ratings; today's `mergeCards` already averages averages without weighting by speaker count.
- **A UUID on join tables.** The pair of IDs already identifies the row. This is the one exception to 0001's "UUID on every table".

## Consequences

- The domain `Evidence` type needs a segment ID and offsets; the worker and `AnalysisProvider` must return them instead of free text.
- The parser runs on the server. If the API is not written in TypeScript, `parsePlainTextTranscript` must be ported and both versions kept in step.
- A `participants` table pseudonymises speakers, but `raw_text` and segment text still contain names and anything people say about themselves. Removing those is a separate privacy decision.
- `mergeCards` must follow the merge rule above.
- A transcription step (0002) fits in later: `source = 'transcription'` plus segment timestamps.
