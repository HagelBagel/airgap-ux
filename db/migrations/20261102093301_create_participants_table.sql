-- migrate:up
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  label citext NOT NULL,
  display_name TEXT NULL,
  role TEXT NOT NULL CHECK (role IN ('participant', 'interviewer')),
  UNIQUE (project_id, label)
);

CREATE TRIGGER participants_set_updated_at
BEFORE UPDATE ON participants FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- migrate:down
DROP TABLE participants;
