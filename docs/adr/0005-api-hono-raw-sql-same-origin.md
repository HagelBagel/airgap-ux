# 0005: API: Hono + raw SQL via pg, served same-origin under /api

## Status

Proposed (2026-11-06). First used by HFP-005 (#24), the projects slice.

## Context

[0001](0001-hosted-first-own-api-and-eu-postgres.md) commits us to our own HTTP API between the Vue app and Postgres, and names learning database design as an explicit goal. [0004](0004-data-model.md) fixes the schema, and its migrations are written by hand. The first slice only lists, creates and deletes Projects, but the choices made here (framework, how SQL is written, how the browser reaches the API) carry into every later slice: transcript upload, tags, insights and sign-in.

What the API needs from a framework is small: routing, JSON in and out, error handling and a way to test requests without opening a port. What it needs from the database layer is control over the exact SQL, since that SQL is part of what is being learnt and reviewed.

## Decision

- **Hono on Node** (`@hono/node-server`), in its own `server/` package with its own `package.json` and `tsconfig`. Run in development with `tsx watch`, so there is no build step.
- **Raw SQL through `pg`**, with `$1` placeholders. No ORM and no query builder. Queries live next to the feature that uses them (`server/src/projects/queries.ts`), and rows are mapped to camelCase JSON by a small hand-written mapper (`toProjectDto`), so Postgres naming never reaches the client.
- **Same origin under `/api`.** In development the Vite dev server proxies `/api` to the API. In production a reverse proxy, or the API serving the built app, does the same. The browser only ever talks to one origin.
- **The app is built by `createApp({ db, ... })` without starting a server.** Tests call `app.request(...)` with a single `pg` connection held inside `BEGIN … ROLLBACK`, against a real `airgap_test` database migrated by dbmate.

## Rejected alternatives

- **Fastify.** Mature, fast and with a good plugin system and JSON-schema validation. But that plugin and decorator model is more to learn than this API needs, and Hono's `app.request()` gives the same in-process testing with less setup. Express was not considered seriously: its async error handling and typing are weaker than either.
- **Kysely (query builder) or Prisma (ORM).** Both give typed queries, and Prisma adds generated migrations. Prisma would replace the hand-written migrations that 0004 relies on and hide the SQL. Kysely keeps SQL close but still puts a layer between the author and the statement Postgres runs. With raw SQL the cost is that row types are declared by hand and not checked against the schema; tests against a real database are what catch a mismatch.
- **Separate origins with CORS** (for example app on `:5173`, API on `:3001` called directly). It works, but every request then needs CORS headers and preflights, and cookie-based sessions need `SameSite=None; Secure` plus credentialed CORS. On one origin, sign-in can use a `SameSite=Strict`, `HttpOnly` cookie and the API sends no CORS headers at all.

## Consequences

- Two processes in development: `npm run dev` at the root (Vite) and `npm run dev` in `server/` (API on `127.0.0.1:3001`).
- Every query must be scoped by the current User (`owner_id`). Until sign-in exists the current User comes from `DEV_USER_ID`, and the API refuses to start if `DEV_USER_ID` is set with `NODE_ENV=production`.
- Row types in TypeScript can drift from the schema without a compile error. API tests against `airgap_test` are the guard, so every endpoint gets one.
- Validation is written by hand for now (see `parseProjectName`), mirrored by `CHECK` constraints in the database. If request bodies grow, a schema library can be added in front of the routes without changing the SQL layer.
- Production hosting must serve the app and `/api` from one origin. The provider is still open (0001).
