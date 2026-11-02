-- migrate:up
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_filename TEXT NULL,
  raw_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('upload')),
  replaces_transcript_id UUID NULL REFERENCES transcripts (id) ON DELETE SET NULL,
  interviewed_on date NULL,
  CHECK (replaces_transcript_id <> id)
);

CREATE INDEX transcripts_project_id_content_hash_idx ON transcripts (project_id, content_hash);

CREATE TRIGGER transcripts_set_updated_at
BEFORE UPDATE ON transcripts FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- migrate:down
DROP TABLE transcripts;
