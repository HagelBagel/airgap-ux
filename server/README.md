# AirGap UX API

Hono on Node with raw SQL through `pg`. See [ADR 0005](../docs/adr/0005-api-hono-raw-sql-same-origin.md).

Settings come from the repo's root `.env`: `DATABASE_URL`, `DEV_USER_ID`, `TEST_DATABASE_URL` and optionally `API_PORT` (default 3001).

## Run

```bash
docker compose up -d          # at the repo root: Postgres
npx dbmate up                 # at the repo root: migrate the dev database
npm run seed                  # here: insert the dev User from db/seed.sql
npm run dev                   # here: API on http://127.0.0.1:3001/api
```

Start the app with `npm run dev` at the root; Vite proxies `/api` to the API.

## Test

```bash
npm run db:test:prepare       # at the repo root: create and migrate airgap_test
npm test                      # here
```

Each API test runs inside `BEGIN … ROLLBACK` on one connection, so the test database stays empty. Re-run `db:test:prepare` after adding a migration.
