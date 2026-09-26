use axum::{
    extract::{Path, Query, State, Json},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, patch, delete},
    Router,
};
use chrono::Utc;
use devtrack_core::{
    models::*,
    queries::{
        create_project as core_create_project, create_task as core_create_task,
        create_subtask as core_create_subtask,
        delete_project as core_delete_project, delete_task as core_delete_task,
        delete_subtask as core_delete_subtask, get_all_projects, get_project_by_id,
        get_tasks_for_project, get_task_by_id, get_global_tasks, get_subtasks,
        get_time_entries, get_time_log_report, get_active_timer as core_get_active_timer, start_timer as core_start_timer,
        stop_timer as core_stop_timer, update_project as core_update_project,
        update_task as core_update_task, update_subtask as core_update_subtask,
        read_notes, write_notes,
    },
    init_db, get_git_info, now_ts, format_duration,
    Config, GitInfo,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::task::spawn_blocking;
use tower_http::cors::{CorsLayer, Any};
use tracing::info;

#[derive(Clone)]
struct AppState {
    config: Config,
    db_path: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();
    
    let config = Config::new()?;
    let db_path = config.db_path.to_string_lossy().to_string();
    let _conn = init_db(&config)?;
    
    let state = Arc::new(AppState { config, db_path });
    
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);
    
    let app = Router::new()
        // Projects
        .route("/projects", get(list_projects).post(create_project))
        .route("/projects/:id", get(get_project).patch(update_project).delete(delete_project))
        .route("/projects/:id/git", get(get_project_git))
        
        // Tasks
        .route("/projects/:id/tasks", get(list_tasks).post(create_task))
        .route("/tasks/:id", get(get_task).patch(update_task).delete(delete_task))
        .route("/tasks/:id/subtasks", get(list_subtasks).post(create_subtask))
        .route("/subtasks/:id", patch(update_subtask).delete(delete_subtask))
        
        // Notes
        .route("/projects/:id/notes", get(get_notes).put(update_notes))
        
        // Time Tracking
        .route("/time-entries", get(list_time_entries).post(start_timer))
        .route("/time-entries/active", get(get_active_timer_handler))
        .route("/time-entries/:id/stop", post(stop_timer))
        
        // Reports
        .route("/reports/time", get(time_report))
        
        // Dashboard
        .route("/dashboard/summary", get(dashboard_summary))
        
        .layer(cors)
        .with_state(state);
    
    let port = std::env::var("DEVTRACK_API_PORT").unwrap_or_else(|_| "8080".to_string());
    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    
    info!("DevTrack API listening on {}", addr);
    axum::serve(listener, app).await?;
    
    Ok(())
}

fn open_conn(db_path: &str) -> rusqlite::Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    Ok(conn)
}

// ==================== Projects ====================

async fn list_projects(State(state): State<Arc<AppState>>, Query(params): Query<ListProjectsParams>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let show_archived = params.archived.unwrap_or(false);
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_all_projects(&conn, show_archived)
    }).await;
    
    match result {
        Ok(Ok(projects)) => {
            let mut result = Vec::new();
            for p in projects {
                let git = get_git_info(&p.path).map(|g| g.display_string());
                result.push(ProjectResponse { project: p, git });
            }
            Json(result).into_response()
        }
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Deserialize)]
struct ListProjectsParams {
    archived: Option<bool>,
}

#[derive(Serialize)]
struct ProjectResponse {
    #[serde(flatten)]
    project: Project,
    git: Option<String>,
}

