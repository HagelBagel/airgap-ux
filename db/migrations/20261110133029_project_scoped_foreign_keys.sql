-- migrate:up

-- segments -> transcripts
-- Goal: a segment's project_id must equal its transcript's project_id.

-- 1. Parent: make (id, project_id) a valid target for a composite FK.
--    id is already unique, so this adds no new rule; Postgres just requires
--    a FK to point at columns that have a UNIQUE (or PRIMARY KEY) constraint.
ALTER TABLE transcripts
ADD CONSTRAINT transcripts_id_project_id_key UNIQUE (id, project_id);

-- 2. Child: add the column, copy the value from the parent, then require it.
--    Done in three steps so it also works on a table that already has rows.
ALTER TABLE segments
ADD COLUMN project_id UUID;

UPDATE segments
SET project_id = transcripts.project_id
FROM transcripts
WHERE transcripts.id = segments.transcript_id;

ALTER TABLE segments
ALTER COLUMN project_id SET NOT NULL;

-- 3. Child: point at the pair. Same delete rule as the old FK (CASCADE).
ALTER TABLE segments
ADD CONSTRAINT segments_transcript_id_project_id_fkey
FOREIGN KEY (transcript_id, project_id) REFERENCES transcripts (id, project_id) ON DELETE CASCADE;

-- 4. Child: the old single-column FK is now implied by the composite one.
ALTER TABLE segments
DROP CONSTRAINT segments_transcript_id_fkey;


-- segments -> participants
-- Goal: a segment's speaker must be a participant in the segment's own project.
-- segments.project_id already exists (added above), so there is no column to
-- add or backfill: we only reuse it in a second FK.

-- 1. Parent: make (id, project_id) a valid FK target (same reason as transcripts).
ALTER TABLE participants
ADD CONSTRAINT participants_id_project_id_key UNIQUE (id, project_id);

-- 2. Child: point at the pair.
--    No ON DELETE clause: like the old FK, it stays NO ACTION, so a participant
--    who still has segments can't be deleted (ADR 0004).
--    participant_id may be NULL (text with no speaker). With a NULL in the pair,
--    Postgres skips the check, which is what we want for those segments.
ALTER TABLE segments
ADD CONSTRAINT segments_participant_id_project_id_fkey
FOREIGN KEY (participant_id, project_id) REFERENCES participants (id, project_id);

-- 3. Child: drop the old single-column FK, now implied by the composite one.
ALTER TABLE segments
DROP CONSTRAINT segments_participant_id_fkey;


-- transcripts -> transcripts (replaces_transcript_id)
-- Goal: a new version must be in the same project as the version it replaces.
-- Same table on both sides; transcripts_id_project_id_key already exists.
-- ON DELETE SET NULL (replaces_transcript_id) nulls only that column. A plain
-- SET NULL would also null project_id, which is NOT NULL, so the delete would fail.
ALTER TABLE transcripts
ADD CONSTRAINT transcripts_replaces_transcript_id_project_id_fkey
FOREIGN KEY (replaces_transcript_id, project_id) REFERENCES transcripts (id, project_id)
ON DELETE SET NULL (replaces_transcript_id);

ALTER TABLE transcripts
DROP CONSTRAINT transcripts_replaces_transcript_id_fkey;


-- excerpts -> segments
-- Same shape as segments -> transcripts: new column, backfill, pair FK.
ALTER TABLE segments
ADD CONSTRAINT segments_id_project_id_key UNIQUE (id, project_id);

ALTER TABLE excerpts
ADD COLUMN project_id UUID;

UPDATE excerpts
SET project_id = segments.project_id
FROM segments
WHERE segments.id = excerpts.segment_id;

ALTER TABLE excerpts
ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE excerpts
ADD CONSTRAINT excerpts_segment_id_project_id_fkey
FOREIGN KEY (segment_id, project_id) REFERENCES segments (id, project_id) ON DELETE CASCADE;

ALTER TABLE excerpts
DROP CONSTRAINT excerpts_segment_id_fkey;


-- outcome_ratings -> job_cards, participants
-- New column (backfilled from the job card), then one pair FK per parent.
-- The participants FK means the rater must be in the job card's project.
ALTER TABLE job_cards
ADD CONSTRAINT job_cards_id_project_id_key UNIQUE (id, project_id);

ALTER TABLE outcome_ratings
ADD COLUMN project_id UUID;

UPDATE outcome_ratings
SET project_id = job_cards.project_id
FROM job_cards
WHERE job_cards.id = outcome_ratings.job_card_id;

ALTER TABLE outcome_ratings
ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE outcome_ratings
ADD CONSTRAINT outcome_ratings_job_card_id_project_id_fkey
FOREIGN KEY (job_card_id, project_id) REFERENCES job_cards (id, project_id) ON DELETE CASCADE;

