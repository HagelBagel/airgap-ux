## Hosted-first pivot (ADRs 0001-0003)

- [x] Record decisions as ADRs 0001-0003 and update CLAUDE.md
- [ ] Remove audio/video transcription code and deps (ADR 0002)
- [ ] Make `SpeakerSegment` timestamps optional; add plain-text transcript parser
- [ ] Introduce `AnalysisProvider` interface around the in-browser worker (ADR 0003)
- [ ] Choose EU host for API + Postgres
- [ ] Draft Postgres schema (users, projects, transcripts, segments, tags, insights, evidence)
- [ ] Scaffold own API with SQL migrations
- [ ] Replace vault flow (HomeView, VaultSelector, requiresVault) with sign-in + project list
- [ ] Update notes/project-brief.md to the new scope

## LPM-001: Select a Vault Folder

- [x] LPM-001: Add "Select Vault" UI action
- [x] LPM-001: Open native directory picker on action
- [x] LPM-001: Request read/write access to selected folder
- [x] LPM-001: Register selected folder as active vault
- [x] LPM-001: Make HomeView the app entry point and gate /dashboard behind vault selection
- [ ] ~~LPM-001: Store vault directory handle in IndexedDB~~ (dropped: superseded by ADR 0001)
- [ ] ~~LPM-001: Ensure vault contents are never uploaded to server~~ (dropped: superseded by ADR 0001)

00004 - Bug: still cannot hear processed audio

DONE 00003 - Add audio processing step to todo list

DONE 00002 - Make media player more compact (maybe resizable?) and remove temp gain slider

DONE 00001 - Update existing unit tests


