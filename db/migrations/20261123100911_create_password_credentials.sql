-- migrate:up
CREATE TABLE password_credentials (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT password_hash_is_argon2id_check CHECK (password_hash LIKE '$argon2id$%')
);

CREATE TRIGGER password_credentials_set_updated_at
BEFORE UPDATE ON password_credentials FOR EACH ROW
EXECUTE FUNCTION set_updated_at ();

-- migrate:down
DROP TABLE password_credentials;