ALTER TABLE outcome_ratings
ADD CONSTRAINT outcome_ratings_participant_id_project_id_fkey
FOREIGN KEY (participant_id, project_id) REFERENCES participants (id, project_id) ON DELETE CASCADE;

ALTER TABLE outcome_ratings
DROP CONSTRAINT outcome_ratings_job_card_id_fkey;

ALTER TABLE outcome_ratings
DROP CONSTRAINT outcome_ratings_participant_id_fkey;


-- excerpt_tags -> excerpts, tags
-- Join tables are only children. The backfill copies project_id from one
-- parent (excerpts); the two pair FKs then check that both parents agree.
ALTER TABLE excerpts
ADD CONSTRAINT excerpts_id_project_id_key UNIQUE (id, project_id);

ALTER TABLE tags
ADD CONSTRAINT tags_id_project_id_key UNIQUE (id, project_id);

ALTER TABLE excerpt_tags
ADD COLUMN project_id UUID;

UPDATE excerpt_tags
SET project_id = excerpts.project_id
FROM excerpts
WHERE excerpts.id = excerpt_tags.excerpt_id;

ALTER TABLE excerpt_tags
ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE excerpt_tags
ADD CONSTRAINT excerpt_tags_excerpt_id_project_id_fkey
FOREIGN KEY (excerpt_id, project_id) REFERENCES excerpts (id, project_id) ON DELETE CASCADE;

ALTER TABLE excerpt_tags
ADD CONSTRAINT excerpt_tags_tag_id_project_id_fkey
FOREIGN KEY (tag_id, project_id) REFERENCES tags (id, project_id) ON DELETE CASCADE;

ALTER TABLE excerpt_tags
DROP CONSTRAINT excerpt_tags_excerpt_id_fkey;

ALTER TABLE excerpt_tags
DROP CONSTRAINT excerpt_tags_tag_id_fkey;


-- insight_excerpts -> insights, excerpts
-- excerpts_id_project_id_key already exists (excerpt_tags block).
ALTER TABLE insights
ADD CONSTRAINT insights_id_project_id_key UNIQUE (id, project_id);

ALTER TABLE insight_excerpts
ADD COLUMN project_id UUID;

UPDATE insight_excerpts
SET project_id = insights.project_id
FROM insights
WHERE insights.id = insight_excerpts.insight_id;

ALTER TABLE insight_excerpts
ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE insight_excerpts
ADD CONSTRAINT insight_excerpts_insight_id_project_id_fkey
FOREIGN KEY (insight_id, project_id) REFERENCES insights (id, project_id) ON DELETE CASCADE;

ALTER TABLE insight_excerpts
ADD CONSTRAINT insight_excerpts_excerpt_id_project_id_fkey
FOREIGN KEY (excerpt_id, project_id) REFERENCES excerpts (id, project_id) ON DELETE CASCADE;

ALTER TABLE insight_excerpts
DROP CONSTRAINT insight_excerpts_insight_id_fkey;

ALTER TABLE insight_excerpts
DROP CONSTRAINT insight_excerpts_excerpt_id_fkey;


-- rating_excerpts -> outcome_ratings, excerpts
ALTER TABLE outcome_ratings
ADD CONSTRAINT outcome_ratings_id_project_id_key UNIQUE (id, project_id);

ALTER TABLE rating_excerpts
ADD COLUMN project_id UUID;

UPDATE rating_excerpts
SET project_id = outcome_ratings.project_id
FROM outcome_ratings
WHERE outcome_ratings.id = rating_excerpts.rating_id;

ALTER TABLE rating_excerpts
ALTER COLUMN project_id SET NOT NULL;

ALTER TABLE rating_excerpts
ADD CONSTRAINT rating_excerpts_rating_id_project_id_fkey
FOREIGN KEY (rating_id, project_id) REFERENCES outcome_ratings (id, project_id) ON DELETE CASCADE;

ALTER TABLE rating_excerpts
ADD CONSTRAINT rating_excerpts_excerpt_id_project_id_fkey
FOREIGN KEY (excerpt_id, project_id) REFERENCES excerpts (id, project_id) ON DELETE CASCADE;

ALTER TABLE rating_excerpts
DROP CONSTRAINT rating_excerpts_rating_id_fkey;

ALTER TABLE rating_excerpts
DROP CONSTRAINT rating_excerpts_excerpt_id_fkey;


-- migrate:down

-- Blocks in reverse order of the up section; steps in each block reversed too.

-- rating_excerpts -> outcome_ratings, excerpts
ALTER TABLE rating_excerpts
ADD CONSTRAINT rating_excerpts_excerpt_id_fkey
FOREIGN KEY (excerpt_id) REFERENCES excerpts (id) ON DELETE CASCADE;

ALTER TABLE rating_excerpts
ADD CONSTRAINT rating_excerpts_rating_id_fkey
FOREIGN KEY (rating_id) REFERENCES outcome_ratings (id) ON DELETE CASCADE;

