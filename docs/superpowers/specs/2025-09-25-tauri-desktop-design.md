# DevTrack Tauri Desktop App - Design Specification

**Date:** 2025-09-25
**Status:** Draft
**Author:** DevTrack Team

---

## 1. Executive Summary

### Project Overview
Build a native desktop application for DevTrack using Tauri v2, leveraging the existing `devtrack-core` Rust library and `devtrack-web` React frontend. The app will run on Windows, macOS, and Linux with direct SQLite access (no API layer needed for local operation), and provide a Web fallback for mobile via PWA.

### Goals
- **MVP in 2-3 weeks**
- **Desktop-first** (Windows, macOS, Linux)
- **Local SQLite sync** - direct database access, no API layer for local operation
- **$0 distribution cost** - No Apple Developer Program, direct distribution via GitHub Releases, Homebrew, Flatpak, etc.
- **Mobile fallback** - PWA on GitHub Pages for iOS/Android

### Non-Goals (Post-MVP)
- iOS/macOS App Store distribution (requires $99/year)
- Native mobile (Tauri mobile is beta)
- Cloud sync (Post-MVP: WebDAV/S3/Git sync)

---

## 2. Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Tauri v2 Desktop App                            │
├─────────────────────────────────────────────────────────────────────┤
│  Frontend (WebView)              │  Backend (Rust)                  │
│  ┌─────────────────────────────┐  │  ┌─────────────────────────────┐│
│  │ devtrack-web (React + TS)   │  │  │ devtrack-core (Rust)        ││
│  │ • Dashboard                 │  │  │ • Projects/Tasks/Subtasks   ││
│  │ • Projects/Tasks            │◄─┼──►│ • Time Tracking             ││
│  │ • Timer                     │  │  │ • Notes (Markdown)          ││
│  │ • Reports                   │  │  │ • Git Integration           ││
│  │ • Settings                  │  │  │ • Time Entries              ││
│  └─────────────────────────────┘  │  │ • SQLite (direct)           ││
│                                   │  └─────────────────────────────┘│
│  Tauri IPC (Commands/Events)      │  Tauri Commands/Events          │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            Desktop (Primary)      Web Fallback
            • Windows (.msi)         • GitHub Pages (PWA)
            • macOS (.dmg/.app)       • Works on iOS Safari
            • Linux (.AppImage, .deb, • Works on Android Chrome
              .rpm, Flatpak, AUR)
```

### Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | Tauri | v2.x (stable) |
| **Frontend** | React + TypeScript + Vite | React 19, TS 5.x |
| **Styling** | Tailwind CSS | v4.x |
| **State** | TanStack Query + Zustand | Latest |
| **Routing** | React Router | v7 |
| **Backend** | Rust | 2024 edition |
| **Database** | SQLite (via `rusqlite`) | Latest |
| **Git** | `git2` | v0.21 |
| **IPC** | Tauri Commands/Events | v2 |

### Data Flow

```
User Action (React)
    │
    ▼
TanStack Query Mutation
    │
    ▼
Tauri IPC (invoke)
    │
    ▼
Rust Command Handler
    │
    ▼
devtrack-core Function
    │
    ▼
SQLite (direct via rusqlite)
    │
    ▼
Return Result
    │
    ▼
TanStack Query Cache Update
    │
    ▼
React Re-render
```

---

## 3. Project Structure

### Workspace Addition
```
DevTrack/
├── Cargo.toml                          # Workspace root
├── crates/
│   ├── devtrack-core/                  # ✅ Existing
│   ├── devtrack-tui/                   # ✅ Existing
│   ├── devtrack-api/                   # ✅ Existing (keep for web sync)
│   ├── devtrack-web/                   # ✅ Existing (becomes Tauri frontend)
│   └── devtrack-desktop/               # 🆕 Tauri v2 app
│       ├── Cargo.toml
│       ├── tauri.conf.json
│       ├── src/
│       │   ├── main.rs                 # Tauri entry + commands
│       │   ├── commands.rs             # Tauri command handlers
│       │   └── state.rs                # App state management
│       ├── frontend/                   # symlink → ../devtrack-web
│       ├── icons/                      # App icons (all platforms)
│       ├── tauri.conf.json
│       └── build.rs                    # Build-time config
├── package.json                        # Root workspace (updated)
└── docs/
    └── superpowers/specs/
        └── 2025-09-25-tauri-desktop-design.md
