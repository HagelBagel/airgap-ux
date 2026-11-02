-- migrate:up
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name citext NOT NULL,
  description TEXT,
  UNIQUE (project_id, name)
);

CREATE TRIGGER tags_set_updated_at
BEFORE UPDATE ON tags FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- migrate:down
DROP TABLE tags;
