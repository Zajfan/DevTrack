use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_notification::NotificationExt;
use devtrack_core::{queries, get_git_info, scan_projects, format_duration};
use devtrack_core::models::{Project, ProjectWithGit, GitInfo, Task, SubTask, TimeEntry, TimeLogSummary};
use devtrack_core::sync::{SyncSettings, SyncStatus};
use crate::{AppState, state::now_ts, settings::Settings};
use std::process::Command;
use chrono::Local;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StartTimerResponse {
    pub task_id: i64,
    pub start_time: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TimerStateResponse {
    pub state_name: String, // "Running" | "Paused"
    pub running: bool,
    pub running_start: Option<i64>,
    pub accumulated: Option<i64>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectStatsResponse {
    pub project_id: i64,
    pub open_tasks: i64,
    pub total_seconds: i64,
    pub total_formatted: String,
}#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StopTimerResponse {
    pub task_id: i64,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ActiveTimerResponse {
    pub task_id: i64,
    pub start_time: i64,
    pub elapsed: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct TimerUpdateEvent {
    pub active: bool,
    pub task_id: i64,
    pub elapsed: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DashboardSummary {
    pub total_projects: usize,
    pub active_projects: usize,
    pub total_tasks: usize,
    pub active_tasks: usize,
    pub completed_tasks: usize,
    pub total_time_today: i64,
    pub total_time_week: i64,
    pub recent_projects: Vec<Project>,
}

#[tauri::command]
pub async fn projects_list(state: State<'_, AppState>, archived: Option<bool>) -> Result<Vec<ProjectWithGit>, String> {
    let conn = state.db.lock().unwrap();
    let projects = queries::get_all_projects(&conn, archived.unwrap_or(false))
        .map_err(|e| e.to_string())?;
    drop(conn);
    // Git status is intentionally omitted here so the list returns from the
    // database immediately. The frontend fetches git info per-project after
    // the list renders, keeping the UI responsive even with hundreds of projects.
    Ok(projects
        .into_iter()
        .map(|project| ProjectWithGit { git: None, project })
        .collect())
}

#[tauri::command]
pub async fn project_get(state: State<'_, AppState>, id: i64) -> Result<ProjectWithGit, String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())?;
    let git = get_git_info(&project.path).map(|g| GitInfo {
        branch: g.branch,
        is_dirty: g.is_dirty,
        ahead: g.ahead,
        behind: g.behind,
        stashes: g.stashes,
    });
    Ok(ProjectWithGit { project, git })
}

#[tauri::command]
pub async fn project_create(state: State<'_, AppState>, name: String, path: String) -> Result<Project, String> {
    let conn = state.db.lock().unwrap();
    let abs_path = std::fs::canonicalize(&path).map_err(|e| e.to_string())?.to_string_lossy().into_owned();
    let id = queries::create_project(&conn, &name, &abs_path).map_err(|e| e.to_string())?;
    Ok(Project {
        id,
        name,
        path: abs_path,
        status: "Active".into(),
        tags: String::new(),
        last_accessed: None,
        created_at: chrono::Utc::now().to_rfc3339(),
        description: String::new(),
        color: String::new(),
        icon: String::new(),
        concept_what: String::new(),
        concept_why: String::new(),
        concept_how: String::new(),
        concept_when: String::new(),
        concept_where: String::new(),
        concept_with_what: String::new(),
    })
}

#[tauri::command]
pub async fn project_update(
    state: State<'_, AppState>,
    id: i64,
    name: Option<String>,
    path: Option<String>,
    status: Option<String>,
    tags: Option<String>,
    description: Option<String>,
    color: Option<String>,
    icon: Option<String>,
    concept_what: Option<String>,
    concept_why: Option<String>,
    concept_how: Option<String>,
    concept_when: Option<String>,
    concept_where: Option<String>,
    concept_with_what: Option<String>,
) -> Result<Project, String> {
    let canonical_path = if let Some(path) = path {
        let resolved = std::fs::canonicalize(&path).map_err(|error| format!("Invalid project folder: {error}"))?;
        if !resolved.is_dir() {
            return Err("Project location must be a folder".into());
        }
        Some(resolved.to_string_lossy().into_owned())
    } else {
        None
    };
    let conn = state.db.lock().unwrap();
    queries::update_project_fields(&conn, id, queries::ProjectUpdateFields {
        name: name.as_deref(),
        path: canonical_path.as_deref(),
        status: status.as_deref(),
        tags: tags.as_deref(),
        description: description.as_deref(),
        color: color.as_deref(),
        icon: icon.as_deref(),
        concept_what: concept_what.as_deref(),
        concept_why: concept_why.as_deref(),
        concept_how: concept_how.as_deref(),
        concept_when: concept_when.as_deref(),
        concept_where: concept_where.as_deref(),
        concept_with_what: concept_with_what.as_deref(),
    }).map_err(|e| e.to_string())?;
    queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn project_delete(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::delete_project(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn project_scan(state: State<'_, AppState>, path: String) -> Result<usize, String> {
    let conn = state.db.lock().unwrap();
    scan_projects(&conn, &std::path::PathBuf::from(path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn project_git(state: State<'_, AppState>, id: i64) -> Result<GitInfo, String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())?;
    get_git_info(&project.path)
        .map(|g| GitInfo {
            branch: g.branch,
            is_dirty: g.is_dirty,
            ahead: g.ahead,
            behind: g.behind,
            stashes: g.stashes,
        })
        .ok_or_else(|| "Not a git repository".to_string())
}

#[tauri::command]
pub async fn tasks_list(state: State<'_, AppState>, project_id: i64) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().unwrap();
    queries::get_tasks_for_project(&conn, project_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn task_get(state: State<'_, AppState>, id: i64) -> Result<Task, String> {
    let conn = state.db.lock().unwrap();
    queries::get_task_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn task_create(state: State<'_, AppState>, project_id: i64, title: String, description: Option<String>, priority: Option<String>, due_date: Option<String>, target_version: Option<String>) -> Result<Task, String> {
    let conn = state.db.lock().unwrap();
    let priority = priority.unwrap_or_else(|| "Medium".to_string());
    let id = queries::create_task_versioned(&conn, project_id, &title, description.as_deref(), Some(&priority), due_date.as_deref(), target_version.as_deref()).map_err(|e| e.to_string())?;
    queries::get_task_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn task_update(state: State<'_, AppState>, id: i64, title: Option<String>, description: Option<String>, status: Option<String>, priority: Option<String>, due_date: Option<String>, target_version: Option<String>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::update_task_versioned(&conn, id, title.as_deref(), description.as_deref(), status.as_deref(), priority.as_deref(), due_date.as_deref(), target_version.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn task_delete(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::delete_task(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn task_toggle(state: State<'_, AppState>, id: i64, status: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::update_task(&conn, id, None, None, Some(&status), None, None).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn tasks_global(state: State<'_, AppState>) -> Result<Vec<Task>, String> {
    let conn = state.db.lock().unwrap();
    queries::get_global_tasks(&conn, true).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_commit(state: State<'_, AppState>, project_id: i64, message: String) -> Result<String, String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, project_id).map_err(|e| e.to_string())?;
    drop(conn);
    queries::commit_and_push(&project.path, &message)
        .map(|_| format!("Committed and pushed {}", project.name))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn subtasks_list(state: State<'_, AppState>, task_id: i64) -> Result<Vec<SubTask>, String> {
    let conn = state.db.lock().unwrap();
    queries::get_subtasks(&conn, task_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn subtask_create(state: State<'_, AppState>, task_id: i64, title: String) -> Result<SubTask, String> {
    let conn = state.db.lock().unwrap();
    let id = queries::create_subtask(&conn, task_id, &title).map_err(|e| e.to_string())?;
    let subtasks = queries::get_subtasks(&conn, task_id).map_err(|e| e.to_string())?;
    subtasks.into_iter().find(|s| s.id == id).ok_or_else(|| "Failed to fetch created subtask".to_string())
}

#[tauri::command]
pub async fn subtask_update(state: State<'_, AppState>, id: i64, title: Option<String>, done: Option<bool>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::update_subtask(&conn, id, title.as_deref(), done).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn subtask_delete(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::delete_subtask(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn timer_start(state: State<'_, AppState>, app: AppHandle, task_id: i64) -> Result<StartTimerResponse, String> {
    let start = state.start_timer(task_id).map_err(|e| e.to_string())?;
    let _ = app.emit("timer_update", TimerUpdateEvent { active: true, task_id, elapsed: 0 });
    Ok(StartTimerResponse { task_id, start_time: start })
}

#[tauri::command]
pub async fn timer_stop(state: State<'_, AppState>, app: AppHandle, task_id: i64) -> Result<StopTimerResponse, String> {
    let duration = state.stop_timer(task_id).map_err(|e| e.to_string())?;
    let _ = app.emit("timer_update", TimerUpdateEvent { active: false, task_id, elapsed: duration.unwrap_or(0) });
    
    // Send notification on timer completion
    if let Some(duration_secs) = duration {
        let _ = app.notification()
            .builder()
            .title("Timer Complete")
            .body(format!("Task completed in {}", format_duration(duration_secs)))
            .show();
    }
    
    Ok(StopTimerResponse { task_id, duration_seconds: duration.unwrap_or(0) })
}

#[tauri::command]
pub async fn timer_active(state: State<'_, AppState>) -> Result<Option<ActiveTimerResponse>, String> {
    if let Some((task_id, start)) = state.get_active_timer() {
        let elapsed = now_ts() - start;
        Ok(Some(ActiveTimerResponse { task_id, start_time: start, elapsed }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn time_entries_list(state: State<'_, AppState>, period: Option<String>) -> Result<Vec<TimeEntry>, String> {
    let conn = state.db.lock().unwrap();
    let filter = period.unwrap_or_else(|| "today".to_string());
    queries::get_time_entries(&conn, &filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn time_report(state: State<'_, AppState>, period: String) -> Result<TimeLogSummary, String> {
    let conn = state.db.lock().unwrap();
    queries::get_time_log_report(&conn, &period).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn notes_get(state: State<'_, AppState>, project_id: i64) -> Result<String, String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, project_id).map_err(|e| e.to_string())?;
    Ok(queries::read_notes(&state.config, &project.name).unwrap_or_else(|_| "No notes found.".to_string()))
}

#[tauri::command]
pub async fn notes_update(state: State<'_, AppState>, project_id: i64, content: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, project_id).map_err(|e| e.to_string())?;
    queries::write_notes(&state.config, &project.name, &content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn prioritised_projects(state: State<'_, AppState>) -> Result<Vec<devtrack_core::models::PrioritisedProject>, String> {
    let conn = state.db.lock().unwrap();
    queries::get_prioritised_projects(&conn, 8).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn dashboard_summary(state: State<'_, AppState>) -> Result<DashboardSummary, String> {
    let conn = state.db.lock().unwrap();
    
    let all_projects = queries::get_all_projects(&conn, true).map_err(|e| e.to_string())?;
    let active_projects = all_projects.iter().filter(|p| p.status == "Active").count();
    
    let mut total_tasks = 0;
    let mut active_tasks = 0;
    let mut completed_tasks = 0;
    
    for project in &all_projects {
        let tasks = queries::get_tasks_for_project(&conn, project.id).map_err(|e| e.to_string())?;
        total_tasks += tasks.len();
        for task in &tasks {
            if task.status == "Done" || task.status == "Completed" {
                completed_tasks += 1;
            } else {
                active_tasks += 1;
            }
        }
    }
    
    let today_entries = queries::get_time_entries(&conn, "today").map_err(|e| e.to_string())?;
    let week_entries = queries::get_time_entries(&conn, "week").map_err(|e| e.to_string())?;
    let total_time_today = today_entries.iter().map(|e| e.duration_seconds).sum();
    let total_time_week = week_entries.iter().map(|e| e.duration_seconds).sum();
    
    let recent_projects = all_projects.iter().take(5).cloned().collect();
    
    Ok(DashboardSummary {
        total_projects: all_projects.len(),
        active_projects,
        total_tasks,
        active_tasks,
        completed_tasks,
        total_time_today,
        total_time_week,
        recent_projects,
    })
}

#[tauri::command]
pub async fn project_open_path(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "windows")]
    let cmd = "explorer";
    #[cfg(target_os = "macos")]
    let cmd = "open";
    #[cfg(target_os = "linux")]
    let cmd = "xdg-open";
    
    Command::new(cmd)
        .arg(&project.path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn project_open_terminal(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "cmd", "/K", "cd", &project.path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .args([
                "-e",
                &format!("tell application \"Terminal\" to do script \"cd '{}'\"", project.path),
            ])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        let terminals = ["gnome-terminal", "konsole", "xterm", "alacritty", "kitty"];
        let mut spawned = false;
        for term in terminals {
            if Command::new(term)
                .args(["--working-directory", &project.path])
                .spawn()
                .is_ok()
            {
                spawned = true;
                break;
            }
        }
        if !spawned {
            return Err("No supported terminal found".to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn app_backup(state: State<'_, AppState>) -> Result<String, String> {
    let config = state.config.clone();
    let backup_path = config.data_dir.join(format!(
        "projects_{}.db.bak",
        Local::now().format("%Y%m%d_%H%M%S")
    ));
    std::fs::copy(&config.db_path, &backup_path).map_err(|e| e.to_string())?;
    Ok(backup_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn app_export_data(state: State<'_, AppState>) -> Result<String, String> {
    let conn = state.db.lock().unwrap();
    
    let projects = queries::get_all_projects(&conn, true).map_err(|e| e.to_string())?;
    let mut all_tasks = Vec::new();
    let mut all_subtasks = Vec::new();
    let mut all_time_entries = Vec::new();
    
    for project in &projects {
        let tasks = queries::get_tasks_for_project(&conn, project.id).map_err(|e| e.to_string())?;
        for task in &tasks {
            let subtasks = queries::get_subtasks(&conn, task.id).map_err(|e| e.to_string())?;
            all_subtasks.extend(subtasks);
        }
        all_tasks.extend(tasks);
    }
    
    all_time_entries = queries::get_time_entries(&conn, "all").map_err(|e| e.to_string())?;
    
    #[derive(serde::Serialize)]
    struct ExportData {
        projects: Vec<Project>,
        tasks: Vec<Task>,
        subtasks: Vec<SubTask>,
        time_entries: Vec<TimeEntry>,
        exported_at: String,
    }
    
    let export = ExportData {
        projects,
        tasks: all_tasks,
        subtasks: all_subtasks,
        time_entries: all_time_entries,
        exported_at: chrono::Utc::now().to_rfc3339(),
    };
    
    let json = serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?;
    let export_path = state.config.data_dir.join(format!(
        "devtrack_export_{}.json",
        Local::now().format("%Y%m%d_%H%M%S")
    ));
    
    std::fs::write(&export_path, json).map_err(|e| e.to_string())?;
    Ok(export_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn app_import_data(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    
    #[derive(serde::Deserialize)]
    struct ImportData {
        projects: Vec<Project>,
        tasks: Vec<Task>,
        subtasks: Vec<SubTask>,
        time_entries: Vec<TimeEntry>,
    }
    
    let import: ImportData = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    let conn = state.db.lock().unwrap();
    
    for project in import.projects {
        let _ = queries::create_project(&conn, &project.name, &project.path);
    }
    
    for task in import.tasks {
        let _ = queries::create_task(
            &conn,
            task.project_id,
            &task.title,
            Some(&task.description),
            Some(&task.priority),
            task.due_date.as_deref(),
        );
    }
    
    for subtask in import.subtasks {
        let _ = queries::create_subtask(&conn, subtask.task_id, &subtask.title);
    }
    
    for entry in import.time_entries {
        conn.execute(
            "INSERT INTO time_entries (task_id, start_time, end_time, duration_seconds, description) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![
                entry.task_id,
                entry.start_time,
                entry.end_time,
                entry.duration_seconds,
                entry.description
            ],
        ).map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn app_get_data_dir(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.config.data_dir.to_string_lossy().into_owned())
}

#[derive(serde::Serialize)]
pub struct CompanionImportResult {
    pub projects_updated: usize,
    pub projects_created: usize,
    pub tasks_updated: usize,
    pub tasks_created: usize,
    pub backup_path: Option<String>,
    /// Human-readable list of project names (for the preview dialog)
    pub preview_projects: Vec<String>,
}

/// Export all non-archived projects and tasks in the `devtrack-companion` v1
/// format (includes notes and inferred GitHub repository slugs).
#[tauri::command]
pub async fn companion_export(state: State<'_, AppState>) -> Result<String, String> {
    #[derive(serde::Serialize)]
    struct CProject { id: String, name: String, repository: String, tags: String, notes: String }
    #[derive(serde::Serialize)]
    struct CTask { id: String, project_id: String, title: String, description: String, status: String, priority: String, target_version: String, updated_at: String }
    #[derive(serde::Serialize)]
    struct CSubTask { id: String, task_id: String, title: String, done: bool }
    #[derive(serde::Serialize)]
    struct CExport { format: &'static str, version: u32, projects: Vec<CProject>, tasks: Vec<CTask>, subtasks: Vec<CSubTask> }

    let conn = state.db.lock().unwrap();
    let projects = queries::get_all_projects(&conn, false).map_err(|e| e.to_string())?;

    let mut c_projects = Vec::new();
    let mut c_tasks = Vec::new();
    let mut c_subtasks = Vec::new();

    for project in &projects {
        let repository = devtrack_core::get_github_repository(&project.path).unwrap_or_default();
        let notes_path = queries::get_notes_path(&state.config, &project.name);
        let notes = std::fs::read_to_string(&notes_path).unwrap_or_default();
        c_projects.push(CProject {
            id: format!("desktop:{}", project.id),
            name: project.name.clone(),
            repository,
            tags: project.tags.clone(),
            notes,
        });
        let tasks = queries::get_tasks_for_project(&conn, project.id).map_err(|e| e.to_string())?;
        for task in &tasks {
            let subtasks = queries::get_subtasks(&conn, task.id).map_err(|e| e.to_string())?;
            for s in subtasks {
                c_subtasks.push(CSubTask {
                    id: format!("desktop:subtask:{}", s.id),
                    task_id: format!("desktop:{}", task.id),
                    title: s.title,
                    done: s.done,
                });
            }
        }
        for task in tasks {
            let status = if task.status == "Done" || task.status == "Completed" { "done" } else { "todo" };
            let priority = task.priority.to_lowercase();
            let priority = if priority == "medium" { "normal" } else { &priority }.to_string();
            c_tasks.push(CTask {
                id: format!("desktop:{}", task.id),
                project_id: format!("desktop:{}", project.id),
                title: task.title,
                description: task.description,
                status: status.to_string(),
                priority,
                target_version: task.target_version,
                updated_at: task.created_at,
            });
        }
    }

    let export = CExport { format: "devtrack-companion", version: 1, projects: c_projects, tasks: c_tasks, subtasks: c_subtasks };
    let json = serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?;
    let export_path = state.config.data_dir.join(format!(
        "devtrack-companion-export-{}.json",
        Local::now().format("%Y%m%d_%H%M%S"),
    ));
    std::fs::write(&export_path, &json).map_err(|e| e.to_string())?;
    Ok(export_path.to_string_lossy().into_owned())
}

/// Import a `devtrack-companion` v1 backup into the desktop database.
/// When `dry_run` is true the file is validated and a preview is returned but
/// nothing is written.  When false a recovery backup is created first, then
/// the changes are applied.
#[tauri::command]
pub async fn companion_import(state: State<'_, AppState>, path: String, dry_run: bool) -> Result<CompanionImportResult, String> {
    #[derive(serde::Deserialize)]
    struct IProject { id: String, name: String, #[serde(default)] repository: String, #[serde(default)] tags: String, #[serde(default)] notes: String }
    #[derive(serde::Deserialize)]
    struct ITask { id: String, project_id: String, title: String, #[serde(default)] description: String, #[serde(default)] status: String, #[serde(default)] priority: String, #[serde(default)] target_version: String }
    #[derive(serde::Deserialize)]
    struct IData { format: Option<String>, version: Option<u32>, projects: Vec<IProject>, tasks: Vec<ITask> }

    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    if content.len() > 16 * 1024 * 1024 { return Err("Backup is larger than 16 MB.".to_string()); }

    let incoming: IData = serde_json::from_str(&content).map_err(|e| format!("Invalid JSON: {}", e))?;
    if let Some(ref fmt) = incoming.format {
        if fmt != "devtrack-companion" { return Err("Unrecognized backup format.".to_string()); }
    }
    if let Some(ver) = incoming.version {
        if ver != 1 { return Err("Unsupported backup version.".to_string()); }
    }
    if incoming.projects.len() > 10000 || incoming.tasks.len() > 100000 {
        return Err("Backup exceeds allowed size limits.".to_string());
    }
    for p in &incoming.projects {
        if p.name.trim().is_empty() { return Err("A project has an empty name.".to_string()); }
        if p.id.is_empty() { return Err("A project has an empty id.".to_string()); }
    }
    for t in &incoming.tasks {
        if t.title.trim().is_empty() { return Err("A task has an empty title.".to_string()); }
    }

    let conn = state.db.lock().unwrap();

    // Classify projects
    let mut projects_updated = 0usize;
    let mut projects_created = 0usize;
    let mut preview_projects: Vec<String> = Vec::new();
    // companion project id → desktop project id (populated during apply)
    let mut project_id_map: std::collections::HashMap<String, i64> = Default::default();

    for p in &incoming.projects {
        if let Some(desktop_id) = desktop_id_from(&p.id) {
            if let Ok(existing) = queries::get_project_by_id(&conn, desktop_id) {
                project_id_map.insert(p.id.clone(), desktop_id);
                preview_projects.push(format!("{} (update)", existing.name));
                projects_updated += 1;
                continue;
            }
        }
        preview_projects.push(format!("{} (new)", p.name.trim()));
        projects_created += 1;
    }

    // Classify tasks
    let mut tasks_updated = 0usize;
    let mut tasks_created = 0usize;
    for t in &incoming.tasks {
        if let Some(desktop_id) = desktop_id_from(&t.id) {
            if queries::get_task_by_id(&conn, desktop_id).is_ok() {
                tasks_updated += 1;
                continue;
            }
        }
        tasks_created += 1;
    }

    if dry_run {
        return Ok(CompanionImportResult { projects_updated, projects_created, tasks_updated, tasks_created, backup_path: None, preview_projects });
    }

    // Recovery backup
    let backup_path = state.config.data_dir.join(format!(
        "projects_pre-companion-import_{}.db.bak",
        Local::now().format("%Y%m%d_%H%M%S"),
    ));
    std::fs::copy(&state.config.db_path, &backup_path).map_err(|e| e.to_string())?;

    // Apply projects (rebuild map including newly created)
    project_id_map.clear();
    for p in &incoming.projects {
        let desktop_id = if let Some(id) = desktop_id_from(&p.id) {
            if let Ok(_existing) = queries::get_project_by_id(&conn, id) {
                queries::update_project(&conn, id, None, None, None, Some(&p.tags)).map_err(|e| e.to_string())?;
                if !p.notes.is_empty() {
                    let proj = queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())?;
                    queries::write_notes(&state.config, &proj.name, &p.notes).map_err(|e| e.to_string())?;
                }
                id
            } else {
                create_companion_project_inner(&conn, &state.config, &p.name, &p.tags, &p.notes)?
            }
        } else {
            create_companion_project_inner(&conn, &state.config, &p.name, &p.tags, &p.notes)?
        };
        project_id_map.insert(p.id.clone(), desktop_id);
    }

    // Apply tasks
    tasks_updated = 0;
    tasks_created = 0;
    for t in &incoming.tasks {
        let project_desktop_id = match project_id_map.get(&t.project_id) { Some(&id) => id, None => continue };
        let status = if t.status == "done" || t.status == "completed" { "Done" } else { "Todo" };
        let priority = normalize_priority(&t.priority);
        if let Some(desktop_id) = desktop_id_from(&t.id) {
            if queries::get_task_by_id(&conn, desktop_id).is_ok() {
                queries::update_task_versioned(&conn, desktop_id, Some(t.title.trim()), Some(&t.description), Some(status), Some(priority), None, Some(&t.target_version)).map_err(|e| e.to_string())?;
                tasks_updated += 1;
                continue;
            }
        }
        let new_id = queries::create_task_versioned(&conn, project_desktop_id, t.title.trim(), Some(&t.description), Some(priority), None, Some(&t.target_version)).map_err(|e| e.to_string())?;
        if status == "Done" {
            let _ = conn.execute("UPDATE tasks SET status='Done' WHERE id=?1", rusqlite::params![new_id]);
        }
        tasks_created += 1;
    }

    Ok(CompanionImportResult { projects_updated, projects_created, tasks_updated, tasks_created, backup_path: Some(backup_path.to_string_lossy().into_owned()), preview_projects })
}

fn desktop_id_from(companion_id: &str) -> Option<i64> {
    companion_id.strip_prefix("desktop:").and_then(|s| s.parse().ok())
}

fn normalize_priority(p: &str) -> &'static str {
    match p.to_lowercase().as_str() {
        "high" => "High",
        "low" => "Low",
        _ => "Normal",
    }
}

fn create_companion_project_inner(
    conn: &rusqlite::Connection,
    config: &devtrack_core::Config,
    name: &str,
    tags: &str,
    notes: &str,
) -> Result<i64, String> {
    let name = name.trim().to_string();
    let new_id = queries::create_project(conn, &name, &name).map_err(|e| e.to_string())?;
    if !tags.is_empty() {
        queries::update_project(conn, new_id, None, None, None, Some(tags)).map_err(|e| e.to_string())?;
    }
    if !notes.is_empty() {
        queries::write_notes(config, &name, notes).map_err(|e| e.to_string())?;
    }
    Ok(new_id)
}

#[tauri::command]
pub async fn show_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub async fn quit_app(app: AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub async fn settings_get(app: AppHandle) -> Result<Settings, String> {
    crate::settings::get_settings(&app)
}

#[tauri::command]
pub async fn settings_set(app: AppHandle, settings: Settings) -> Result<(), String> {
    crate::settings::set_settings(&app, settings)
}
#[tauri::command]
pub async fn sync_settings_get(app: AppHandle) -> Result<SyncSettings, String> {
    let settings = crate::settings::get_settings(&app)?;
    Ok(SyncSettings {
        enabled: settings.sync_enabled,
        repo_url: settings.sync_url.clone(),
        branch: "main".to_string(),
    })
}

#[tauri::command]
pub async fn sync_test(app: AppHandle) -> Result<String, String> {
    let settings = crate::settings::get_settings(&app)?;
    let sync = SyncSettings {
        enabled: settings.sync_enabled,
        repo_url: settings.sync_url,
        branch: "main".to_string(),
    };
    devtrack_core::sync::test_connection(&sync)
}

#[tauri::command]
pub async fn sync_now(app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    // Refuse to sync while a timer is running (in-flight entry would be lost)
    if state.get_active_timer().is_some() {
        return Err("A timer is running — stop it before syncing".to_string());
    }
    let settings = crate::settings::get_settings(&app)?;
    let sync = SyncSettings {
        enabled: settings.sync_enabled,
        repo_url: settings.sync_url,
        branch: "main".to_string(),
    };
    let result = devtrack_core::sync::sync_now(&state.config, &sync);

    // The sync may have restored the DB file from remote — the app's long-lived
    // connection is stale; reopen it so subsequent queries see the fresh data
    if result.is_ok() {
        if let Ok(fresh) = devtrack_core::get_db_connection(&state.config) {
            *state.db.lock().unwrap() = fresh;
        }
    }

    // Notify the frontend that data may have changed
    let _ = app.emit("sync-complete", ());
    result
}

#[tauri::command]
pub async fn sync_status(state: State<'_, AppState>, app: AppHandle) -> Result<SyncStatus, String> {
    let settings = crate::settings::get_settings(&app)?;
    let sync = SyncSettings {
        enabled: settings.sync_enabled,
        repo_url: settings.sync_url,
        branch: "main".to_string(),
    };
    Ok(devtrack_core::sync::sync_status(&state.config, &sync))
}

#[tauri::command]
pub async fn timer_pause(state: State<'_, AppState>, app: AppHandle, task_id: i64) -> Result<Option<i64>, String> {
    let conn = state.db.lock().unwrap();
    let elapsed = queries::pause_timer(&conn, task_id).map_err(|e| e.to_string())?;
    drop(conn);
    if let Some(elapsed) = elapsed {
        let _ = app.emit("timer_update", TimerUpdateEvent { active: true, task_id, elapsed });
    }
    Ok(elapsed)
}

#[tauri::command]
pub async fn timer_resume(state: State<'_, AppState>, app: AppHandle, task_id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::resume_timer(&conn, task_id).map_err(|e| e.to_string())?;
    drop(conn);
    if let Some((running_id, _)) = state.get_active_timer() {
        if running_id == task_id {
            let _ = app.emit("timer_update", TimerUpdateEvent { active: true, task_id, elapsed: 0 });
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn timer_state(state: State<'_, AppState>, task_id: i64) -> Result<Option<TimerStateResponse>, String> {
    let conn = state.db.lock().unwrap();
    match queries::get_timer_state(&conn, task_id).map_err(|e| e.to_string())? {
        Some((state_name, value)) => {
            if state_name == "Paused" {
                Ok(Some(TimerStateResponse {
                    state_name,
                    running: false,
                    running_start: None,
                    accumulated: Some(value),
                }))
            } else {
                Ok(Some(TimerStateResponse {
                    state_name,
                    running: true,
                    running_start: Some(value),
                    accumulated: None,
                }))
            }
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn task_time_entries(state: State<'_, AppState>, task_id: i64) -> Result<Vec<TimeEntry>, String> {
    let conn = state.db.lock().unwrap();
    queries::time_entries_for_task(&conn, task_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn task_total_time(state: State<'_, AppState>, task_id: i64) -> Result<i64, String> {
    let conn = state.db.lock().unwrap();
    queries::total_time_for_task(&conn, task_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn time_entry_update(state: State<'_, AppState>, id: i64, duration_seconds: Option<i64>, description: Option<String>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::update_time_entry_by_id(&conn, id, duration_seconds, description.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn time_entry_delete(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::delete_time_entry(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn project_stats(state: State<'_, AppState>, project_id: i64) -> Result<ProjectStatsResponse, String> {
    let conn = state.db.lock().unwrap();
    let (open, total_seconds) = queries::project_stats(&conn, project_id).map_err(|e| e.to_string())?;
    Ok(ProjectStatsResponse { project_id, open_tasks: open, total_seconds, total_formatted: format_duration(total_seconds) })
}
