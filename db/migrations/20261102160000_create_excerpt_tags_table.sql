-- migrate:up
CREATE TABLE excerpt_tags (
  excerpt_id UUID NOT NULL REFERENCES excerpts (id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (excerpt_id, tag_id)
);

CREATE INDEX excerpt_tags_tag_id_idx ON excerpt_tags (tag_id);

-- migrate:down
DROP TABLE excerpt_tags;
