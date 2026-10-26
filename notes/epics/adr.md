# ADR: Local-First Vault and Project File Architecture

## Status

Superseded (2026-10-26) by [docs/adr/0001](../../docs/adr/0001-hosted-first-own-api-and-eu-postgres.md): the app is now hosted first with its own API and Postgres in the EU. A local vault may come back later as an optional mode. Kept for history.

Originally accepted for the first file/project management epic.

## Context

The app is a privacy-focused PWA for research work. It should feel like a desktop workbench rather than a temporary web app: the user selects a local research folder, creates project folders inside it, drops source files into those projects, and the app mirrors those files into an internal project browser.

The central product promise is local-first ownership. Researchers should be able to keep sensitive media, transcripts, and analysis on their own machine, move projects between drives, back up folders themselves, and still have useful access to their work if the app or internet connection is unavailable.

The PWA cannot freely crawl a user's disk. It must work through browser file permissions, especially the File System Access API. Browser storage is useful for speed, handles, indexes, and UI state, but should not be treated as the only durable home for professional research data.

## Decision

Use an Obsidian-like vault/project architecture where the local folder structure is the durable source of truth, and IndexedDB is a fast local mirror/cache.

The app will have two important levels:

- **Vault**: A user-selected local root folder that the app can browse, scan, and relink as a whole.
- **Project**: A self-contained research folder inside the vault that can be moved, zipped, archived, imported, or shared independently.

For the first implementation slice, the app will focus on the project/file mirror only. Transcription queues, semantic search, archive workflows, relinking, import/export packages, and advanced collaboration flows are deliberately deferred.

## Folder Model

New projects should use an explicit folder structure:

```text
/Vault/
└── Project_A/
    ├── input/
    ├── output/
    └── .jtbd_workspace/
```

Responsibilities:

- **`input/`**: User-owned source material such as video, audio, PDFs, images, CSV files, and other research inputs.
- **`output/`**: Human-facing durable artifacts such as transcripts, summaries, analysis files, reports, and exports.
- **`.jtbd_workspace/`**: App-internal workspace for manifests, cache files, queues, waveform/audio intermediates, rebuildable indexes, and other implementation details.

This separates the user's research artifacts from app implementation artifacts. Users can understand and trust `input/` and `output/`, while the app can manage `.jtbd_workspace/` without cluttering the project.

## Data Ownership Model

The local project folder is the durable source of truth for project artifacts. IndexedDB is the app's local mirror and acceleration layer.

The app should not copy large raw media files into browser storage. Instead, it records metadata and secure file/directory handles where possible.

IndexedDB may store:

- Vault and project directory handles.
- File metadata such as name, size, type, last modified time, and internal IDs.
- Mirror records for fast UI rendering.
- Permission and unlock state.
- Search indexes and other acceleration data.
- UI state such as last opened project or recent working set.

Project folders may store:

- Source files in `input/`.
- Durable user-facing derived files in `output/`.
- Internal app workspace files in `.jtbd_workspace/`.
- Project manifests or sidecar metadata needed for portability.

If IndexedDB is lost or stale, the app should be able to rebuild much of its mirror by scanning the vault/project folders again.

## Permission and Offline Behavior

Because this is a PWA, file access depends on browser permission. Stored file handles may need to be revalidated when the app opens.

If the user has not unlocked the vault or project folder, the app should not become useless. It should enter a read-only indexed mode:

- Show known vaults, projects, files, transcripts, and metadata from the IndexedDB mirror.
- Clearly mark disk-backed operations as locked or unavailable.
- Prompt the user to unlock the vault/project when they try to scan, create folders, read source files, write outputs, or refresh file status.

This preserves the desktop-app feeling while respecting browser security constraints.

## MVP Scope

The first epic should build the local file/project foundation only.

Included:

- Select a vault folder using browser file access.
- Store the vault handle in IndexedDB.
- Create new project folders.
- Create the expected `input/`, `output/`, and `.jtbd_workspace/` structure.
- Scan the vault for projects.
- Scan project `input/` folders for source files.
- Mirror file metadata into IndexedDB without copying raw media.
- Detect new, missing, inaccessible, and changed files during startup or manual refresh.
- Show projects and files in a project browser.
- Support read-only indexed mode when folder access is unavailable.

Excluded from the first epic:

- Automatic transcription.
- Processing queue management.
- Audio/video preprocessing.
- Semantic search and vector indexing.
- Archive/media-light workflows.
- File or root relinking.
- Project zip export/import.
- Collaboration handoff.
- Virtual sessions and split/merge workflows.
- Transcript locking/version history.
- Advanced insight/JTBD analysis workflows.

## Consequences

Benefits:

- The app supports the local-first privacy promise.
- Users retain ownership of their files and can inspect project folders directly.
- Projects can become portable units rather than opaque browser database records.
- IndexedDB can be optimized for speed without being the only trusted storage location.
- The app can recover from stale browser state by rescanning folders.

Tradeoffs:

- Browser file permissions introduce unlock/relock states that must be designed clearly.
- The File System Access API has browser support constraints.
- Folder scanning and diffing must be robust and non-blocking.
- The app must handle conflicts between disk state and IndexedDB mirror state.
- Some internal state will need careful sidecar/manifest design to keep projects portable.

## Deferred Architectural Questions

- Exact project manifest format.
- Exact transcript and analysis sidecar file formats.
- How much derived data should be duplicated between `output/`, `.jtbd_workspace/`, and IndexedDB.
- Browser support strategy for environments without the File System Access API.
- Relink strategy for moved vaults and projects.
- Import/export package format.
- Search architecture for active, recent, and archived projects.
- Processing queue architecture for transcription and analysis workers.
