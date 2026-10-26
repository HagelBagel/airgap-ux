# 0001: Hosted first: own API and Postgres in the EU

## Status

Accepted (2026-10-26). Supersedes the local-first vault ADR in `notes/epics/adr.md`.

## Context

The product was first designed as a local-first, air-gapped PWA: researchers picked a vault folder on their own disk (File System Access API), and IndexedDB mirrored file metadata. Nothing left the machine.

The goals have changed:

- Researchers sign in, create projects and upload interview transcripts.
- Transcripts can be tagged, and insights link back to the quotes they came from.
- Personal data is documented, minimised, deletable and kept in the EU.
- The project is also a way for the author to learn database design and operation.

Sign-in, shared projects and a deliberate data-retention story all assume a server. The data is relational (projects contain transcripts, transcripts contain segments, insights cite segments, tags apply to many things), which suits a relational database much better than files in a folder or IndexedDB.

## Decision

Build hosted first:

- **Postgres** is the system of record for users, projects, transcripts, segments, tags, insights and evidence links.
- **Our own HTTP API** sits between the Vue app and Postgres. We write the API, the auth and the SQL migrations ourselves instead of using a backend-as-a-service, because learning databases is an explicit goal.
- **The API and database are hosted in the EU.** The provider is still to be chosen; candidates include Hetzner, Scaleway and Neon (EU region).
- **Transcripts are uploaded as text** (plain text first, other formats later) and parsed into segments on the server.

Schema rules that keep later options open:

- UUID primary keys, so rows can be created offline or on another machine without colliding.
- `created_at` and `updated_at` on every table.
- Deleting a user or project removes their personal data for real. Any soft-delete window is short and documented.

## Consequences

- The "no external API calls / fully air-gapped" constraint no longer applies to the app as a whole. It still applies to AI analysis (see [0003](0003-in-browser-ai-analysis-behind-provider-interface.md)).
- We now own auth, sessions, migrations, backups and GDPR duties: a record of processing, deletion and data export.
- The File System Access API vault (`HomeView`, `VaultSelector`, `stores/vault.ts`, the `requiresVault` route guard) no longer fits the main flow. It will be replaced by sign-in and a project list in a separate change.
- IndexedDB is no longer the planned persistence layer. It may still be used for client-side cache and UI state.

## Future option: local / air-gapped mode

A local-only mode, where data stays on the researcher's machine, remains a possible add-on. It is not designed for now. Moving from hosted to local later would mean running the same schema locally (for example SQLite or PGlite) and dealing with sync. Neither direction is cheap, so this is deliberately left out of scope.
