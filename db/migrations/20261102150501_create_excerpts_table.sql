-- migrate:up
CREATE TABLE excerpts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  segment_id UUID NOT NULL REFERENCES segments (id) ON DELETE CASCADE,
  start_offset INT NOT NULL,
  end_offset INT NOT NULL,
  CHECK (
    start_offset >= 0
    AND end_offset > start_offset
  ),
  UNIQUE (segment_id, start_offset, end_offset)
);

CREATE TRIGGER excerpts_set_updated_at
BEFORE UPDATE ON excerpts FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- migrate:down
DROP TABLE excerpts;
