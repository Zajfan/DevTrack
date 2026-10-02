# DevTrack

[![Rust](https://img.shields.io/badge/Rust-stable-orange.svg)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8D8.svg)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> A local-first project management system for solo developers. Projects, tasks, subtasks, notes, and time tracking — with Git awareness built in.

The current versioned backlog is in [ROADMAP.md](ROADMAP.md) and [GitHub milestones](https://github.com/Zajfan/DevTrack/milestones). The [1.0 release](docs/releases/1.0.0.md) remains a draft while the remaining platform requirements are pending.

## Why DevTrack

Most PM tools are built for teams, servers, and browsers. DevTrack is built for **one developer working across many projects**:

- **Local-first** — your data lives in a single SQLite file on your machine. No server, no account, no telemetry.
- **Git-aware** — DevTrack knows each project's branch, ahead/behind count, stashes, and dirty state.
- **One binary** — the Tauri desktop app embeds the Rust core; no runtime dependencies.
- **Time tracking that stays out of the way** — start/stop a timer on any task from the app, the tray, or a global hotkey.

## Features

### Projects
- Register projects by path or **auto-discover** them (`.git`, `Cargo.toml`, `package.json`, `go.mod`)
- Status lifecycle: Active → Paused → Archived
- Clickable tags show all projects with that tag, including archived projects
- Live Git status: branch, `↑ahead ↓behind`, stash count, dirty indicator
- Open in file explorer or terminal, native directory picker
- Per-project Markdown notes, stored locally
- Open a project to browse local files with its README underneath
- Completed-work history from GitHub, with feature/function filters and local Git fallback

### Tasks
- Tasks with priority (High/Medium/Low), due dates, and descriptions
- Planned-work tab combining local tasks and open GitHub issues, with source/Todo/Done filters and numeric version grouping
- GitHub milestones supply issue target versions; GitHub issues stay read-only and link to the original
- Target versions support `1.0`, `0.1.0`, and prereleases such as `0.1.0-alpha.1`; existing tasks remain unscheduled
- **Sub-tasks** with progress counters
- Global todo view across all projects, sorted by priority
- Create, edit, toggle, delete — from the UI or the CLI

### Time Tracking
- Start/stop timer on any task (app, tray, or `Ctrl+Shift+T` from anywhere)
- Today / week / all-time reports, aggregated per project
- Optional notes on each time entry

### Native Desktop (Tauri v2)
- Real platform menu bar (File/Edit/View/Window/Help)
- System tray with live timer
- Global shortcut (`Ctrl+Shift+T`), native file dialogs, native notifications
- Single-instance, window state persistence
- Keyboard-first: `Ctrl+1..7` sections, `Ctrl+K` search, `Ctrl+,` settings

### CLI + REST API
- Full-featured CLI for terminal workflows
- REST API for scripts, web, and mobile clients

GitHub history synchronization uses the optional [GitHub CLI](https://cli.github.com/). Install `gh` and run `gh auth login`; file browsing and local Git history work offline without it.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   devtrack-desktop (Tauri v2)             │
│   React + TypeScript UI  ◄──Tauri IPC──►  devtrack-core   │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────┐   ┌───────────────────────────┐
│  devtrack-tui (CLI)      │   │  devtrack-api (REST)      │
│  Ratatui + Clap          │   │  Axum + Tokio             │
└──────────────────────────┘   └───────────────────────────┘
              └──────────────┬──────────────┘
                             ▼
                   ┌──────────────────┐
                   │  devtrack-core   │  Rust library: models,
                   │  (shared)        │  queries, git2, SQLite
                   └────────┬─────────┘
                            ▼
                   ~/.local/share/devtrack/
                     ├── projects.db      (SQLite, WAL)
                     └── notes/*.md       (Markdown)
```

## Project Structure

```
DevTrack/
├── Cargo.toml                 # Workspace root
├── crates/
│   ├── devtrack-core/         # Shared library: models, queries, git, storage
│   ├── devtrack-tui/          # CLI + TUI (binary: devtrack)
│   ├── devtrack-api/          # REST API server (binary: devtrack-api)
│   ├── devtrack-web/          # React + TypeScript + Vite frontend
│   └── devtrack-desktop/      # Tauri v2 desktop app
├── .github/workflows/         # Build, release, web-deploy CI
└── docs/                      # Specs and design documents
```

## Quick Start

### Desktop app (recommended)

```bash
git clone git@github.com:Zajfan/DevTrack.git
cd DevTrack
npm install            # workspace tooling
npm run dev:desktop    # builds and launches the Tauri app
```

The first build takes a few minutes; after that, hot reload makes UI changes instant.

### Production build

```bash
npm run build:desktop  # bundles .deb/.rpm/.AppImage/.dmg/.msi
```

Artifacts land in `target/release/bundle/`.

### CLI

```bash
cargo build --release --bin devtrack
./target/release/devtrack --help

# Common commands
devtrack add -n "MyProject" ~/code/my-project   # register a project
devtrack scan ~/code                            # auto-discover projects
devtrack ls                                     # list with git status
devtrack task add MyProject "Fix the parser" -p High
devtrack task ls MyProject
devtrack log today                              # time report
devtrack dashboard                              # TUI dashboard
```

### REST API

```bash
cargo run --bin devtrack-api                    # serves on :8080

curl http://localhost:8080/projects
curl http://localhost:8080/dashboard/summary
curl "http://localhost:8080/reports/time?period=week"
```

| Resource | Endpoints |
|----------|-----------|
| Projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `GET /projects/:id/git` |
| Tasks | `GET/POST /projects/:id/tasks`, `GET/PATCH/DELETE /tasks/:id` |
| Subtasks | `GET/POST /tasks/:id/subtasks`, `PATCH/DELETE /subtasks/:id` |
| Notes | `GET/PUT /projects/:id/notes` |
| Time | `GET/POST /time-entries`, `GET /time-entries/active`, `POST /time-entries/:id/stop` |
| Reports | `GET /reports/time?period=today\|week\|all` |
| Dashboard | `GET /dashboard/summary` |

### Web (mobile fallback)

```bash
cd crates/devtrack-web && npm run dev    # dev server on :3000
npm run build                            # PWA build with service worker
```

## Data & Backups

All data lives in one directory (platform conventions):

| Platform | Path |
|----------|------|
| Linux | `~/.local/share/devtrack/` |
| macOS | `~/Library/Application Support/devtrack/` |
| Windows | `%APPDATA%\devtrack\` |

```bash
devtrack backup     # timestamped copy of the database
```

## Requirements

- **Rust** stable (2021 edition workspace)
- **Node.js 18+** for the frontend
- **Linux**: WebKitGTK 4.1 (`libwebkit2gtk-4.1-dev`), optional tray support (`libayatana-appindicator3`)
- **Windows**: WebView2 (preinstalled on Windows 10/11)
- **macOS**: none beyond Xcode CLT for building

## Distribution

No paid developer programs required — everything ships free:

| Platform | Artifact | Channels |
|----------|----------|----------|
| Linux | `.deb`, `.rpm`, `.AppImage` | GitHub Releases, AUR (planned) |
| macOS | `.dmg`, `.app` | GitHub Releases, Homebrew (planned) — unsigned, see [Gatekeeper notes](docs/GATEKEEPER_WORKAROUND.md) |
| Windows | `.msi`, `.exe` | GitHub Releases, Scoop/Chocolatey (planned) |
| Mobile | PWA | GitHub Pages |

## Development

```bash
cargo build --workspace        # build everything
cargo test --workspace         # Rust tests
cargo clippy --workspace       # lint
cd crates/devtrack-web && npm run lint && npm run build
```

The codebase is a Cargo workspace: `devtrack-core` holds all models/queries so the TUI, API, and desktop app share one implementation.

## Contributing

Issues, suggestions, and PRs are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).

---

**DevTrack** — one developer, many projects, zero friction.
