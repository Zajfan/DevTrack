# Changelog

All notable changes to DevTrack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — Draft candidate

**Not yet published.** The release stays a draft until Windows, macOS, Linux, iOS, Android, and HarmonyOS packages are ready and verified. Native iOS and HarmonyOS remain pending. See [release notes](docs/releases/1.0.0.md) and [verification evidence](docs/releases/1.0-verification.md).

### Added

- **Mobile companion** — dark-themed Android app (Android 8+) that manages projects, tasks, version plans and notes offline without requiring source folders or a localhost server. Reads public GitHub issues and completed commits with meaningful-change, file and function filters. Signed APK with a stable self-generated key.
- **Offline-first** — companion works fully offline; GitHub data cached on last refresh. Desktop GitHub history and issues also cached per project.
- **Project repository history** — each project page shows its files with read-only source preview and a README, plus completed-work history from GitHub with feature, fix, module, file, function and author filters.
- **Planned work tab** — combines local tasks and open GitHub issues by target version, with numeric version grouping and prerelease version support (`1.0`, `0.1.0-alpha.1`, etc.). GitHub issues link back to GitHub; they are read-only in DevTrack.
- **Clickable project tags** — clicking a tag shows every project with that exact tag, including archived ones.
- **Global task view** — All Tasks across all projects, sortable and filterable by source, status, project and target version.
- **Git-based data sync** — optional synchronization of the local database to a private GitHub repository.
- **Quick Commit** — from the workspace, stage, commit and push without leaving DevTrack; refreshes completed history after push.
- **Due-date intelligence** — overdue and approaching tasks surface automatically in the workspace overview.
- **Consistent workspace counts** — Overview, project cards, All Tasks and Reports share one view of local tasks, cached GitHub issues and meaningful commit evidence.
- **Desktop verification harness** — `--features desktop-test` build drives the real native webview and Rust backend through WebDriver; covers schema migration, project CRUD, file/README preview, Git history, task version editing, Unicode notes, persistence across restarts, and repository relocation.
- **Desktop Verification CI** — GitHub Actions workflow running the harness on Ubuntu, Windows Server, macOS Apple Silicon and macOS Intel; separate jobs build and smoke-test production installers.

### Fixed

- Overview, project cards, All Tasks and Reports now use one consistent workspace view rather than separate queries that could disagree.
- Local tasks remain available while remote work is offline; repository fetching happens on explicit refresh with cached evidence retained.
- Completing tasks from All Tasks correctly updates the Overview and Reports.
- Reports show planned/completed work separately from timer-based hours.
- Project open-work counts include cached GitHub issues.
- Linux AppImage repaired to remove bundled Wayland libraries that conflicted with host graphics stacks (Fedora, others).
- Android navigation bar theme scoped to supported API levels.
- Android system bars and dialogs use dark mode throughout.

### Changed

- Rewritten from C++23/Electron to **Rust + Tauri v2 + React + TypeScript**. The entire backend is a single Rust binary embedding SQLite; no localhost server is required.
- Data stored in `~/.local/share/devtrack/projects.db` (SQLite WAL mode). Tasks without a target version appear as Unscheduled on upgrade.
- Platform menu bar (File/Edit/View/Window/Help), system tray with live timer, global shortcut (`Ctrl+Shift+T`), native file dialogs and notifications.
- Keyboard-first navigation: `Ctrl+1–7` sections, `Ctrl+K` search, `Ctrl+,` settings.
- GitHub milestones supply issue target versions; issues are read-only and link to GitHub for editing.
- Manual JSON transfer between desktop and companion. Desktop exports seed the companion preserving completed status and target versions; notes and repository URLs are not yet included. Companion backups cannot yet be imported into desktop. No automatic phone/desktop synchronization.

### Known limitations

- Windows and macOS packages have no publisher code-signing certificate; unknown-publisher prompts may appear on first launch.
- Native iOS companion is pending (no paid Apple membership).
- Native HarmonyOS companion requires a separate port, SDK and signing setup.
- Desktop/companion transfer omits notes and repository URLs; companion backups cannot be imported into desktop.

---

## [0.1.0] — 2024-11-14

Initial public release.

- C++23 backend with CMake build system
- Electron + React + TypeScript frontend
- SQLite database with project, task and concept tables
- REST API, Material-UI, dark/light theme
- Cross-platform (Windows, macOS, Linux)

[1.0.0]: https://github.com/Zajfan/DevTrack/compare/v0.1.0...v1.0.0-draft.1
[0.1.0]: https://github.com/Zajfan/DevTrack/releases/tag/v0.1.0
