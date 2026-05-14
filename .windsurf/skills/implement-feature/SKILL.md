---
name: implement-feature
description: Use this skill when starting implementation work on a GitHub issue or planning task. It enforces the project ADR, tech stack constraints, folder model, and test-first discipline before any code is written.
---

# Implement a Feature

## Purpose

Use this skill before writing any implementation code for a task or GitHub issue. It ensures decisions from the ADR and system prompt are respected, the correct patterns are followed, and tests are written before or alongside the implementation.

## Step 1 — Read the Issue and ADR

Before writing any code:

1. Identify the GitHub issue number and planning ID (e.g. `LPM-001 / #4`).
2. Read the issue body to extract the acceptance criteria.
3. Read `notes/epics/adr.md` if this task touches the vault, project folder structure, IndexedDB, or file access.
4. Read `notes/epics/user-stories.md` to confirm the parent story and feature context.

Do not skip this step. Implementation that contradicts the ADR must be flagged and discussed before proceeding.

## Step 2 — Create or Confirm the Branch

Using the issue title and planning ID already read in Step 1, derive the branch name following the convention in `.windsurf/workflows/new-branch.md`:

```
<type>/<planning-id>-<short-slug>
```

- Derive `<type>` from the nature of the task: `feat` for new functionality, `fix` for bugs, `chore` for non-functional work.
- Derive `<short-slug>` from the issue title: lowercase, hyphen-separated, 3–5 words max.

Example: issue `LPM-001: Add "Select Vault" UI action` → `feat/lpm-001-select-vault-action`

Then run:

```powershell
git status --short
git pull origin main
git checkout -b feat/lpm-001-select-vault-action
```

Propose the exact `git checkout -b` command to the user for approval before running it. Do not auto-run without approval.

If a branch for this issue already exists (check with `git branch --list`), switch to it instead of creating a new one.

## Step 3 — Locate Existing Structure

Before creating new files, check:

- Does a relevant Pinia store slice already exist in `src/stores/`?
- Does a relevant Web Worker already exist in `src/workers/`?
- Does a relevant Vue component already exist in `src/components/`?
- Does the vault/project folder model from the ADR apply to this task?

Use search tools to find existing files rather than assuming the structure.

## Tech Stack Constraints — NEVER VIOLATE

These are hard constraints from the system prompt and ADR. If a proposed implementation would violate any of these, stop and flag it.

| Constraint | Rule |
|---|---|
| Framework | Vue 3, Composition API, `<script setup>` only |
| Styling | Scoped CSS only. CSS variables for theming. **No Tailwind.** No utility-first frameworks. |
| AI logic | All transformers.js v3 tasks must run in a Web Worker. Never on the main thread. |
| State | Pinia only for shared state. No Vuex, no global reactive objects outside stores. |
| Privacy | No external API calls. No analytics. No cloud. Must work fully air-gapped. |
| File access | Use File System Access API. Never copy raw media into IndexedDB or browser storage. |
| Testing | Vitest with jsdom (current config). Browser Mode is the future target but is not yet active — do not switch environments mid-task without explicit discussion. |
| Opportunity score | `Importance + max(Importance − Satisfaction, 0)`. Never deviate from this formula. |
| Model loading | `dtype: 'fp16'` or `quantized: true`. Always show a progress-bar state during loading. |

## Step 4 — Vault and Folder Model

For any task touching file storage, vault, or project creation, apply the ADR folder model:

```text
/Vault/
└── Project_A/
    ├── input/       ← user source files only
    ├── output/      ← durable user-facing artifacts
    └── .jtbd_workspace/  ← app-internal cache, manifests, intermediates
```

Rules:
- Never write app internals into `input/` or `output/`.
- Never copy large raw media into IndexedDB. Store handles and metadata only.
- If vault access is unavailable, enter read-only indexed mode — do not block the UI.

## Step 5 — Write Tests First

Before implementing a feature, identify the test cases from the acceptance criteria.

Test file location: `src/tests/` or co-located `*.spec.ts` alongside the component.

Required test types by feature area:

| Area | Required tests |
|---|---|
| Vue component | Renders correct state, emits correct events, handles loading/error states |
| Pinia store | State transitions, action side effects, getters |
| Web Worker | `postMessage` mock tests for request/response cycle |
| IndexedDB | Verify data persists across a simulated page refresh |
| Opportunity score | Unit tests including edge cases `I=1,S=10 → 1` and `I=10,S=1 → 19` |
| AI pipeline | Use `mock-transformers` utility — never download real models in tests |

Do not write implementation code until the test cases are at least outlined.

## Step 6 — Implementation Patterns

### Vue Component

```vue
<script setup lang="ts">
// Composition API only. No Options API.
</script>

<template>
  <!-- Semantic HTML. Descriptive BEM/Component-first class names. -->
</template>

<style scoped>
/* Scoped CSS only. Use CSS custom properties for theming. */
</style>
```

### Pinia Store

```ts
import { defineStore } from 'pinia'

export const useVaultStore = defineStore('vault', () => {
  // Composition-style store (setup store), not options store
})
```

### Web Worker Communication

```ts
// Main thread
worker.postMessage({ type: 'START_SCAN', payload: { handle } })
worker.onmessage = (e) => {
  if (e.data.type === 'SCAN_COMPLETE') store.applyResult(e.data.payload)
}
```

The worker must never import Vue or Pinia. It communicates only via `postMessage`.

## Step 7 — Update Progress Log

After implementing the feature, append a dated entry to `notes/progress.md`:

```markdown
## YYYY-MM-DD — LPM-001: <task title>

**Files created/changed:**
- `src/components/VaultSelector.vue`
- `src/stores/vault.ts`

**Key decisions:**
- Used File System Access API `showDirectoryPicker()`.

**Next steps:**
- [ ] Wire store to IndexedDB persistence layer.
```

## Step 8 — Mark Task Complete

1. Update the `todo_list` task status to `completed` and set the next task to `in_progress`.
2. Mark the corresponding checkbox in `notes/task-list.md` as `[x]`.

Both must be updated — `todo_list` is session-scoped; `notes/task-list.md` is the durable record.

## Step 9 — Handle Discovered Follow-on Tasks

If implementation reveals adjacent work not covered by the original issue (e.g. routing changes, missing store slices, new UI states), do not implement them silently on the same branch.

Instead:
1. Note the discovered task in the conversation.
2. Add it to `notes/task-list.md` as a new unchecked item.
3. Add it to `todo_list` as `pending`.
4. Discuss with the user whether to open a new GitHub issue and branch before proceeding.