```

### Key Files

| File | Purpose |
|------|---------|
| `crates/devtrack-desktop/Cargo.toml` | Tauri dependencies, devtrack-core dependency |
| `crates/devtrack-desktop/tauri.conf.json` | Tauri config (window, permissions, updater) |
| `crates/devtrack-desktop/src/main.rs` | App entry, Tauri builder, command registration |
| `crates/devtrack-desktop/src/commands.rs` | All Tauri command handlers |
| `crates/devtrack-desktop/src/state.rs` | App state (DB connection, active timer) |
| `crates/devtrack-desktop/tauri.conf.json` | Window config, permissions, updater config |
| `crates/devtrack-desktop/build.rs` | Embed frontend, generate build info |

---

## 4. Tauri Configuration

### tauri.conf.json (Key Sections)

```json
{
  "build": {
    "frontendDist": "../frontend/dist",
    "devUrl": "http://localhost:3000",
    "beforeDevCommand": "npm run dev --prefix ../devtrack-web",
    "beforeBuildCommand": "npm run build --prefix ../devtrack-web"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": "all",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ],
      "windows": {
        "wix": { "language": "en-US" }
      },
      "macos": {
        "bundleIdentifier": "com.devtrack.app",
        "entitlements": null,
        "signingIdentity": null,
        "providerShortName": null,
        "category": "public.app-category.developer-tools"
      },
      "linux": {
        "deb": { "depends": ["libwebkit2gtk-4.1-0", "libayatana-appindicator3-1"] },
        "appimage": { "bundleMediaFramework": true }
      }
    },
    "allowlist": {
      "all": false,
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "readDir": true,
        "createDir": true,
        "removeFile": true,
        "removeDir": true,
        "copyFile": true
      },
      "dialog": {
        "all": true,
        "open": true,
        "save": true
      },
      "notification": { "all": true },
      "shell": {
        "all": false,
        "open": true
      },
      "window": {
        "all": false,
        "close": true,
        "hide": true,
        "show": true,
        "maximize": true,
        "minimize": true,
        "unmaximize": true,
        "unminimize": true,
        "startDragging": true
      },
      "notification": { "all": true },
      "globalShortcut": { "all": true },
      "clipboard": { "all": true },
      "path": { "all": true }
    },
    "windows": [
      {
        "label": "main",
        "title": "DevTrack",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "center": true,
        "resizable": true,
        "fullscreen": false,
        "maximizable": true,
        "minimizable": true,
        "closable": true,
        "titleBarStyle": "visible",
        "hiddenTitle": false,
        "decorations": true,
        "transparent": false,
        "alwaysOnTop": false,
        "visibleOnAllWorkspaces": false,
        "focus": true,
        "hidden": false
      }
    ],
    "security": {
      "csp": "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://localhost:8080;"
    },
    "updater": {
      "active": true,
      "endpoints": ["https://github.com/The-No-hands-Company/DevTrack/releases/latest/download/latest.json"],
      "dialog": true,
      "pubkey": "INSERT_PUBLIC_KEY_HERE"
    }
  }
}
```

---

## 5. Tauri Commands (IPC)

### Command Registry

All commands are defined in `src/commands.rs` and registered in `main.rs`.

### Project Commands

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `projects_list` | `{ archived?: boolean }` | `Project[]` | List all projects |
| `project_get` | `{ id: number }` | `ProjectWithGit` | Get project with git info |
| `project_create` | `{ name: string, path: string }` | `Project` | Create new project |
| `project_update` | `{ id: number, status?: string, tags?: string }` | `Project` | Update project |
| `project_delete` | `{ id: number }` | `void` | Delete project |
| `project_scan` | `{ path: string }` | `{ found: number }` | Scan directory for projects |
| `project_git` | `{ id: number }` | `GitInfo` | Get git status |

### Task Commands

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `tasks_list` | `{ project_id: number }` | `Task[]` | List project tasks |
| `task_get` | `{ id: number }` | `Task` | Get task details |
| `task_create` | `{ project_id, title, description?, priority?, due_date? }` | `Task` | Create task |
| `task_update` | `{ id, title?, description?, status?, priority?, due_date? }` | `Task` | Update task |
| `task_delete` | `{ id: number }` | `void` | Delete task |
| `task_toggle` | `{ id: number }` | `Task` | Toggle done/undone |

### Subtask Commands

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `subtasks_list` | `{ task_id: number }` | `SubTask[]` | List subtasks |
| `subtask_create` | `{ task_id, title }` | `SubTask` | Create subtask |
| `subtask_update` | `{ id, title?, done? }` | `SubTask` | Update subtask |
| `subtask_delete` | `{ id: number }` | `void` | Delete subtask |

### Time Tracking Commands

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `timer_start` | `{ task_id: number }` | `{ start_time }` | Start timer |
| `timer_stop` | `{ task_id: number }` | `{ duration_seconds }` | Stop timer |
| `timer_active` | `{}` | `{ task_id, start_time }?` | Get active timer |
| `time_entries_list` | `{ period?: "today"\|"week"\|"all" }` | `TimeEntry[]` | List time entries |
| `time_report` | `{ period: "today"\|"week"\|"all" }` | `TimeLogSummary` | Time report |

### Notes Commands

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `notes_get` | `{ project_id: number }` | `string` | Get project notes |
| `notes_update` | `{ project_id, content }` | `void` | Update notes |

### System Commands

| Command | Parameters | Returns | Description |
|---------|------------|---------|-------------|
| `dashboard_summary` | `{}` | `DashboardSummary` | Dashboard stats |
| `project_open_path` | `{ id: number }` | `void` | Open project in file explorer |
| `project_open_terminal` | `{ id: number }` | `void` | Open terminal at project path |
| `app_get_data_dir` | `{}` | `string` | Get app data directory |
| `app_backup` | `{}` | `string` | Create backup |
| `app_export_data` | `{}` | `string` | Export all data as JSON |
| `app_import_data` | `{ json: string }` | `void` | Import data |

---

## 5. Frontend Integration

### API Layer (`src/api/client.ts`)

```typescript
// Tauri invoke wrapper
import { invoke } from '@tauri-apps/api/core';

