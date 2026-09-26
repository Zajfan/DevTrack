# DevTrack Tauri Desktop App - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tauri v2 desktop app for DevTrack with direct SQLite access via `devtrack-core`, reusing `devtrack-web` React frontend, targeting Windows/macOS/Linux with $0 distribution cost.

**Architecture:** Tauri v2 desktop app with `devtrack-core` Rust backend (direct SQLite via `rusqlite`) and `devtrack-web` React frontend. IPC via Tauri commands. Direct distribution via GitHub Releases (no Apple Developer Program).

**Tech Stack:** Tauri v2, React 19 + TypeScript + Vite, Tailwind CSS v4, TanStack Query, Zustand, Tauri Commands/Events, `devtrack-core` (Rust + `rusqlite` + `git2`)

**Spec:** `docs/superpowers/specs/2025-09-25-tauri-desktop-design.md`

---

## Global Constraints

- **Tauri version:** v2.x (stable, pinned)
- **Rust edition:** 2024
- **React:** 19 + TypeScript 5.x
- **Target platforms:** Windows 10+, macOS 11+, Linux (WebKitGTK 4.1+)
- **No Apple Developer Program:** Direct distribution only (GitHub Releases, Homebrew, Flatpak)
- **No notarization:** Direct distribution with Gatekeeper workaround docs
- **Database:** SQLite via `rusqlite` with `Mutex<Connection>`, WAL mode
- **IPC:** Tauri Commands (async) + Events (timer updates)
- **Frontend:** `devtrack-web` reused as Tauri frontend (symlink)
- **Backend:** `devtrack-core` library (direct SQLite, no API layer)
- **Distribution:** GitHub Releases (all platforms), Homebrew (macOS), Flatpak/AUR (Linux), Scoop/Chocolatey (Windows)

---

## File Structure Map

### New Files to Create
```
crates/devtrack-desktop/
├── Cargo.toml
├── tauri.conf.json
├── build.rs
├── src/
│   ├── main.rs           # Tauri entry, command registration
│   ├── commands.rs       # All Tauri command handlers
│   └── state.rs          # App state (DB connection, active timer)
├── tauri.conf.json
├── icons/
│   ├── 32x32.png
│   ├── 128x128.png
│   ├── 128x128@2x.png
│   ├── icon.icns
│   ├── icon.ico
│   └── tray-icon.png
├── frontend/             # symlink → ../devtrack-web
├── build.rs
└── tauri.conf.json
```

### Existing Files to Modify
- `Cargo.toml` (workspace root) - add `devtrack-desktop` member
- `package.json` (root) - add `dev:desktop` script
- `.github/workflows/build.yml` - add Tauri build matrix
- `crates/devtrack-web/vite.config.ts` - ensure Tauri-compatible build

---

## Task Breakdown

---

### Task 1: Workspace Setup & Tauri Project Initialization

**Files:**
- Create: `crates/devtrack-desktop/Cargo.toml`
- Create: `crates/devtrack-desktop/tauri.conf.json`
- Create: `crates/devtrack-desktop/build.rs`
- Create: `crates/devtrack-desktop/src/state.rs`
- Create: `crates/devtrack-desktop/src/commands.rs`
- Create: `crates/devtrack-desktop/src/main.rs`
- Create: `crates/devtrack-desktop/icons/` (directory + placeholder icons)
- Modify: `Cargo.toml` (workspace root)
- Modify: `package.json` (root)

**Interfaces:**
- Produces: `AppState` struct with `db: Arc<Mutex<Connection>>`, `config: Config`, `active_timer: Arc<Mutex<Option<(i64, i64)>>>`
- Produces: Tauri commands registered in `main.rs`

- [ ] **Step 1: Write Cargo.toml for devtrack-desktop**

```toml
# crates/devtrack-desktop/Cargo.toml
[package]
name = "devtrack-desktop"
version = "0.1.0"
edition = "2024"

[dependencies]
devtrack-core = { path = "../devtrack-core" }
tauri = { version = "2", features = ["shell-open", "dialog-all", "notification", "global-shortcut", "clipboard-manager", "fs-all", "path", "window-all", "process", "updater"] }
tauri-plugin-store = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
chrono = "0.4"
anyhow = "1"
directories = "6"
walkdir = "2"
```

