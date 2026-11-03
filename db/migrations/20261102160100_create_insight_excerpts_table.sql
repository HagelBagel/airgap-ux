-- migrate:up
CREATE TABLE insight_excerpts (
  insight_id UUID NOT NULL REFERENCES insights (id) ON DELETE CASCADE,
  excerpt_id UUID NOT NULL REFERENCES excerpts (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (insight_id, excerpt_id)
);

CREATE INDEX insight_excerpts_excerpt_id_idx ON insight_excerpts (excerpt_id);

-- migrate:down
DROP TABLE insight_excerpts;
