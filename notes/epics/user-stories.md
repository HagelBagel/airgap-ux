# Epic: Local-First Project Management

## Goal

Build the first implementation slice of the local-first file/project management system: a PWA-based vault and project browser where users can select a local research folder, create structured projects, mirror source file metadata into IndexedDB, and continue viewing known project state even when folder access needs to be unlocked again.

## Numbering Strategy

The IDs below use a local planning prefix: `LPM-001`, `LPM-002`, etc.

GitHub does not provide Azure DevOps-style consecutive work-item IDs for arbitrary markdown tasks. GitHub Issues are numbered automatically and consecutively per repository, so the closest native equivalent is:

- Create each feature or user story as a GitHub Issue.
- Use the GitHub issue number as the canonical work item ID.
- Optionally keep the `LPM-###` IDs as stable planning IDs in notes and issue titles.

Recommended workflow:

- Use this document for planning.
- When ready, create GitHub Issues from the stories below.
- Let GitHub assign issue numbers automatically.
- Reference both IDs when useful, for example: `LPM-003 / GitHub #42`.

## Features

### Feature LPM-F01: Vault Connection

Allow the user to select a local folder as the root vault for their research projects.

#### User Story LPM-001: Select a Vault Folder

**As a** researcher,  
**I want** to select a local folder as my research vault,  
**so that** my source files and project artifacts remain on my own machine while the PWA can browse them.

Acceptance criteria:

- The user can click a "Select Vault" or "Set Vault Folder" action.
- The browser opens a native directory picker.
- The app requests read/write access to the selected folder.
- The selected folder is registered as the active vault.
- The app stores the vault directory handle in IndexedDB.
- The app does not upload or copy the vault contents to a server.

#### User Story LPM-002: Reopen a Known Vault

**As a** researcher,  
**I want** the app to remember my previously selected vault,  
**so that** I do not have to find the folder manually every time I open the app.

Acceptance criteria:

- The app loads known vault records from IndexedDB on startup.
- The app can show the previously selected vault name.
- The app checks whether the stored directory handle is still available.
- If access is available, the vault can be scanned.
- If access is not available, the app enters read-only indexed mode.

#### User Story LPM-003: Request Persistent Browser Storage

**As a** researcher,  
**I want** the app to request persistent browser storage,  
**so that** my local mirror data is less likely to be removed by browser storage cleanup.

Acceptance criteria:

- The app calls the browser persistent storage API when appropriate.
- The app records whether persistent storage was granted.
- The user can see whether local app storage is protected.
- Failure to receive persistent storage does not block vault usage.

### Feature LPM-F02: Project Creation and Structure

Create a predictable project folder structure that separates source inputs, durable outputs, and internal app workspace files.

#### User Story LPM-004: Create a Project Folder

**As a** researcher,  
**I want** to create a new project inside my vault,  
**so that** I can organize interviews and research inputs by study or client engagement.

Acceptance criteria:

- The user can create a project from inside the app.
- The app creates a new folder inside the selected vault.
- The project name is validated before folder creation.
- The app creates a project record in IndexedDB.
- The new project appears in the project browser.

#### User Story LPM-005: Initialize Project Subfolders

**As a** researcher,  
**I want** each project to have a clear input/output structure,  
**so that** I know where to place source files and where to find generated artifacts.

Acceptance criteria:

- New projects include an `input/` folder.
- New projects include an `output/` folder.
- New projects include a `.jtbd_workspace/` folder.
- `input/` is treated as the user-owned source file area.
- `output/` is treated as the user-facing durable artifact area.
- `.jtbd_workspace/` is treated as app-internal workspace state.

#### User Story LPM-006: Recognize Existing Project Folders

**As a** researcher,  
**I want** the app to recognize existing project folders in my vault,  
**so that** I can use projects created or moved outside the app.

Acceptance criteria:

- The app scans top-level vault folders as candidate projects.
- The app recognizes projects with the expected subfolder structure.
- The app can create missing expected subfolders when the user confirms or when safe.
- Existing recognized projects are mirrored into IndexedDB.
- The app does not require all source files to be created through the app.

### Feature LPM-F03: File Discovery and Metadata Mirror

Mirror source file metadata into IndexedDB without copying raw media or research files into browser storage.

#### User Story LPM-007: Scan Project Input Files

**As a** researcher,  
**I want** the app to scan the `input/` folder of a project,  
**so that** source files I add through the operating system appear in the app.

Acceptance criteria:

- The app scans files inside a project's `input/` folder.
- The scan identifies supported source file types.
- The scan records file name, type, size, and last modified time.
- The scan does not copy raw file contents into IndexedDB.
- The scan can run on startup or manual refresh.

#### User Story LPM-008: Create File Mirror Records

**As a** researcher,  
**I want** files on disk to have corresponding records in the app,  
**so that** the project browser can show my local research material quickly.

Acceptance criteria:

