-- migrate:up
CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transcript_id UUID NOT NULL REFERENCES transcripts (id) ON DELETE CASCADE,
  ordinal INT NOT NULL,
  participant_id UUID REFERENCES participants (id),
  speaker_label TEXT NULL CHECK (speaker_label <> ''),
  TEXT TEXT NOT NULL,
  start_char INT NOT NULL,
  end_char INT NOT NULL,
  CHECK (
    start_char >= 0
    AND end_char > start_char
  ),
  start_time INTERVAL NULL,
  end_time INTERVAL NULL,
  CHECK (
    start_time >= INTERVAL '0'
    AND end_time >= start_time
  ),
  CHECK ((start_time IS NULL) = (end_time IS NULL)),
  UNIQUE (transcript_id, ordinal)
);

CREATE INDEX segments_participant_id_idx ON segments (participant_id);

CREATE TRIGGER segments_set_updated_at
BEFORE UPDATE ON segments FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- migrate:down
DROP TABLE segments;
