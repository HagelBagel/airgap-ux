-- migrate:up
CREATE EXTENSION IF NOT EXISTS citext;
CREATE FUNCTION set_updated_at () returns trigger AS $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- migrate:down
DROP FUNCTION set_updated_at ();
DROP EXTENSION citext;
