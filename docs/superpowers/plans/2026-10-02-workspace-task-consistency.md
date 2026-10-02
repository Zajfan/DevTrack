# Workspace task consistency implementation plan

Fix GitHub issues #9–#13 and the owner's local Completed-widget task as 1.0 release requirements. Keep native iOS pending and the release draft.

- [x] Add a tested work-item normalization layer combining local tasks, cached GitHub issues and meaningful commit evidence. Keep stable source identities, avoid duplicate repository records and preserve read-only remote work.
- [x] Reuse the shared work data in Overview, All Tasks, project task pages and Reports. Invalidate aggregates after task changes or repository refreshes; show remote-read failures without hiding local tasks. Keep work counts separate from tracked-time analytics.
- [ ] Verify mixed local/remote tasks, completion counts, filters, offline cache, refresh/mutation persistence and Reports in the real desktop UI. Assign bugs/local task to version 1.0, update release notes, review, commit/push and build the corrected draft packages.

No tests write to the owner's database. Commit evidence represents completed changes, rather than fabricated editable task records. A meaningful commit is counted once per repository/SHA; added function names are evidence within that change. Existing remote issues remain read-only.
