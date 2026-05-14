---
description: Create a new feature branch from a GitHub issue and planning ID, then push and open a PR when done
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

1. Confirm you are on `main`, it is clean, and it is up to date:

```powershell
git status --short
git pull origin main
```

**Important:** If `git status` shows any uncommitted changes, commit or stash them on `main` before creating the branch. Starting a branch with uncommitted main-level changes will mix concerns across commits.

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

6. After implementation, commit the work on the feature branch:

```powershell
git add <files>
git commit -m "feat(lpm-001-a): description of what was done"
```

7. Push the branch to GitHub — the branch does not exist on GitHub until this step:

```powershell
git push -u origin feat/lpm-001-select-vault-action
```

8. Open a PR targeting `main`. Always reference both the planning ID and the closing issue number:

```powershell
gh pr create --title "feat(lpm-001-a): Add Select Vault UI action" --body "Closes #4"
```

The PR will not appear on GitHub until steps 7 and 8 are complete.