- New files found on disk create new IndexedDB mirror records.
- Existing files update their metadata when size or modified time changes.
- File records are linked to their project.
- File records use relative project paths where possible.
- File records avoid storing absolute OS paths as the primary access mechanism.

#### User Story LPM-009: Preserve Raw File Ownership

**As a** researcher,  
**I want** my large source media files to stay on disk,  
**so that** the browser database does not become the hidden owner of my research material.

Acceptance criteria:

- Raw video, audio, PDF, image, and CSV files remain in the project folder.
- IndexedDB stores metadata and handles, not full raw source files.
- The app can show source file metadata without loading entire files into memory.
- The architecture supports very large source media files.

### Feature LPM-F04: Sync and Reconcile

Detect differences between the project folder on disk and the IndexedDB mirror.

#### User Story LPM-010: Detect New Files

**As a** researcher,  
**I want** files added to `input/` outside the app to appear as new files,  
**so that** I can use my normal file explorer workflow.

Acceptance criteria:

- A file present on disk but absent from IndexedDB is marked as new.
- New file records appear in the project browser.
- The app can detect new files during startup scan.
- The app can detect new files during manual refresh.

#### User Story LPM-011: Detect Changed Files

**As a** researcher,  
**I want** the app to detect when a source file has changed on disk,  
**so that** the app mirror does not silently become stale.

Acceptance criteria:

- A file with the same relative path but changed size or last modified time is marked as changed.
- The mirror record is updated with current metadata.
- The UI can distinguish changed files from unchanged mirrored files.

#### User Story LPM-012: Detect Missing Files

**As a** researcher,  
**I want** the app to show when a previously known source file is missing,  
**so that** I understand what changed without losing the project record.

Acceptance criteria:

- A file present in IndexedDB but absent on disk is marked as missing.
- Missing files are not automatically deleted from the mirror.
- The project browser can show missing file status.
- Missing file handling does not delete transcripts or other derived artifacts.

#### User Story LPM-013: Handle Inaccessible Files or Vaults

**As a** researcher,  
**I want** the app to handle missing permissions gracefully,  
**so that** I can still see known project state even before unlocking the vault again.

Acceptance criteria:

- If the vault handle cannot currently be accessed, known projects remain visible from IndexedDB.
- Disk-backed actions are disabled or marked as requiring unlock.
- File records can be marked inaccessible when the app cannot verify disk state.
- The user is prompted to unlock the vault when a disk-backed action is attempted.

### Feature LPM-F05: Project Browser MVP

Display vaults, projects, and mirrored file statuses in a minimal browser UI.

#### User Story LPM-014: View Projects in the Vault

**As a** researcher,  
**I want** to see the projects inside my selected vault,  
**so that** I can navigate my research library from inside the app.

Acceptance criteria:

- The app shows a list of mirrored projects.
- Each project shows its name.
- Each project can show a basic file count.
- The user can select a project to view its files.

#### User Story LPM-015: View Files in a Project

**As a** researcher,  
**I want** to see the files in a project's `input/` folder,  
**so that** I know what source material the app has discovered.

Acceptance criteria:

- The app lists files mirrored from the selected project's `input/` folder.
- Each file shows name, type, and status.
- File statuses include at least new, mirrored, changed, missing, and inaccessible.
- The view is based on IndexedDB mirror data and can render before a fresh scan completes.

#### User Story LPM-016: Manually Refresh a Project

**As a** researcher,  
**I want** to manually refresh a project scan,  
**so that** I can make the app catch up after changing files in my file explorer.

Acceptance criteria:

- The user can trigger a manual refresh for a project.
- The refresh scans the project folder and reconciles mirror records.
- The UI updates after the refresh completes.
- If access is unavailable, the app prompts the user to unlock the vault or project.

### Feature LPM-F06: Read-Only Indexed Mode

Keep the app useful when browser file permissions are stale or unavailable.

#### User Story LPM-017: Show Known State Without Disk Access

**As a** researcher,  
**I want** to see my known projects and file records even when the vault is locked,  
**so that** the app does not feel broken after reopening.

Acceptance criteria:

- Known vaults, projects, and files load from IndexedDB.
- The UI clearly communicates that disk access is currently locked.
- The app does not attempt to read or write disk files without permission.
- Unlock prompts are contextual rather than blocking every screen.

#### User Story LPM-018: Unlock Vault for Disk Operations

**As a** researcher,  
**I want** to re-authorize vault access when needed,  
**so that** I can scan, create projects, and update files again.

Acceptance criteria:

- The user can initiate an unlock flow.
- The app requests access to the vault folder.
- After successful unlock, disk-backed actions become available.
- After unlock, the app can refresh the mirror state.

## Deferred Stories

These are intentionally outside the first epic:

- Automatic transcription queue.
- Audio/video preprocessing.
- Semantic search and vector indexing.
- Project import/export zip packages.
- Root or file relinking.
- Media-light archive workflows.
- Virtual sessions for multi-part interviews.
- Transcript locking and version history.
- Insight cards and JTBD analysis workflows.
