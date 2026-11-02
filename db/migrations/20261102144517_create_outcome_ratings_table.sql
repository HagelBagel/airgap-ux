-- migrate:up
CREATE TABLE outcome_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  job_card_id UUID NOT NULL REFERENCES job_cards (id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  importance SMALLINT NOT NULL CHECK (importance BETWEEN 1 AND 10),
  satisfaction SMALLINT NOT NULL CHECK (satisfaction BETWEEN 1 AND 10),
  UNIQUE (job_card_id, participant_id)
);

CREATE INDEX outcome_ratings_participant_id_idx ON outcome_ratings (participant_id);

CREATE TRIGGER outcome_ratings_set_updated_at
BEFORE UPDATE ON outcome_ratings FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- migrate:down
DROP TABLE outcome_ratings;