ALTER TABLE rating_excerpts
DROP CONSTRAINT rating_excerpts_excerpt_id_project_id_fkey;

ALTER TABLE rating_excerpts
DROP CONSTRAINT rating_excerpts_rating_id_project_id_fkey;

ALTER TABLE rating_excerpts
DROP COLUMN project_id;

ALTER TABLE outcome_ratings
DROP CONSTRAINT outcome_ratings_id_project_id_key;

-- insight_excerpts -> insights, excerpts
ALTER TABLE insight_excerpts
ADD CONSTRAINT insight_excerpts_excerpt_id_fkey
FOREIGN KEY (excerpt_id) REFERENCES excerpts (id) ON DELETE CASCADE;

ALTER TABLE insight_excerpts
ADD CONSTRAINT insight_excerpts_insight_id_fkey
FOREIGN KEY (insight_id) REFERENCES insights (id) ON DELETE CASCADE;

ALTER TABLE insight_excerpts
DROP CONSTRAINT insight_excerpts_excerpt_id_project_id_fkey;

ALTER TABLE insight_excerpts
DROP CONSTRAINT insight_excerpts_insight_id_project_id_fkey;

ALTER TABLE insight_excerpts
DROP COLUMN project_id;

ALTER TABLE insights
DROP CONSTRAINT insights_id_project_id_key;

-- excerpt_tags -> excerpts, tags
ALTER TABLE excerpt_tags
ADD CONSTRAINT excerpt_tags_tag_id_fkey
FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE;

ALTER TABLE excerpt_tags
ADD CONSTRAINT excerpt_tags_excerpt_id_fkey
FOREIGN KEY (excerpt_id) REFERENCES excerpts (id) ON DELETE CASCADE;

ALTER TABLE excerpt_tags
DROP CONSTRAINT excerpt_tags_tag_id_project_id_fkey;

ALTER TABLE excerpt_tags
DROP CONSTRAINT excerpt_tags_excerpt_id_project_id_fkey;

ALTER TABLE excerpt_tags
DROP COLUMN project_id;

ALTER TABLE tags
DROP CONSTRAINT tags_id_project_id_key;

ALTER TABLE excerpts
DROP CONSTRAINT excerpts_id_project_id_key;

-- outcome_ratings -> job_cards, participants
ALTER TABLE outcome_ratings
ADD CONSTRAINT outcome_ratings_participant_id_fkey
FOREIGN KEY (participant_id) REFERENCES participants (id) ON DELETE CASCADE;

ALTER TABLE outcome_ratings
ADD CONSTRAINT outcome_ratings_job_card_id_fkey
FOREIGN KEY (job_card_id) REFERENCES job_cards (id) ON DELETE CASCADE;

ALTER TABLE outcome_ratings
DROP CONSTRAINT outcome_ratings_participant_id_project_id_fkey;

ALTER TABLE outcome_ratings
DROP CONSTRAINT outcome_ratings_job_card_id_project_id_fkey;

ALTER TABLE outcome_ratings
DROP COLUMN project_id;

ALTER TABLE job_cards
DROP CONSTRAINT job_cards_id_project_id_key;

-- excerpts -> segments
ALTER TABLE excerpts
ADD CONSTRAINT excerpts_segment_id_fkey
FOREIGN KEY (segment_id) REFERENCES segments (id) ON DELETE CASCADE;

ALTER TABLE excerpts
DROP CONSTRAINT excerpts_segment_id_project_id_fkey;

ALTER TABLE excerpts
DROP COLUMN project_id;

ALTER TABLE segments
DROP CONSTRAINT segments_id_project_id_key;

-- transcripts -> transcripts (replaces_transcript_id)
ALTER TABLE transcripts
ADD CONSTRAINT transcripts_replaces_transcript_id_fkey
FOREIGN KEY (replaces_transcript_id) REFERENCES transcripts (id) ON DELETE SET NULL;

ALTER TABLE transcripts
DROP CONSTRAINT transcripts_replaces_transcript_id_project_id_fkey;

-- segments -> participants
ALTER TABLE segments
ADD CONSTRAINT segments_participant_id_fkey
FOREIGN KEY (participant_id) REFERENCES participants (id);

ALTER TABLE segments
DROP CONSTRAINT segments_participant_id_project_id_fkey;

ALTER TABLE participants
DROP CONSTRAINT participants_id_project_id_key;

-- segments -> transcripts
ALTER TABLE segments
ADD CONSTRAINT segments_transcript_id_fkey
FOREIGN KEY (transcript_id) REFERENCES transcripts (id) ON DELETE CASCADE;

ALTER TABLE segments
DROP CONSTRAINT segments_transcript_id_project_id_fkey;

ALTER TABLE segments
DROP COLUMN project_id;

ALTER TABLE transcripts
DROP CONSTRAINT transcripts_id_project_id_key;
