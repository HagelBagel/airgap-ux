---
name: create-issue
description: Use this skill when the user wants to create GitHub Issues from a markdown planning document, user stories file, task list, or epic breakdown using the GitHub CLI (`gh`). The skill should help convert structured planning content into GitHub Issues and create them safely with `gh issue create`.
---

# Create GitHub Issues with `gh`

## Purpose

Use this skill to convert structured markdown planning content into GitHub Issues using the GitHub CLI.

Good source documents include:

- User story files.
- Epic breakdowns.
- Task lists.
- ADR follow-up tasks.
- Markdown plans with headings and acceptance criteria.

## Preconditions

Before creating issues, verify:

- The current workspace is a Git repository.
- The repository has a GitHub remote.
- GitHub CLI is installed.
- The user is authenticated with GitHub CLI.
- The command will run from the intended repository root.
- The user has reviewed the proposed issue list before issue creation.

Recommended read-only checks:

```powershell
git status --short
git remote -v
gh --version
gh auth status
```

If any precondition fails, stop and explain what the user needs to fix.

## Safety Rules

- Never create GitHub Issues without first showing the proposed issue list.
- Never create more than 10 issues at once without explicit confirmation.
- If the source contains many stories, suggest batching by feature or section.
- Preserve local planning IDs such as `LPM-001`, `ADR-001`, or similar.
- Do not delete, close, edit, assign, label, or milestone existing issues unless explicitly requested.
- Prefer `--body-file` over long inline `--body` arguments.
- Do not include secrets, local machine credentials, API keys, or unrelated absolute paths in issue bodies.
- If labels, assignees, milestones, or projects are requested, verify they exist before using them.
- If duplicate issues may already exist, ask whether to search existing issues first.

## Input Parsing

When reading the source document, identify issue candidates from headings such as:

```markdown
#### User Story LPM-001: Select a Vault Folder
### Feature LPM-F01: Vault Connection
## Task ABC-001: Add storage layer
```

For each candidate, extract:

- Planning ID.
- Title.
- Parent feature or section.
- User story text.
- Acceptance criteria.
- Notes.
- Deferred status, if present.

Do not create issues for explicitly deferred items unless the user asks.

## Proposed Issue Preview

Before running any `gh issue create` commands, show a concise preview:

```markdown
# Proposed GitHub Issues

- **LPM-001**: Select a Vault Folder
- **LPM-002**: Reopen a Known Vault
- **LPM-003**: Request Persistent Browser Storage
```

Then ask for confirmation.

If there are more than 10 issues, ask whether to:

- Create the first batch only.
- Create all issues.
- Split by feature.
- Generate issue body files only.
- Generate a script only.

## Issue Body Format

Use this structure for each issue body:

```markdown
## User Story

As a researcher,  
I want to select a local folder as my research vault,  
so that my source files and project artifacts remain on my own machine while the PWA can browse them.

## Parent Feature

LPM-F01: Vault Connection

## Acceptance Criteria

- [ ] The user can click a "Select Vault" or "Set Vault Folder" action.
- [ ] The browser opens a native directory picker.
- [ ] The app requests read/write access to the selected folder.
- [ ] The selected folder is registered as the active vault.
- [ ] The app stores the vault directory handle in IndexedDB.
- [ ] The app does not upload or copy the vault contents to a server.

## Source

Planning ID: LPM-001
```

Convert acceptance criteria bullets into GitHub task checkboxes.

## Temporary Issue Files

For reliability, create issue body files before calling `gh issue create`.

Recommended location:

```text
.github/generated-issues/
```

Example file:

```text
.github/generated-issues/LPM-001.md
```

Do not overwrite existing generated issue files without checking them first.

## Creating Issues

Create each issue with:

```powershell
gh issue create --title "LPM-001: Select a Vault Folder" --body-file ".github/generated-issues/LPM-001.md"
```

With labels:

```powershell
gh issue create --title "LPM-001: Select a Vault Folder" --body-file ".github/generated-issues/LPM-001.md" --label "epic:file-management"
```

With assignee:

```powershell
gh issue create --title "LPM-001: Select a Vault Folder" --body-file ".github/generated-issues/LPM-001.md" --assignee "@me"
```

## Labels

Suggested labels:

- `type:user-story`
- `type:feature`
- `priority:mvp`
- `area:local-first`
- `area:file-system-access`
- `area:indexeddb`
- `epic:file-management`

Before applying labels, verify existing labels:

```powershell
gh label list
```

If labels do not exist, ask before creating them.

## Error Handling

If issue creation fails:

- Stop creating more issues.
- Report the error.
- Report which issues were created.
- Report which issues were not created.
- Do not retry blindly.

If issue creation partially succeeds, preserve the created issue numbers in the final response.

## Final Response Format

After creating issues, respond with:

```markdown
# GitHub Issues Created

## Created

- **LPM-001**: Select a Vault Folder — #12
- **LPM-002**: Reopen a Known Vault — #13

## Skipped

- **LPM-019**: Automatic transcription queue — deferred by epic scope

## Notes

- Issues were created with GitHub CLI.
- Acceptance criteria were converted to GitHub task checkboxes.
```

## Example Workflow for `notes/epics/user-stories.md`

When the user asks to create issues from `notes/epics/user-stories.md`:

1. Read the file.
2. Extract each `#### User Story LPM-###` section.
3. Include the closest preceding `### Feature LPM-F##` as the parent feature.
4. Ignore the `Deferred Stories` section unless explicitly requested.
5. Preview the issue list.
6. Ask for confirmation if creating issues.
7. Generate body files in `.github/generated-issues/`.
8. Run `gh issue create` for the approved batch.
9. Report created issue numbers.
