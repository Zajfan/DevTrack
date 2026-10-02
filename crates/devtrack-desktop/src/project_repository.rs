//! IPC for a read-only repository workspace; remote reads use the user's gh login.
use crate::AppState;
use devtrack_core::{
    queries,
    repository::{self, ChangedFile, DirectoryListing, WorkCommit, WorkHistory},
};
use serde_json::Value;
use std::path::PathBuf;
use tauri::State;

fn root(state: &AppState, id: i64) -> Result<PathBuf, String> {
    let conn = state
        .db
        .lock()
        .map_err(|_| "Database is unavailable".to_string())?;
    let project = queries::get_project_by_id(&conn, id).map_err(|e| e.to_string())?;
    Ok(PathBuf::from(project.path))
}

#[tauri::command]
pub async fn project_directory(
    state: State<'_, AppState>,
    id: i64,
    path: Option<String>,
) -> Result<DirectoryListing, String> {
    let root = root(&state, id)?;
    tauri::async_runtime::spawn_blocking(move || {
        repository::list_directory(&root, &path.unwrap_or_default())
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub async fn project_file(
    state: State<'_, AppState>,
    id: i64,
    path: String,
) -> Result<String, String> {
    let root = root(&state, id)?;
    tauri::async_runtime::spawn_blocking(move || repository::read_text(&root, &path))
        .await
        .map_err(|e| e.to_string())?
}

async fn github(endpoint: &str, fields: &[(&str, String)]) -> Result<Value, String> {
    let mut command = tokio::process::Command::new("gh");
    command.args([
        "api",
        "--hostname",
        "github.com",
        "--method",
        "GET",
        "-H",
        "Accept: application/vnd.github+json",
        endpoint,
    ]);
    for (key, value) in fields {
        command.args(["-f", &format!("{key}={value}")]);
    }
    command.env("GH_PROMPT_DISABLED", "1").kill_on_drop(true);
    let output = tokio::time::timeout(std::time::Duration::from_secs(25), command.output())
        .await
        .map_err(|_| {
            "GitHub request timed out. Local history is available; try syncing again.".to_string()
        })?
        .map_err(|_| {
            "GitHub CLI is unavailable. Install gh and run gh auth login to connect this project."
                .to_string()
        })?;
    if !output.status.success() {
        return Err("Could not read this GitHub repository. Check your connection and gh auth login, repository permissions, or API rate limits.".into());
    }
    serde_json::from_slice(&output.stdout)
        .map_err(|_| "GitHub returned an unexpected response".into())
}

fn github_commit(value: Value, repo: &str, prefix: &str) -> Result<WorkCommit, String> {
    let sha = value["sha"]
        .as_str()
        .ok_or("Missing commit SHA")?
        .to_string();
    let files = value["files"]
        .as_array()
        .map(|files| {
            files
                .iter()
                .filter_map(|f| {
                    let path = f["filename"].as_str()?.to_string();
                    if !prefix.is_empty() && !path.starts_with(&format!("{prefix}/")) {
                        return None;
                    }
                    let functions = repository::file_functions(&path, f["patch"].as_str().unwrap_or(""));
                    Some(ChangedFile {
                        path,
                        additions: f["additions"].as_u64().unwrap_or(0) as usize,
                        deletions: f["deletions"].as_u64().unwrap_or(0) as usize,
                        functions_added: functions,
                    })
                })
                .collect()
        })
        .unwrap_or_default();
    let metadata = &value["commit"];
    Ok(repository::normalize_commit(
        sha,
        metadata["message"].as_str().unwrap_or("").into(),
        metadata["author"]["name"]
            .as_str()
            .unwrap_or("Unknown")
            .into(),
        metadata["author"]["date"].as_str().unwrap_or("").into(),
        files,
        Some(repo),
    ))
}

#[tauri::command]
pub async fn project_history(
    state: State<'_, AppState>,
    id: i64,
    refresh: Option<bool>,
    page: Option<usize>,
) -> Result<WorkHistory, String> {
    let root = root(&state, id)?;
    let cache_path = state
        .config
        .data_dir
        .join("history")
        .join(format!("project-{id}.json"));
    let root_info = root.clone();
    let (repo, _, prefix) =
        tauri::async_runtime::spawn_blocking(move || repository::repository_info(&root_info))
            .await
            .map_err(|e| e.to_string())?;
    let cached = std::fs::read(&cache_path)
        .ok()
        .and_then(|b| serde_json::from_slice::<WorkHistory>(&b).ok())
        .filter(|h| h.repository == repo && h.source == "GitHub");
    if !refresh.unwrap_or(false) {
        if let Some(history) = cached.as_ref() {
            return Ok(history.clone());
        }
    }
    let page = page.unwrap_or(1).clamp(1, 1000);
    if let Some(repo) = repo {
        let mut fields = vec![("per_page", "30".into()), ("page", page.to_string())];
        if !prefix.is_empty() {
            fields.push(("path", prefix.clone()));
        }
        let result = async {
            let list = github(&format!("repos/{repo}/commits"), &fields).await?;
            let items = list
                .as_array()
                .ok_or("Unexpected GitHub history response")?;
            let has_more = items.len() == 30;
            let mut jobs = tokio::task::JoinSet::new();
            let mut commits = Vec::new();
            // Bounded concurrency; use matching local objects for rich diff evidence when available.
            for batch in items.chunks(4) {
                for item in batch {
                    let sha = item["sha"].as_str().ok_or("Missing SHA")?.to_string();
                    let repo = repo.clone();
                    let prefix = prefix.clone();
                    let root = root.clone();
                    jobs.spawn(async move {
                        let root_copy = root.clone();
                        let sha_copy = sha.clone();
                        let local = tauri::async_runtime::spawn_blocking(move || {
                            repository::local_commit(&root_copy, &sha_copy)
                        })
                        .await;
                        if let Ok(Ok(mut local)) = local {
                            local.url = Some(format!("https://github.com/{repo}/commit/{sha}"));
                            return Ok::<_, String>(local);
                        }
                        let detail = github(&format!("repos/{repo}/commits/{sha}"), &[]).await?;
                        github_commit(detail, &repo, &prefix)
                    });
                }
                while let Some(item) = jobs.join_next().await {
                    let commit = item.map_err(|e| e.to_string())??;
                    if !commit.files.is_empty() {
                        commits.push(commit);
                    }
                }
            }
            commits.sort_by(|a, b| b.date.cmp(&a.date));
            if page > 1 {
                if let Some(cache) = cached.as_ref() {
                    commits.extend(cache.commits.clone());
                }
            }
            commits.sort_by(|a, b| b.date.cmp(&a.date));
            let mut seen = std::collections::HashSet::new();
            commits.retain(|c| seen.insert(c.sha.clone()));
            Ok::<_, String>(WorkHistory {
                commits,
                source: "GitHub".into(),
                repository: Some(repo.clone()),
                fetched_at: chrono::Utc::now().to_rfc3339(),
                notice: None,
                has_more,
                next_page: page + 1,
            })
        }
        .await;
        match result {
            Ok(mut history) => {
                // Atomic replacement keeps the previous cache usable if a sync is interrupted.
                let save = (|| -> Result<(), String> {
                    std::fs::create_dir_all(cache_path.parent().unwrap())
                        .map_err(|e| e.to_string())?;
                    let bytes = serde_json::to_vec(&history).map_err(|e| e.to_string())?;
                    let temp = cache_path.with_extension("tmp");
                    std::fs::write(&temp, bytes).map_err(|e| e.to_string())?;
                    std::fs::rename(temp, &cache_path).map_err(|e| e.to_string())
                })();
                if save.is_err() {
                    history.notice =
                        Some("History loaded, but could not be cached for offline use.".into());
                }
                return Ok(history);
            }
            Err(error) => {
                if let Some(mut cache) = cached {
                    cache.notice = Some(format!("{error} Showing the last successful sync."));
                    return Ok(cache);
                }
                let mut local =
                    tauri::async_runtime::spawn_blocking(move || repository::local_history(&root))
                        .await
                        .map_err(|e| e.to_string())?;
                local.notice = Some(format!(
                    "{error} Showing local Git history instead (up to 200 commits)."
                ));
                return Ok(local);
            }
        }
    }
    let mut local = tauri::async_runtime::spawn_blocking(move || repository::local_history(&root))
        .await
        .map_err(|e| e.to_string())?;
    local.notice = Some(
        "No GitHub origin found. Showing local Git history when available (up to 200 commits)."
            .into(),
    );
    Ok(local)
}

#[tauri::command]
pub async fn project_github_open(
    state: State<'_, AppState>,
    id: i64,
    sha: Option<String>,
) -> Result<(), String> {
    let root = root(&state, id)?;
    let (repo, _, _) = repository::repository_info(&root);
    let repo = repo.ok_or("This project has no GitHub origin configured")?;
    let url = match sha {
        Some(sha) if sha.len() == 40 && sha.chars().all(|c| c.is_ascii_hexdigit()) => {
            format!("https://github.com/{repo}/commit/{sha}")
        }
        Some(_) => return Err("Invalid commit identifier".into()),
        None => format!("https://github.com/{repo}"),
    };
    opener::open(url).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn project_documentation_link(
    id: i64,
    state: State<'_, AppState>,
    url: String,
) -> Result<(), String> {
    root(&state, id)?;
    let parsed = tauri::Url::parse(&url).map_err(|_| "Invalid link".to_string())?;
    if !matches!(parsed.scheme(), "https" | "http" | "mailto") {
        return Err("This link type cannot be opened".into());
    }
    opener::open(parsed.as_str()).map_err(|e| e.to_string())
}