async fn create_project(State(state): State<Arc<AppState>>, Json(payload): Json<CreateProjectRequest>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let abs_path = std::fs::canonicalize(&payload.path).unwrap_or_else(|_| std::path::PathBuf::from(&payload.path)).to_string_lossy().into_owned();
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        let id = devtrack_core::queries::create_project(&conn, &payload.name, &abs_path)?;
        let project = Project {
            id,
            name: payload.name,
            path: abs_path,
            status: "Active".to_string(),
            tags: String::new(),
            last_accessed: None,
            created_at: Utc::now().to_rfc3339(),
        };
        Ok::<_, anyhow::Error>(project)
    }).await;
    
    match result {
        Ok(Ok(project)) => (StatusCode::CREATED, Json(project)).into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_project(State(state): State<Arc<AppState>>, Path(id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_project_by_id(&conn, id)
    }).await;
    
    match result {
        Ok(Ok(project)) => {
            let git = get_git_info(&project.path);
            Json(ProjectResponse { project, git: git.map(|g| g.display_string()) }).into_response()
        }
        Ok(Err(_)) => (StatusCode::NOT_FOUND, "Project not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn update_project(State(state): State<Arc<AppState>>, Path(id): Path<i64>, Json(payload): Json<UpdateProjectRequest>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    let status = payload.status.clone();
    let tags = payload.tags.clone();
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::update_project(&conn, id, status.as_deref(), tags.as_deref())
    }).await;
    
    match result {
        Ok(Ok(_)) => {
            let db_path = state.db_path.clone();
            let id = id;
            let result = spawn_blocking(move || {
                let conn = open_conn(&db_path)?;
                devtrack_core::queries::get_project_by_id(&conn, id)
            }).await;
            match result {
                Ok(Ok(project)) => Json(project).into_response(),
                _ => (StatusCode::NOT_FOUND, "Project not found").into_response(),
            }
        }
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn delete_project(State(state): State<Arc<AppState>>, Path(id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::delete_project(&conn, id)
    }).await;
    
    match result {
        Ok(Ok(_)) => StatusCode::NO_CONTENT.into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_project_git(State(state): State<Arc<AppState>>, Path(id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_project_by_id(&conn, id)
    }).await;
    
    match result {
        Ok(Ok(project)) => {
            let git = get_git_info(&project.path);
            Json(git).into_response()
        }
        Ok(Err(_)) => (StatusCode::NOT_FOUND, "Project not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ==================== Tasks ====================

async fn list_tasks(State(state): State<Arc<AppState>>, Path(project_id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let project_id = project_id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_tasks_for_project(&conn, project_id)
    }).await;
    
    match result {
        Ok(Ok(tasks)) => Json(tasks).into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn create_task(State(state): State<Arc<AppState>>, Path(project_id): Path<i64>, Json(payload): Json<CreateTaskRequest>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let project_id = project_id;
    let title = payload.title.clone();
    let description = payload.description.clone();
    let priority = payload.priority.unwrap_or_else(|| "Medium".to_string());
    let due_date = payload.due_date.clone();
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        let id = devtrack_core::queries::create_task(&conn, project_id, &title, description.as_deref(), Some(&priority), due_date.as_deref())?;
        devtrack_core::queries::get_task_by_id(&conn, id)
    }).await;
    
    match result {
        Ok(Ok(task)) => (StatusCode::CREATED, Json(task)).into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_task(State(state): State<Arc<AppState>>, Path(id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_task_by_id(&conn, id)
    }).await;
    
    match result {
        Ok(Ok(task)) => Json(task).into_response(),
        Ok(Err(_)) => (StatusCode::NOT_FOUND, "Task not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn update_task(State(state): State<Arc<AppState>>, Path(id): Path<i64>, Json(payload): Json<UpdateTaskRequest>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    let title = payload.title.clone();
    let description = payload.description.clone();
    let status = payload.status.clone();
    let priority = payload.priority.clone();
    let due_date = payload.due_date.clone();
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::update_task(&conn, id, title.as_deref(), description.as_deref(), status.as_deref(), priority.as_deref(), due_date.as_deref())
    }).await;
    
    match result {
        Ok(Ok(_)) => {
            let db_path = state.db_path.clone();
            let id = id;
            let result = spawn_blocking(move || {
                let conn = open_conn(&db_path)?;
                devtrack_core::queries::get_task_by_id(&conn, id)
            }).await;
            match result {
                Ok(Ok(task)) => Json(task).into_response(),
                _ => (StatusCode::NOT_FOUND, "Task not found").into_response(),
            }
        }
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn delete_task(State(state): State<Arc<AppState>>, Path(id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::delete_task(&conn, id)
    }).await;
    
    match result {
        Ok(Ok(_)) => StatusCode::NO_CONTENT.into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ==================== Subtasks ====================

async fn list_subtasks(State(state): State<Arc<AppState>>, Path(task_id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let task_id = task_id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_subtasks(&conn, task_id)
    }).await;
    
    match result {
        Ok(Ok(subtasks)) => Json(subtasks).into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn create_subtask(State(state): State<Arc<AppState>>, Path(task_id): Path<i64>, Json(payload): Json<CreateSubTaskRequest>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let task_id = task_id;
    let title = payload.title.clone();
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        let id = devtrack_core::queries::create_subtask(&conn, task_id, &title)?;
        let subtasks = devtrack_core::queries::get_subtasks(&conn, task_id)?;
        Ok::<_, anyhow::Error>((id, subtasks))
    }).await;
    
    match result {
        Ok(Ok((id, subtasks))) => {
            if let Some(st) = subtasks.iter().find(|s| s.id == id) {
                (StatusCode::CREATED, Json(st.clone())).into_response()
            } else {
                (StatusCode::INTERNAL_SERVER_ERROR, "Failed to fetch created subtask").into_response()
            }
        }
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn update_subtask(State(state): State<Arc<AppState>>, Path(id): Path<i64>, Json(payload): Json<UpdateSubTaskRequest>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    let title = payload.title.clone();
    let done = payload.done;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::update_subtask(&conn, id, title.as_deref(), done)
    }).await;
    
    match result {
        Ok(Ok(_)) => {
            let db_path = state.db_path.clone();
            let id = id;
            let result = spawn_blocking(move || {
                let conn = open_conn(&db_path)?;
                devtrack_core::queries::get_subtasks(&conn, 0)
            }).await;
            match result {
                Ok(Ok(subtasks)) => {
                    if let Some(st) = subtasks.iter().find(|s| s.id == id) {
                        Json(st.clone()).into_response()
                    } else {
                        (StatusCode::NOT_FOUND, "Subtask not found").into_response()
                    }
                }
                _ => (StatusCode::NOT_FOUND, "Subtask not found").into_response(),
            }
        }
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn delete_subtask(State(state): State<Arc<AppState>>, Path(id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::delete_subtask(&conn, id)
    }).await;
    
    match result {
        Ok(Ok(_)) => StatusCode::NO_CONTENT.into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ==================== Notes ====================

async fn get_notes(State(state): State<Arc<AppState>>, Path(id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_project_by_id(&conn, id)
    }).await;
    
    match result {
        Ok(Ok(project)) => {
            let config = devtrack_core::Config::new().unwrap();
            let content = devtrack_core::queries::read_notes(&config, &project.name).unwrap_or_else(|_| "No notes found.".to_string());
            Json(serde_json::json!({ "project_id": id, "content": content })).into_response()
        }
        Ok(Err(_)) => (StatusCode::NOT_FOUND, "Project not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn update_notes(State(state): State<Arc<AppState>>, Path(id): Path<i64>, Json(payload): Json<NotesRequest>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let id = id;
    let content = payload.content.clone();
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_project_by_id(&conn, id)
    }).await;
    
    match result {
        Ok(Ok(project)) => {
            let config = devtrack_core::Config::new().unwrap();
            match devtrack_core::queries::write_notes(&config, &project.name, &content) {
                Ok(_) => Json(serde_json::json!({ "success": true })).into_response(),
                Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
            }
        }
        Ok(Err(_)) => (StatusCode::NOT_FOUND, "Project not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ==================== Time Tracking ====================

async fn list_time_entries(State(state): State<Arc<AppState>>, Query(params): Query<TimeEntriesParams>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let filter = params.period.unwrap_or_else(|| "today".to_string());
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_time_entries(&conn, &filter)
    }).await;
    
    match result {
        Ok(Ok(entries)) => Json(entries).into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Deserialize)]
struct TimeEntriesParams {
    period: Option<String>,
}

async fn start_timer(State(state): State<Arc<AppState>>, Json(payload): Json<CreateTimeEntryRequest>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let task_id = payload.task_id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::start_timer(&conn, task_id)
    }).await;
    
    match result {
        Ok(Ok(start)) => {
            Json(serde_json::json!({ "task_id": task_id, "start_time": start })).into_response()
        }
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn get_active_timer_handler(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_active_timer(&conn)
    }).await;
    
    match result {
        Ok(Ok(Some((task_id, start)))) => {
            Json(serde_json::json!({ "task_id": task_id, "start_time": start })).into_response()
        }
        Ok(Ok(None)) => Json(serde_json::json!({ "active": false })).into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

async fn stop_timer(State(state): State<Arc<AppState>>, Path(task_id): Path<i64>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let task_id = task_id;
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::stop_timer(&conn, task_id)
    }).await;
    
    match result {
        Ok(Ok(Some(duration))) => {
            Json(serde_json::json!({ "task_id": task_id, "duration_seconds": duration })).into_response()
        }
        Ok(Ok(None)) => (StatusCode::NOT_FOUND, "No active timer for this task").into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// ==================== Reports ====================

async fn time_report(State(state): State<Arc<AppState>>, Query(params): Query<TimeReportParams>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    let period = params.period.unwrap_or_else(|| "today".to_string());
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        devtrack_core::queries::get_time_log_report(&conn, &period)
    }).await;
    
    match result {
        Ok(Ok(summary)) => Json(summary).into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Deserialize)]
struct TimeReportParams {
    period: Option<String>,
}

// ==================== Dashboard ====================

async fn dashboard_summary(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let db_path = state.db_path.clone();
    
    let result = spawn_blocking(move || {
        let conn = open_conn(&db_path)?;
        let projects = devtrack_core::queries::get_all_projects(&conn, false).unwrap_or_default();
        let mut active_projects = 0;
        let mut total_tasks = 0;
        let mut todo_tasks = 0;
        let mut done_tasks = 0;
        
        for p in &projects {
            if p.status == "Active" { active_projects += 1; }
            let tasks = devtrack_core::queries::get_tasks_for_project(&conn, p.id).unwrap_or_default();
            for t in tasks {
                total_tasks += 1;
                if t.status == "Todo" { todo_tasks += 1; }
                else if t.status == "Done" { done_tasks += 1; }
            }
        }
        
        let active_timer = devtrack_core::queries::get_active_timer(&conn).ok().flatten();
        let timer_info = if let Some((task_id, start)) = active_timer {
            let elapsed = devtrack_core::now_ts() - start;
            Some(serde_json::json!({ "task_id": task_id, "elapsed_formatted": devtrack_core::format_duration(elapsed) }))
        } else {
            None
        };
        
        Ok::<_, anyhow::Error>(serde_json::json!({
            "total_projects": projects.len(),
            "active_projects": active_projects,
            "total_tasks": total_tasks,
            "todo_tasks": todo_tasks,
            "done_tasks": done_tasks,
            "active_timer": timer_info,
        }))
    }).await;
    
    match result {
        Ok(Ok(json)) => Json(json).into_response(),
        Ok(Err(e)) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}