export const api = {
  projects: {
    list: (archived?: boolean) => invoke('projects_list', { archived }),
    get: (id: number) => invoke('project_get', { id }),
    create: (data: CreateProjectRequest) => invoke('project_create', data),
    update: (id: number, data: UpdateProjectRequest) => invoke('project_update', { id, data }),
    delete: (id: number) => invoke('project_delete', { id }),
    scan: (path: string) => invoke('project_scan', { path }),
    git: (id: number) => invoke('project_git', { id }),
  },
  tasks: {
    list: (projectId: number) => invoke('tasks_list', { project_id: projectId }),
    get: (id: number) => invoke('task_get', { id }),
    create: (projectId: number, data: CreateTaskRequest) => invoke('task_create', { projectId, data }),
    update: (id: number, data: UpdateTaskRequest) => invoke('task_update', { id, data }),
    delete: (id: number) => invoke('task_delete', { id }),
    toggle: (id: number) => invoke('task_toggle', { id }),
  },
  // ... similar for subtasks, timer, notes, reports, system
};
```

### TanStack Query Integration

```typescript
// hooks/useApi.ts - Same as web, but using Tauri invoke
export const useProjects = (archived = false) =>
  useQuery({
    queryKey: ['projects', archived],
    queryFn: () => api.projects.list(archived),
  });
```

### Tauri-Specific Features

```typescript
// Native file dialog
import { open } from '@tauri-apps/api/dialog';
const path = await open({ directory: true, multiple: false });

// Native notifications
import { sendNotification } from '@tauri-apps/api/notification';
await sendNotification({ title: 'Timer Complete', body: 'Task finished!' });

// System tray
import { SystemTray, SystemTrayEvent } from '@tauri-apps/api/system-tray';
const tray = await SystemTray.new({
  icon: 'icons/tray-icon.png',
  menu: [/* menu items */],
});

// Global shortcuts
import { register } from '@tauri-apps/api/globalShortcut';
await register('Ctrl+Shift+T', () => { /* start/stop timer */ });
```

---

## 6. Data Directory & Sync

### Platform Data Directories

| Platform | Path |
|----------|------|
| **Windows** | `%APPDATA%\devtrack\projects.db` |
| **macOS** | `~/Library/Application Support/devtrack/projects.db` |
| **Linux** | `~/.local/share/devtrack/projects.db` |

### Sync Strategy (MVP)

| Feature | Implementation |
|---------|----------------|
| **Local Sync** | Direct SQLite access (same file) |
| **Backup** | Copy `.db` to user-chosen location |
| **Export/Import** | JSON export/import (all data) |
| **WebDAV** | Config UI + background sync (Post-MVP) |
| **Git Sync** | Git repo with `.db` + notes (Post-MVP) |

### Web Fallback (PWA)

- Host `devtrack-web/dist` on GitHub Pages
- Service worker for offline
- Calls `devtrack-api` when online
- Manifest for "Add to Home Screen"

---

## 7. Build & Distribution

### Build Pipeline (GitHub Actions)

```yaml
# .github/workflows/build.yml
name: Build & Release
on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Install deps
        run: |
          cd crates/devtrack-web && npm ci
          cd ../devtrack-desktop && cargo build --release
      - name: Build Tauri
        run: cargo tauri build --release
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: devtrack-${{ matrix.os }}
          path: |
            crates/devtrack-desktop/target/release/bundle/**/*
            crates/devtrack-desktop/target/release/devtrack*
