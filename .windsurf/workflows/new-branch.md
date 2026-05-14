---
description: Create a new feature branch from a GitHub issue and planning ID
---

# New Branch Workflow

## Branch Naming Convention

Branches must follow this pattern:

```
<type>/<planning-id>-<short-slug>
```

Examples:
- `feat/lpm-001-select-vault-action`
- `fix/lpm-001-no-upload-guard`
- `chore/lpm-001-store-handle-indexeddb`

Types:
- `feat` — new feature or user story task
- `fix` — bug fix
- `chore` — non-functional work (refactor, test, config)

## Steps

1. Confirm you are on `main` and it is up to date:

```powershell
git status --short
git pull origin main
```

2. Identify the planning ID and short slug from the issue title. For example, issue `LPM-001: Add "Select Vault" UI action` becomes:

```
feat/lpm-001-select-vault-action
```

3. Create and switch to the branch:

```powershell
git checkout -b feat/lpm-001-select-vault-action
```

4. Confirm the active branch:

```powershell
git branch --show-current
```

5. Update the task status in the todo list — set the corresponding task to `in_progress`.

6. When the work is complete, push and open a PR referencing the issue:

```powershell
git push -u origin feat/lpm-001-select-vault-action
gh pr create --title "feat: LPM-001 Add Select Vault UI action" --body "Closes #4"
```

Reference both the planning ID and the GitHub issue number in the PR body.
