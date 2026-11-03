-- migrate:up
CREATE TABLE rating_excerpts (
  rating_id UUID NOT NULL REFERENCES outcome_ratings (id) ON DELETE CASCADE,
  excerpt_id UUID NOT NULL REFERENCES excerpts (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (rating_id, excerpt_id)
);

CREATE INDEX rating_excerpts_excerpt_id_idx ON rating_excerpts (excerpt_id);

-- migrate:down
DROP TABLE rating_excerpts;
