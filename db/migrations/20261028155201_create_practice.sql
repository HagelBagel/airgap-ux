-- migrate:up
create table practice (
  id bigint generated always as identity primary key,
  note text not null
);

-- migrate:down
drop table practice;
