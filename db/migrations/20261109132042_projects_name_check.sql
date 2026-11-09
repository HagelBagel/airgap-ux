-- migrate:up
ALTER TABLE projects 
ADD CONSTRAINT projects_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 200);


-- migrate:down
ALTER TABLE projects
DROP CONSTRAINT projects_name_check;
