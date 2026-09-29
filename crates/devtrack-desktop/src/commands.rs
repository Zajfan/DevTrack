use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_notification::NotificationExt;
use devtrack_core::{queries, get_git_info, scan_projects, Config, format_duration};
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
    Ok(projects
        .into_iter()
        .map(|project| ProjectWithGit {
            git: get_git_info(&project.path).map(|g| GitInfo {
                branch: g.branch,
                is_dirty: g.is_dirty,
                ahead: g.ahead,
                behind: g.behind,
                stashes: g.stashes,
            }),
            project,
        })
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
        created_at: chrono::Utc::now().to_rfc3339() 
    })
}

#[tauri::command]
pub async fn project_update(state: State<'_, AppState>, id: i64, status: Option<String>, tags: Option<String>) -> Result<Project, String> {
    let conn = state.db.lock().unwrap();
    queries::update_project(&conn, id, status.as_deref(), tags.as_deref()).map_err(|e| e.to_string())?;
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
pub async fn task_create(state: State<'_, AppState>, project_id: i64, title: String, description: Option<String>, priority: Option<String>, due_date: Option<String>) -> Result<Task, String> {
    let conn = state.db.lock().unwrap();
    let priority = priority.unwrap_or_else(|| "Medium".to_string());
    let id = queries::create_task(&conn, project_id, &title, description.as_deref(), Some(&priority), due_date.as_deref()).map_err(|e| e.to_string())?;
    queries::get_task_by_id(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn task_update(state: State<'_, AppState>, id: i64, title: Option<String>, description: Option<String>, status: Option<String>, priority: Option<String>, due_date: Option<String>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    queries::update_task(&conn, id, title.as_deref(), description.as_deref(), status.as_deref(), priority.as_deref(), due_date.as_deref()).map_err(|e| e.to_string())
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
    let config = Config::new().map_err(|e| e.to_string())?;
    Ok(queries::read_notes(&config, &project.name).unwrap_or_else(|_| "No notes found.".to_string()))
}

#[tauri::command]
pub async fn notes_update(state: State<'_, AppState>, project_id: i64, content: String) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let project = queries::get_project_by_id(&conn, project_id).map_err(|e| e.to_string())?;
    let config = Config::new().map_err(|e| e.to_string())?;
    queries::write_notes(&config, &project.name, &content).map_err(|e| e.to_string())
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