- [ ] **Step 2: Write tauri.conf.json**

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
      "macos": {
        "bundleIdentifier": "com.devtrack.app",
        "entitlements": null,
        "signingIdentity": null,
        "category": "public.app-category.developer-tools"
      },
      "linux": {
        "deb": { "depends": ["libwebkit2gtk-4.1-0", "libayatana-appindicator3-1"] },
        "appimage": { "bundleMediaFramework": true }
      }
    },
    "allowlist": {
      "all": false,
      "fs": { "readFile": true, "writeFile": true, "readDir": true, "createDir": true, "removeFile": true, "removeDir": true, "copyFile": true },
      "dialog": { "open": true, "save": true },
      "notification": { "all": true },
      "shell": { "open": true },
      "window": { "close": true, "hide": true, "show": true, "maximize": true, "minimize": true, "unmaximize": true, "unminimize": true, "startDragging": true },
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
        "maximizable": true,
        "minimizable": true,
        "closable": true,
        "decorations": true,
        "visibleOnAllWorkspaces": false
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

- [ ] **Step 3: Write build.rs**

```rust
// crates/devtrack-desktop/build.rs
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 4: Write state.rs**

```rust
// crates/devtrack-desktop/src/state.rs
use devtrack_core::{Config, Connection};
use rusqlite::Connection as SqliteConnection;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct AppState {
    pub config: Config,
    pub db: Arc<Mutex<SqliteConnection>>,
    pub active_timer: Arc<Mutex<Option<(i64, i64)>>>, // (task_id, start_time)
}

impl AppState {
    pub fn new() -> anyhow::Result<Self> {
        let config = Config::new()?;
        let conn = devtrack_core::init_db(&config)?;
        Ok(Self {
            config,
            db: Arc::new(Mutex::new(conn)),
            active_timer: Arc::new(Mutex::new(None)),
        })
    }

    pub fn now_ts() -> i64 {
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64
    }
}
```

- [ ] **Step 5: Write commands.rs skeleton**

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

// ... (all other commands from spec Section 5)

pub fn register_commands(app: &mut tauri::App<tauri::Wry>) {
    app.invoke_handler(tauri::generate_handler![
        projects_list, project_get, project_create, project_update, project_delete, project_scan, project_git,
        tasks_list, task_get, task_create, task_update, task_delete, task_toggle,
        subtasks_list, subtask_create, subtask_update, subtask_delete,
        timer_start, timer_stop, timer_active, time_entries_list, time_report,
        notes_get, notes_update,
        dashboard_summary, project_open_path, project_open_terminal,
        app_get_data_dir, app_backup, app_export_data, app_import_data,
    ]);
}
```

- [ ] **Step 6: Write main.rs**

```rust
// crates/devtrack-desktop/src/main.rs
use tauri::Manager;
use devtrack_desktop::{state::AppState, commands::register_commands};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let state = AppState::new().expect("Failed to initialize app state");
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // all commands registered here
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 7: Update workspace Cargo.toml**

```toml
# Cargo.toml (root)
[workspace]
resolver = "2"
members = [
    "crates/devtrack-core",
    "crates/devtrack-tui",
    "crates/devtrack-api",
    "crates/devtrack-web",
    "crates/devtrack-desktop",  # ADD THIS
]
```

- [ ] **Step 8: Update root package.json**

```json
{
  "scripts": {
    "dev": "concurrently \"cargo run --bin devtrack-api\" \"npm run dev --prefix crates/devtrack-web\"",
    "dev:desktop": "cargo tauri dev --manifest-path crates/devtrack-desktop/Cargo.toml",
    "build": "cargo build --workspace --release && npm run build --prefix crates/devtrack-web",
    "build:desktop": "cargo tauri build --manifest-path crates/devtrack-desktop/Cargo.toml"
  }
}
```

- [ ] **Step 9: Create icons directory with placeholders**

```bash
mkdir -p crates/devtrack-desktop/icons
# Create placeholder icons (32x32, 128x128, 128x128@2x, icon.icns, icon.ico, tray-icon.png)
```

- [ ] **Step 10: Create frontend symlink**

```bash
cd crates/devtrack-desktop && ln -s ../devtrack-web frontend
```

- [ ] **Step 11: Verify build compiles**

```bash
cargo build --package devtrack-desktop
```

---

### Task 2: Implement All Tauri Commands (Projects)

**Files:**
- Modify: `crates/devtrack-desktop/src/commands.rs`

**Interfaces:**
- Consumes: `AppState` with `db: Arc<Mutex<Connection>>`
- Produces: All project commands returning `Result<T, String>`

- [ ] **Step 1: Implement `projects_list`**

```rust
#[tauri::command]
async fn projects_list(state: State<'_, AppState>, archived: Option<bool>) -> Result<Vec<Project>, String> {
    let conn = state.db.lock().unwrap();
    queries::get_all_projects(&conn, archived.unwrap_or(false))
        .map_err(|e| e.to_string())
}
```

- [ ] **Step 2: Implement `project_get`**

```rust
#[tauri::command]
async fn project_get(state: State<'_, AppState>, id: i64) -> Result<ProjectWithGit, String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())?;
    let git = get_git_info(&project.path).map(|g| g.display_string());
    Ok(ProjectWithGit { project, git })
}
```

- [ ] **Step 3: Implement `project_create`**

```rust
#[tauri::command]
async fn project_create(state: State<'_, AppState>, name: String, path: String) -> Result<Project, String> {
    let conn = state.db.lock().unwrap();
    let abs_path = std::fs::canonicalize(&path).map_err(|e| e.to_string())?.to_string_lossy().into_owned();
    let id = queries::create_project(&conn, &name, &abs_path).map_err(|e| e.to_string())?;
    Ok(Project { id, name, path: abs_path, status: "Active".into(), tags: String::new(), last_accessed: None, created_at: chrono::Utc::now().to_rfc3339() })
}
```

- [ ] **Step 4: Implement `project_update`, `project_delete`, `project_scan`, `project_git`**

```rust
#[tauri::command]
async fn project_update(state: State<'_, AppState>, id: i64, status: Option<String>, tags: Option<String>) -> Result<Project, String> {
    let conn = state.db.lock().unwrap();
    queries::update_project(&conn, id, status.as_deref(), tags.as_deref()).map_err(|e| e.to_string())?;
    queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn project_delete(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::delete_project(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn project_scan(state: State<'_, AppState>, path: String) -> Result<usize, String> {
    let conn = state.db.lock().unwrap();
    queries::scan_projects(&conn, &std::path::PathBuf::from(path)).map_err(|e| e.to_string())
}

#[tauri::command]
async fn project_git(state: State<'_, AppState>, id: i64) -> Result<GitInfo, String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())?;
    get_git_info(&project.path).ok_or_else(|| "Not a git repository".to_string())
}
```

- [ ] **Step 5: Register commands in main.rs and test**

```bash
cargo build --package devtrack-desktop
cargo run --package devtrack-desktop -- projects_list
```

---

### Task 3: Implement Task & Subtask Commands

**Files:**
- Modify: `crates/devtrack-desktop/src/commands.rs`

**Interfaces:**
- Consumes: `AppState` with DB connection
- Produces: All task/subtask commands

- [ ] **Step 1: Implement `tasks_list`, `task_get`, `task_create`, `task_update`, `task_delete`, `task_toggle`**

```rust
#[tauri::command]
async fn tasks_list(state: State<'_, AppState>, project_id: i64) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().unwrap();
    queries::get_tasks_for_project(&conn, project_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn task_create(state: State<'_, AppState>, project_id: i64, title: String, description: Option<String>, priority: Option<String>, due_date: Option<String>) -> Result<Task, String> {
    let conn = state.db.lock().unwrap();
    let priority = priority.unwrap_or_else(|| "Medium".to_string());
    let id = queries::create_task(&conn, project_id, &title, description.as_deref(), Some(&priority), due_date.as_deref()).map_err(|e| e.to_string())?;
    queries::get_task_by_id(&conn, id).map_err(|e| e.to_string())
}

// ... task_get, task_update, task_delete, task_toggle similarly
```

- [ ] **Step 2: Implement subtask commands**

```rust
#[tauri::command]
async fn subtasks_list(state: State<'_, AppState>, task_id: i64) -> Result<Vec<SubTask>, String> {
    let conn = state.db.lock().unwrap();
    queries::get_subtasks(&conn, task_id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn subtask_create(state: State<'_, AppState>, task_id: i64, title: String) -> Result<SubTask, String> {
    let conn = state.db.lock().unwrap();
    let id = queries::create_subtask(&conn, task_id, &title).map_err(|e| e.to_string())?;
    let mut subtasks = queries::get_subtasks(&conn, task_id).map_err(|e| e.to_string())?;
    subtasks.into_iter().find(|s| s.id == id).ok_or_else(|| "Failed to fetch created subtask".to_string())
}

// ... subtask_update, subtask_delete similarly
```

---

### Task 4: Implement Time Tracking Commands

**Files:**
- Modify: `crates/devtrack-desktop/src/commands.rs`
- Modify: `crates/devtrack-desktop/src/state.rs` (add active_timer management)

**Interfaces:**
- Produces: Timer commands with active timer state management

- [ ] **Step 1: Add active timer management to state.rs**

```rust
// In state.rs
impl AppState {
    pub fn start_timer(&self, task_id: i64) -> anyhow::Result<i64> {
        let conn = self.db.lock().unwrap();
        let start = queries::start_timer(&conn, task_id)?;
        *self.active_timer.lock().unwrap() = Some((task_id, start));
        Ok(start)
    }

    pub fn stop_timer(&self, task_id: i64) -> anyhow::Result<Option<i64>> {
        let conn = self.db.lock().unwrap();
        let duration = queries::stop_timer(&conn, task_id)?;
        if let Some((active_id, _)) = *self.active_timer.lock().unwrap() {
            if active_id == task_id {
                *self.active_timer.lock().unwrap() = None;
            }
        }
        Ok(duration)
    }

    pub fn get_active_timer(&self) -> Option<(i64, i64)> {
        *self.active_timer.lock().unwrap()
    }
}
```

- [ ] **Step 2: Implement timer commands**

```rust
#[tauri::command]
async fn timer_start(state: State<'_, AppState>, task_id: i64) -> Result<StartTimerResponse, String> {
    let start = state.start_timer(task_id).map_err(|e| e.to_string())?;
    Ok(StartTimerResponse { task_id, start_time: start })
}

#[tauri::command]
async fn timer_stop(state: State<'_, AppState>, task_id: i64) -> Result<StopTimerResponse, String> {
    let duration = state.stop_timer(task_id).map_err(|e| e.to_string())?;
    Ok(StopTimerResponse { task_id, duration_seconds: duration.unwrap_or(0) })
}

#[tauri::command]
async fn timer_active(state: State<'_, AppState>) -> Result<Option<ActiveTimerResponse>, String> {
    if let Some((task_id, start)) = state.get_active_timer() {
        let elapsed = crate::state::now_ts() - start;
        Ok(Some(ActiveTimerResponse { task_id, start_time: start, elapsed }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn time_entries_list(state: State<'_, AppState>, period: Option<String>) -> Result<Vec<TimeEntry>, String> {
    let conn = state.db.lock().unwrap();
    let filter = period.unwrap_or_else(|| "today".to_string());
    queries::get_time_entries(&conn, &filter).map_err(|e| e.to_string())
}

#[tauri::command]
async fn time_report(state: State<'_, AppState>, period: String) -> Result<TimeLogSummary, String> {
    let conn = state.db.lock().unwrap();
    queries::get_time_log_report(&conn, &period).map_err(|e| e.to_string())
}
```

- [ ] **Step 3: Add Tauri event emission for timer updates**

```rust
// In timer_start/stop, emit event for UI updates
use tauri::Emitter;
app.emit("timer_update", TimerUpdateEvent { active: true, task_id, elapsed }).ok();
```

---

### Task 5: Implement Notes, System, and Dashboard Commands

**Files:**
- Modify: `crates/devtrack-desktop/src/commands.rs`

- [ ] **Step 1: Notes commands**

```rust
#[tauri::command]
async fn notes_get(state: State<'_, AppState>, project_id: i64) -> Result<String, String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, project_id).map_err(|e| e.to_string())?;
    let config = Config::new().unwrap();
    queries::read_notes(&config, &project.name).unwrap_or_else(|_| "No notes found.".to_string())
}

#[tauri::command]
async fn notes_update(state: State<'_, AppState>, project_id: i64, content: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, project_id).map_err(|e| e.to_string())?;
    let config = Config::new().unwrap();
    queries::write_notes(&config, &project.name, &content).map_err(|e| e.to_string())
}
```

- [ ] **Step 2: System commands**

```rust
#[tauri::command]
async fn dashboard_summary(state: State<'_, AppState>) -> Result<DashboardSummary, String> {
    let conn = state.db.lock().unwrap();
    // ... implement from spec Section 10
}

#[tauri::command]
async fn project_open_path(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())?;
    std::process::Command::new(if cfg!(target_os = "windows") { "explorer" } else { "xdg-open" })
        .arg(&project.path).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn app_backup(state: State<'_, AppState>) -> Result<String, String> {
    let config = state.config.clone();
    let backup_path = config.data_dir.join(format!("projects_{}.db.bak", chrono::Local::now().format("%Y%m%d_%H%M%S")));
    std::fs::copy(&config.db_path, &backup_path).map_err(|e| e.to_string())?;
    Ok(backup_path.to_string_lossy().into_owned())
}
```

---

### Task 6: Frontend Integration - API Layer & Hooks

**Files:**
- Modify: `crates/devtrack-web/src/api/client.ts` (add Tauri invoke)
- Create: `crates/devtrack-web/src/hooks/useApi.ts` (if not exists)

**Interfaces:**
- Produces: `api` object with `invoke` wrappers for all commands
- Produces: React Query hooks for all entities

- [ ] **Step 1: Update client.ts for Tauri**

```typescript
// crates/devtrack-web/src/api/client.ts
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
  // ... subtasks, timer, notes, reports, system
};
```

- [ ] **Step 2: Update hooks/useApi.ts for Tauri**

```typescript
// hooks/useApi.ts - same pattern but using invoke
export const useProjects = (archived = false) =>
  useQuery({
    queryKey: ['projects', archived],
    queryFn: () => api.projects.list(archived),
  });
```

- [ ] **Step 3: Add Tauri-specific hooks**

```typescript
// New hooks for Tauri-specific features
export const useActiveTimer = () =>
  useQuery({
    queryKey: ['active-timer'],
    queryFn: () => api.system.getActiveTimer(),
    refetchInterval: 1000,
  });

export const useStartTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => api.timer.start(taskId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-entries'] }),
  });
};

export const useNativeNotifications = () => {
  return useCallback(async (title: string, body: string) => {
    await sendNotification({ title, body });
  }, []);
};
```

- [ ] **Step 4: Add Tauri event listeners for timer updates**

```typescript
// In App.tsx or Timer page
useEffect(() => {
  const unlisten = await listen('timer_update', (event) => {
    // Update local timer state
  });
  return unlisten;
}, []);
```

---

### Task 7: Tauri-Specific UI Features

**Files:**
- Create: `crates/devtrack-web/src/components/SystemTray.tsx`
- Create: `crates/devtrack-web/src/components/GlobalShortcuts.tsx`
- Create: `crates/devtrack-web/src/components/NativeDialogs.tsx`
- Modify: `crates/devtrack-web/src/App.tsx` (integrate Tauri features)

**Interfaces:**
- Produces: System tray with timer controls
- Produces: Global shortcut (Ctrl+Shift+T)
- Produces: Native file dialogs for project creation

- [ ] **Step 1: System Tray component**

```tsx
// components/SystemTray.tsx
import { SystemTray, SystemTrayEvent, Menu, MenuItem } from '@tauri-apps/api/system-tray';
import { useAppStore } from '../../store/appStore';

export function useSystemTray() {
  useEffect(() => {
    const setupTray = async () => {
      const tray = await SystemTray.new({
        icon: 'icons/tray-icon.png',
        menu: await Menu.new([
          await MenuItem.new({ label: 'Show DevTrack', action: () => { /* show window */ } }),
          await MenuItem.new({ label: 'Start Timer', action: () => { /* start timer */ } }),
          await MenuItem.new({ label: 'Stop Timer', action: () => { /* stop timer */ } }),
          await MenuItem.new({ label: 'Quit', action: () => { /* quit app */ } }),
        ]),
      });
      
      tray.onEvent((event) => {
        if (event === SystemTrayEvent.DoubleClick) {
          // Show window
        }
      });
    };
    setupTray();
  }, []);
}
```

- [ ] **Step 2: Global shortcut registration**

```tsx
// components/GlobalShortcuts.tsx
import { register, unregisterAll } from '@tauri-apps/api/globalShortcut';
import { useAppStore } from '../../store/appStore';

export function useGlobalShortcuts() {
  useEffect(() => {
    const registerShortcuts = async () => {
      await unregisterAll();
      await register('Ctrl+Shift+T', () => {
        // Toggle timer via store
      });
    };
    registerShortcuts();
    return () => unregisterAll();
  }, []);
}
```

- [ ] **Step 3: Native file dialog for project creation**

```tsx
// components/NativeDialogs.tsx
import { open } from '@tauri-apps/api/dialog';

export async function selectProjectDirectory(): Promise<string | null> {
  const path = await open({ directory: true, multiple: false, title: 'Select Project Directory' });
  return path || null;
}
```

---

### Task 8: System Tray + Timer Integration + Native Features

**Files:**
- Modify: `crates/devtrack-web/src/pages/Timer.tsx` (integrate tray + shortcuts)
- Modify: `crates/devtrack-web/src/pages/Projects.tsx` (native dialog)
- Modify: `crates/devtrack-web/src/App.tsx` (init Tauri features)

- [ ] **Step 1: Integrate timer with system tray**

```tsx
// In Timer.tsx - show timer in tray tooltip
useEffect(() => {
  if (activeTimer) {
    SystemTray.setTitle(`DevTrack: ${formatDuration(elapsed)}`);
  } else {
    SystemTray.setTitle('DevTrack');
  }
}, [activeTimer, localElapsed]);
```

- [ ] **Step 2: Add native file dialog to Projects page**

```tsx
// In Projects.tsx - "Add Project" button
const handleAddProject = async () => {
  const path = await selectProjectDirectory();
  if (path) setNewProjectPath(path);
};
```

- [ ] **Step 3: Initialize Tauri features in App.tsx**

```tsx
// App.tsx
import { useSystemTray } from './components/SystemTray';
import { useGlobalShortcuts } from './components/GlobalShortcuts';

function App() {
  useSystemTray();
  useGlobalShortcuts();
  return (...);
}
```

---

### Task 9: Settings Persistence + Build Pipeline

**Files:**
- Create: `crates/devtrack-desktop/src/settings.rs` (or use tauri-plugin-store)
- Modify: `crates/devtrack-web/src/pages/Settings.tsx` (persist to store)
- Create: `.github/workflows/build.yml`

**Interfaces:**
- Produces: Persistent settings via `tauri-plugin-store`
- Produces: GitHub Actions workflow for all 3 platforms

- [ ] **Step 1: Add tauri-plugin-store dependency**

```toml
# Cargo.toml
tauri-plugin-store = "2"
```

- [ ] **Step 2: Settings store integration**

```rust
// commands.rs
#[tauri::command]
async fn settings_get(state: State<'_, AppState>) -> Result<Settings, String> {
    // Read from tauri-plugin-store
}

#[tauri::command]
async fn settings_set(state: State<'_, AppState>, settings: Settings) -> Result<(), String> {
    // Write to tauri-plugin-store
}
```

- [ ] **Step 3: GitHub Actions build pipeline**

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
        run: cargo tauri build --release --manifest-path crates/devtrack-desktop/Cargo.toml
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: devtrack-${{ matrix.os }}
          path: |
            crates/devtrack-desktop/target/release/bundle/**/*
            crates/devtrack-desktop/target/release/devtrack*
```

- [ ] **Step 4: Add release workflow**

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            devtrack-ubuntu-latest/*.AppImage
            devtrack-ubuntu-latest/*.deb
            devtrack-windows-latest/*.msi
            devtrack-macos-latest/*.dmg
```

---

### Task 10: Icons, Polish & Final Verification

**Files:**
- Create: `crates/devtrack-desktop/icons/` (all required sizes)
- Modify: `crates/devtrack-web/src/index.css` (Tailwind v4)
- Modify: `crates/devtrack-web/vite.config.ts` (build output)

**Interfaces:**
- Produces: All platform icons
- Produces: Production-ready build

- [ ] **Step 1: Generate all required icons**

```bash
# Generate from source SVG
# 32x32.png, 128x128.png, 128x128@2x.png, icon.icns, icon.ico, tray-icon.png
```

- [ ] **Step 2: Update vite.config.ts for Tauri**

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@dtypes': path.resolve(__dirname, './src/types'),
      '@api': path.resolve(__dirname, './src/api'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
```

- [ ] **Step 3: Full build test**

```bash
# Test dev mode
cargo tauri dev --manifest-path crates/devtrack-desktop/Cargo.toml

# Test production build
cargo tauri build --manifest-path crates/devtrack-desktop/Cargo.toml

# Verify artifacts exist
ls crates/devtrack-desktop/target/release/bundle/
```

---

### Task 11: Web Fallback (PWA) Deployment

**Files:**
- Modify: `crates/devtrack-web/vite.config.ts` (PWA plugin)
- Create: `crates/devtrack-web/public/manifest.webmanifest`
- Create: `crates/devtrack-web/public/sw.js` (service worker)

- [ ] **Step 1: Add PWA manifest**

```json
// public/manifest.webmanifest
{
  "name": "DevTrack",
  "short_name": "DevTrack",
  "description": "Solo Dev Project Management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#8b5cf6",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Add Vite PWA plugin**

```bash
npm install -D vite-plugin-pwa
```

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DevTrack',
        short_name: 'DevTrack',
        theme_color: '#8b5cf6',
        icons: [...]
      }
    })
  ],
});
```

- [ ] **Step 3: Deploy to GitHub Pages**

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd crates/devtrack-web && npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./crates/devtrack-web/dist
```

---

### Task 12: Integration Testing & Final Verification

**Files:**
- Create: `crates/devtrack-desktop/tests/integration.rs`

**Interfaces:**
- Produces: Verified working app on all 3 platforms

- [ ] **Step 1: Run full test suite**

```bash
# Rust tests
cargo test --workspace

# Frontend tests
cd crates/devtrack-web && npm run test

# Tauri integration tests
cargo test --package devtrack-desktop --test integration
```

- [ ] **Step 2: Manual verification checklist**

```bash
# Run dev mode
cargo tauri dev --manifest-path crates/devtrack-desktop/Cargo.toml

# Verify:
# [ ] App launches on Windows/macOS/Linux
# [ ] Project CRUD works
# [ ] Task CRUD + subtasks work
# [ ] Timer starts/stops with tray indicator
# [ ] Global shortcut (Ctrl+Shift+T) works
# [ ] System tray shows timer
# [ ] Notifications appear on timer complete
# [ ] Git status shows in project list
# [ ] Notes view/edit works
# [ ] Time reports generate
# [ ] Settings persist
# [ ] Native file dialog works for project creation
# [ ] Build produces .msi, .dmg, .AppImage, .deb, .rpm
```

- [ ] **Step 3: Test production build**

```bash
cargo tauri build --manifest-path crates/devtrack-desktop/Cargo.toml

# Verify artifacts
ls crates/devtrack-desktop/target/release/bundle/
# Should have:
# macos/DevTrack.app, DevTrack.dmg
# windows/DevTrack.msi, DevTrack.exe
# linux/DebTrack.AppImage, devtrack.deb, devtrack.rpm
```

---

## Summary

**Total Tasks:** 12
**Estimated Duration:** 3 weeks (1 week per 4 tasks)
**Deliverable:** Production-ready Tauri desktop app for Windows/macOS/Linux with Web fallback

---

**Plan saved to:** `docs/superpowers/plans/2025-09-25-tauri-desktop-plan.md`

---

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**