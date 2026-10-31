-- migrate:up
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_name TEXT,
  email citext UNIQUE NOT NULL
);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- migrate:down
DROP TABLE users;