```

### Distribution Artifacts

| Platform | Artifact | Distribution |
|----------|----------|--------------|
| **Windows** | `.msi`, `.exe` | GitHub Releases, Scoop, Chocolatey |
| **macOS** | `.dmg`, `.app.tar.gz` | GitHub Releases, Homebrew |
| **Linux** | `.AppImage`, `.deb`, `.rpm`, `.tar.gz` | GitHub Releases, Flathub, AUR |
| **Source** | `.tar.gz` | GitHub Releases |

---

## 8. Security Considerations

### CSP Policy
```
default-src 'self' data: blob:;
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self' http://localhost:8080;
```

### Permissions (Minimal)
- **File System**: Read/Write app data dir only
- **Dialog**: Open/Save file dialogs
- **Shell**: Open external (file explorer, terminal)
- **Notification**: Timer completion
- **Global Shortcut**: Timer toggle (Ctrl+Shift+T)
- **Clipboard**: Copy task/project info
- **Window**: Standard window controls

### No Apple Signing
- **No notarization** - Direct distribution
- **Gatekeeper workaround**: Users right-click → Open
- **Documentation**: Clear install instructions per platform

---

## 9. Testing Strategy

### Unit Tests (Rust)
```bash
cargo test --workspace
```
- `devtrack-core` queries
- `devtrack-desktop` command handlers
- Git integration

### Integration Tests
```bash
# Tauri integration tests
cargo test --package devtrack-desktop --test integration
```

### Frontend Tests
```bash
cd crates/devtrack-web && npm run test
```
- Component tests (React Testing Library)
- Hook tests (TanStack Query)
- Store tests (Zustand)

### E2E Tests (Post-MVP)
- Playwright for Tauri app

---

## 10. Timeline & Milestones

| Week | Focus | Deliverable |
|------|-------|-------------|
| **1** | Tauri Setup + Core Integration | Working Tauri app with project/task CRUD |
| **2** | UI Polish + Native Features | Timer, tray, notifications, shortcuts, native dialogs |
| **3** | Sync + Polish + Build Pipeline | Backup/export, GitHub Actions, artifacts |

### Definition of Done (MVP)
- [ ] Tauri app builds on Windows/macOS/Linux
- [ ] All CRUD operations work (projects, tasks, subtasks)
- [ ] Timer works with tray indicator + notifications
- [ ] Git status shows in project list
- [ ] Notes view/edit works
- [ ] Time reports generate correctly
- [ ] Build pipeline produces artifacts for all 3 platforms
- [ ] GitHub Releases page has downloadable artifacts
- [ ] Web fallback (PWA) deployed to GitHub Pages

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tauri v2 API changes | Low | Medium | Pin Tauri version; test on each update |
| WebKit/WebView2 bugs | Medium | Medium | Test on all 3 platforms weekly |
| SQLite locking issues | Low | High | Use `Mutex<Connection>`; WAL mode |
| Apple Gatekeeper warnings | High | Medium | Clear install docs; recommend Homebrew |
| Bundle size > 100MB | Low | Low | Optimize assets; enable compression |
| WebView2 not on Windows 7 | Low | Low | Require Windows 10+ (documented) |

---

## 12. Appendix: Tauri Command Implementation Template

```rust
// crates/devtrack-desktop/src/commands.rs
use tauri::State;
use devtrack_core::{queries, Config, Connection};

#[tauri::command]
async fn projects_list(state: State<'_, AppState>, archived: Option<bool>) -> Result<Vec<Project>, String> {
    let conn = state.db.lock().unwrap();
    queries::get_all_projects(&conn, archived.unwrap_or(false))
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn project_create(state: State<'_, AppState>, name: String, path: String) -> Result<Project, String> {
    let conn = state.db.lock().unwrap();
    let abs_path = std::fs::canonicalize(&path).map_err(|e| e.to_string())?.to_string_lossy().into_owned();
    let id = queries::create_project(&conn, &name, &abs_path).map_err(|e| e.to_string())?;
    Ok(Project { id, name, path: abs_path, status: "Active".into(), tags: String::new(), last_accessed: None, created_at: chrono::Utc::now().to_rfc3339() })
}

// ... register all commands in main.rs
```

---

## 13. Approval

**Spec Status:** Draft - Ready for Review

**Next Steps:**
1. Review this spec - request changes if needed
2. Upon approval → Invoke `writing-plans` skill for implementation plan
3. Begin Week 1 implementation

---

*End of Design Specification*