## Task

Add a guard to ensure the app never uploads or copies vault contents to any remote server.

## Parent Story

LPM-001: Select a Vault Folder

## Acceptance Criteria

- [ ] No vault file content is sent over the network.
- [ ] Any network calls related to the vault are limited to metadata only, not file contents.
- [ ] A code review checklist or lint rule is in place to catch accidental uploads.

## Source

Planning ID: LPM-001 (task 6 of 6)
