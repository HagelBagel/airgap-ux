# Migration summary (ADR 0004)

Summary of the hand-written dbmate migrations in `db/migrations/` for the data model in [ADR 0004](../docs/adr/0004-data-model.md), written on branch `chore/hfp-003-local-postgres` (2026-11-02), with the most important design decisions.

## Conventions used in every migration

- **Entity tables** all start with `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at` and `updated_at`.
  - Each has a `<table>_set_updated_at` trigger that keeps `updated_at` current.
  - UUIDs instead of serial numbers mean IDs can't be guessed or counted, and the client can create them.
- **Join tables** have a composite primary key and `created_at` only. A row just says "these two are linked", so there's nothing to update.
- **Allowed values are listed in a `CHECK`, not an enum** (`role`, `source`, `origin`). Adding or removing a value later just means replacing the constraint. Removing a value from a Postgres enum is awkward.
- **Optional text** is `TEXT NULL CHECK (col <> '')`. That gives one way to say "no value" (NULL) instead of two (NULL or `''`).
- **Index every foreign key column, unless a `UNIQUE` or primary key already starts with it.** Postgres doesn't index foreign keys automatically. Without an index, every cascading delete scans the whole child table.
- **Index names** follow `<table>_<cols>_idx`.

## The migrations

| Migration | What it holds | Key decisions |
|---|---|---|
| **setup** | `citext` extension, `set_updated_at()` function | Shared by every later table |
| **users** | `email`, `display_name` | `email` is `citext UNIQUE`, so `Bob@x.dk` and `bob@x.dk` count as one user |
| **projects** | `owner_id`, `name` | `owner_id` points to `users.id`, not `display_name`: a foreign key needs a stable unique key. It cascades and has its own index. Access control is `owner_id = current user` |
| **participants** | `label`, `display_name`, `role` | `UNIQUE (project_id, label)`: "P3" is unique per project, not across the whole database. `label` is `citext`. `display_name` holds personal data and is optional |
| **transcripts** | `raw_text`, `content_hash`, `replaces_transcript_id`, … | See "Transcripts never change" below. `CHECK (replaces_transcript_id <> id)` stops a transcript replacing itself. The index on `(project_id, content_hash)` finds duplicate uploads quickly |
| **tags** | `name`, `description` | `UNIQUE (project_id, name)`, case-insensitive through `citext` |
| **insights** | `title`, `body` | A plain project child with an index on `project_id` |
| **job_cards** | `description`, `origin`, `override_*` | Overrides are `SMALLINT NULL CHECK (1–10)`. NULL means "use the computed score" |
| **segments** | `ordinal`, `participant_id`, `speaker_label`, `text`, char/time ranges | See the next sections |
| **outcome_ratings** | `importance`, `satisfaction` | `UNIQUE (job_card_id, participant_id)`: one rating per participant per card. Ratings are `SMALLINT`, not float |
| **excerpts** | `segment_id`, `start_offset`, `end_offset` | `UNIQUE (segment_id, start_offset, end_offset)`, so the same quote is stored once and shared |
| **excerpt_tags / insight_excerpts / rating_excerpts** | the two IDs being linked | The composite primary key prevents duplicate links. An extra index on the second column makes lookups and cascades work from both sides |

## The most important design decisions

### 1. Transcripts never change

Segments and quotes are never edited or re-parsed. A changed file becomes a **new version** pointing to the old one with `replaces_transcript_id`. That column is the first exception to "everything cascades": it uses `ON DELETE SET NULL`, because with `CASCADE`, deleting an old version would also delete every newer version. You can't combine `SET NULL` with `NOT NULL`, which is why the column is nullable.

### 2. Deleting a participant is blocked (`NO ACTION`)

This is the second cascade exception:

- **`CASCADE`** would delete that participant's segments, cutting holes in a transcript that is supposed to be immutable, and deleting every quote in them.
- **`SET NULL`** would keep the text but lose who said it, and scores must stay attributable to a speaker.
- **`NO ACTION`** forces a merge: move the participant's segments to another participant first, then delete.

Deleting a whole project still works. `NO ACTION` is checked at the end of the statement, and by then the segments are gone too. Both exceptions are recorded in the ADR.

### 3. A quote is an excerpt: one segment plus offsets

- **The quote text is not stored.** It's a substring of segment text that never changes, so it can't drift out of sync.
- **An excerpt lies inside one segment**, so it always has exactly one speaker.
- **One excerpt backs tags, insights and ratings** through the join tables, rather than storing the same sentence three times.

### 4. Ranges are checked inside the row, plus one rule the database can't check

- `start >= 0 AND end > start` is enforced by a `CHECK` on `segments` (chars and times) and on `excerpts`.
- Timestamps are either both set or both NULL: `(start_time IS NULL) = (end_time IS NULL)`. A `CHECK` that evaluates to NULL counts as passing, so this needs its own rule.
- Times are `INTERVAL` (a position in the recording), not `TIMESTAMPTZ` (a moment on the calendar).
- **The API must check** that `end_offset <= length(segment.text)`, because a `CHECK` can't read another table.

### 5. Scores are computed, not stored

`outcome_ratings` stores the raw ratings. Averages, opportunity score and tension are computed when they're read, so they can never drift from the ratings. The researcher's sliders write `override_*` on the job card, leaving the AI's ratings intact for the evaluations. `SMALLINT` keeps the 1–10 scale exact. If decimals are ever needed, use `NUMERIC(3,1)`, not float.

### 6. Rules the API has to enforce

- **Same-project integrity:** a rating's participant and its job card, or a tag and its excerpt, must belong to the same project. The database could enforce it, but only with composite foreign keys, which we postponed.
- **Card merges:** move a rating's excerpts with `INSERT ... ON CONFLICT DO NOTHING` and then delete the old rows. A plain `UPDATE` fails with a duplicate-key error if both ratings already cite the same excerpt.
- **Excerpt bounds:** see point 4.

### 7. Privacy

- Personal data is limited to `users.email`, `users.display_name` and `participants.display_name`, plus whatever people say in `raw_text` and segment text.
- Deleting a user or project cascades through everything, so their data can actually be deleted.
- Scrubbing names from the transcript text itself is a separate privacy decision the ADR leaves open.
