-- migrate:up
CREATE TABLE job_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('ai', 'manual')),
  override_importance SMALLINT NULL CHECK (override_importance BETWEEN 1 AND 10),
  override_satisfaction SMALLINT NULL CHECK (override_satisfaction BETWEEN 1 AND 10)
);

CREATE INDEX job_cards_project_id_idx ON job_cards (project_id);

CREATE TRIGGER job_cards_set_updated_at
BEFORE UPDATE ON job_cards FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- migrate:down
DROP TABLE job_cards;
