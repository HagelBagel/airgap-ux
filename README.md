# AirGap UX

A research tool for UX researchers who work with sensitive interview data. Upload interview transcripts, tag passages, link insights to the exact quotes they came from, and run Jobs-to-be-Done analysis with a small language model that runs **in your browser**. Each desired outcome gets an opportunity score based on how important it is and how well it's served today, and every score points back to the quotes behind it.

> **Status: early development.** The app is moving from a local-first, air-gapped design to a hosted app with its own API and Postgres database in the EU (see [ADR 0001](docs/adr/0001-hosted-first-own-api-and-eu-postgres.md)). Parts of the old local "vault" flow are still in the code and will be removed.

## Why

UX consultants often can't put client interviews into cloud AI tools because of NDAs and privacy rules. AirGap UX keeps the analysis on the researcher's machine and the data in the EU:

- **Transcript text is never sent to a model provider.** AI analysis runs in a Web Worker in the browser ([ADR 0003](docs/adr/0003-in-browser-ai-analysis-behind-provider-interface.md)).
- **Data lives only in our own Postgres in the EU.** No third-party analytics, trackers or cloud AI APIs.
- **Scores are verifiable.** Every job-card score carries evidence: quotes linked to transcript segments, so a human can check the AI's work.

## How scoring works

Each desired outcome gets an **Importance** (I) and a **Satisfaction** (S) rating from 1 to 10. The opportunity score is:

```
Opportunity = I + max(I − S, 0)
```

So I=10, S=1 scores 19 (important and badly served), while I=1, S=10 scores 1. When several participants talk about the same outcome, their ratings are averaged, and the outcome is flagged as a **tension** when their satisfaction ratings differ by more than 3 points.

## Tech stack

- **Frontend:** Vue 3 (`<script setup>`, Composition API), Pinia, Vue Router, Vite, TypeScript
- **In-browser AI:** [transformers.js](https://github.com/huggingface/transformers.js) with `Qwen2.5-0.5B-Instruct` (ONNX), running in a Web Worker and cached in the browser after the first download
- **Database:** PostgreSQL 17 (Docker for local development), migrations with [dbmate](https://github.com/amacneil/dbmate)
- **Tests:** Vitest with jsdom
- **Styling:** scoped CSS with native nesting and custom properties, no utility frameworks

## Getting started

### Prerequisites

- Node.js (a current LTS release)
- Docker, for the local database
- A browser with WebGPU support for real inference (or use mock mode, below)

### Install and run

```bash
npm install
npm run dev
```

The model (a few hundred MB) downloads on first use and is cached by the browser afterwards.

### Mock mode

To work on the UI without downloading a model or using the GPU, set this in `.env`:

```bash
VITE_MOCK_MODE=true
```

The worker then returns canned analysis results instantly, and the dashboard offers "Analyse sample transcript".

### Local database

Postgres runs in Docker via `compose.yaml`, bound to `127.0.0.1:5432`. dbmate reads the connection string from `DATABASE_URL` in `.env`.

```bash
docker compose up -d          # start Postgres
npx dbmate up                 # apply migrations from db/migrations
```

Day-to-day commands:

| Command | What it does |
| --- | --- |
| `docker compose up -d` | Start the database |
| `docker compose stop` | Stop it (data stays) |
| `docker compose down` | Remove the container (data stays in the volume) |
| `docker compose down -v` | Remove the container **and** the volume, to start fresh |
| `docker compose exec db psql -U sovereign -d sovereign` | Open a `psql` shell |
| `npx dbmate new <name>` | Create a new migration file |
| `npx dbmate rollback` | Roll back the latest migration |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run all tests once |
| `npm run type-check` | Run `vue-tsc` |
| `npm run lint-check` | Run ESLint with zero warnings allowed |
| `npm run code-quality` | Type-check, lint and test (run before committing) |

## Project structure

```
src/
  domain/             Pure scoring logic (opportunity score, variance/tension)
  workers/            AI worker and its typed message contract
  services/ai/        transformers.js runtime setup and mock data
  stores/             Pinia stores
  components/, views/ Vue UI
db/migrations/        Hand-written SQL migrations (dbmate)
docs/adr/             Architecture decision records
notes/                Project brief, backlog, task list and progress log
```

## Architecture decisions

Design choices are recorded in [`docs/adr/`](docs/adr/):

1. [Hosted first: own API and Postgres in the EU](docs/adr/0001-hosted-first-own-api-and-eu-postgres.md)
2. [Defer audio/video transcription](docs/adr/0002-defer-audio-transcription.md)
3. [In-browser AI analysis behind a provider interface](docs/adr/0003-in-browser-ai-analysis-behind-provider-interface.md)
4. [Data model for projects, transcripts and quotes](docs/adr/0004-data-model.md)

## Contributing

Work is tracked in [GitHub Issues](https://github.com/HagelBagel/airgap-ux/issues). Branches follow `<type>/<planning-id>-<short-slug>` (for example `feat/lpm-001-select-vault-action`), commits follow `feat(lpm-001-a): ...`, and pull requests target `main`. Run `npm run code-quality` before opening a PR.
