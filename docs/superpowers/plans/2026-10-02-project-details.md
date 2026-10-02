# Project details and completed work

**Goal:** Open registered projects to local files and a README, plus a sortable/filterable completed-work history fetched from GitHub.
**Architecture:** A core repository module confines read-only filesystem access to the registered project root and normalizes Git/GitHub commit evidence. Async desktop commands run filesystem work off the UI thread and fetch GitHub history using the user's GitHub CLI authentication. React detail routes reuse the existing shell. Imported history stays separate from manually managed tasks.
**Tech stack:** Rust/git2/serde/regex, Tauri IPC, React/React Query, GitHub REST via gh.

## Constraints
- Preserve local-first behavior, existing project data, and the approved design.
- No writes to project files or remote repositories. No artificial completed tasks without commit provenance.
- Local history works offline. GitHub synchronization reports inaccessible repos honestly.
- Paths must remain within the project root; text previews are bounded; symlinks outside it are unavailable.
- Treat function names and change classification as evidence-based heuristics, not proof of completed product features.

## Implementation
- [x] Core repository browsing, README/text previews, remote identification, commit normalization; regression tests for containment and classification.
- [x] Desktop IPC for browsing/local history and paginated GitHub synchronization with timeouts and disk caching.
- [x] Project detail route, Files/Completed work tabs, sorting/search/type/module/file/function/author filters and commit evidence expansion.
- [x] Native integration checks with a temporary Git repository, real GitHub access checks for registered projects, frontend build/lint and desktop tests without a server.
- [x] Rebuild and update the user's installed desktop application after verification.
