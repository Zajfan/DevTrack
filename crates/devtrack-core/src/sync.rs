use crate::Config;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SyncSettings {
    pub enabled: bool,
    pub repo_url: String,
    pub branch: String,
}

impl Default for SyncSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            repo_url: String::new(),
            branch: "main".to_string(),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SyncStatus {
    pub configured: bool,
    pub repo_ready: bool,
    pub last_message: String,
    pub last_synced_at: Option<i64>,
}

pub fn sync_repo_path(config: &Config) -> PathBuf {
    config.data_dir.join("sync-repo")
}

fn run_git(repo_dir: &Path, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo_dir)
        .args(args)
        .output()
        .map_err(|e| format!("git not available: {e}"))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn now_ts() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64
}

pub fn test_connection(settings: &SyncSettings) -> Result<String, String> {
    if settings.repo_url.is_empty() {
        return Err("No sync repository URL configured".to_string());
    }
    let tmp = std::env::temp_dir().join(format!("devtrack-sync-test-{}", now_ts()));
    let output = Command::new("git")
        .args(["clone", "--depth", "1", "-q", &settings.repo_url])
        .arg(&tmp)
        .output()
        .map_err(|e| format!("git not available: {e}"))?;
    let _ = std::fs::remove_dir_all(&tmp);
    if output.status.success() {
        Ok("Connection OK".to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

fn ensure_repo(config: &Config, settings: &SyncSettings) -> Result<PathBuf, String> {
    let repo_dir = sync_repo_path(config);
    if repo_dir.join(".git").exists() {
        // fetch latest remote state
        run_git(&repo_dir, &["fetch", "origin"])?;
        return Ok(repo_dir);
    }
    std::fs::create_dir_all(&repo_dir).map_err(|e| e.to_string())?;
    let output = Command::new("git")
        .args(["clone", "-q", &settings.repo_url])
        .arg(&repo_dir)
        .output()
        .map_err(|e| format!("git not available: {e}"))?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        let _ = std::fs::remove_dir_all(&repo_dir);
        return Err(format!("clone failed: {err}"));
    }
    Ok(repo_dir)
}

fn copy_into(src_dir: &Path, dest_dir: &Path) -> Result<usize, String> {
    std::fs::create_dir_all(dest_dir).map_err(|e| e.to_string())?;
    let mut count = 0;
    let entries = std::fs::read_dir(src_dir).map_err(|e| e.to_string())?;
    for entry in entries.filter_map(|e| e.ok()) {
        let ty = entry.file_type().map_err(|e| e.to_string())?;
        if ty.is_file() {
            std::fs::copy(entry.path(), dest_dir.join(entry.file_name())).map_err(|e| e.to_string())?;
            count += 1;
        }
    }
    Ok(count)
}

/// Checkpoint the WAL into the main DB file so a file copy captures all data.
pub fn checkpoint_db(config: &Config) -> Result<(), String> {
    if !config.db_path.exists() {
        return Ok(());
    }
    let conn = rusqlite::Connection::open(&config.db_path).map_err(|e| e.to_string())?;
    conn.query_row("PRAGMA wal_checkpoint(TRUNCATE)", [], |row| Ok(()))
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Full sync: pull remote, last-writer-wins merge per file, commit + push.
/// Backs up the local DB before any remote file overwrites it.
pub fn sync_now(config: &Config, settings: &SyncSettings) -> Result<String, String> {
    if settings.repo_url.is_empty() {
        return Err("No sync repository URL configured".to_string());
    }
    // WAL: fold the journal into the main file FIRST — backups and copies of the
    // main file are otherwise an empty schema (all data lives in projects.db-wal)
    checkpoint_db(config)?;

    if config.db_path.exists() {
        let backups = config.data_dir.join("backups");
        std::fs::create_dir_all(&backups).map_err(|e| e.to_string())?;
        let stamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
        std::fs::copy(&config.db_path, backups.join(format!("pre-sync-{stamp}.db")))
            .map_err(|e| e.to_string())?;
    }

    let repo_dir = ensure_repo(config, settings)?;
    let branch = settings.branch.clone();

    // checkout/track the configured branch
    let _ = run_git(&repo_dir, &["checkout", &branch]);

    // 1. Copy local state into the repo working tree
    let repo_db = repo_dir.join("projects.db");
    if config.db_path.exists() {
        std::fs::copy(&config.db_path, &repo_db).map_err(|e| e.to_string())?;
    }
    let repo_notes = repo_dir.join("notes");
    if config.notes_dir.exists() {
        copy_into(&config.notes_dir, &repo_notes)?;
    }

    // 2. Commit local changes (if any)
    let _ = run_git(&repo_dir, &["add", "-A"]);
    let status = run_git(&repo_dir, &["status", "--porcelain"])?;
    let mut pushed = false;
    if !status.trim().is_empty() {
        let msg = format!("devtrack sync {}", chrono::Local::now().format("%Y-%m-%d %H:%M:%S"));
        let commit = Command::new("git")
            .arg("-C")
            .arg(&repo_dir)
            .args(["-c", "user.name=devtrack", "-c", "user.email=devtrack@local", "commit", "-q", "-m", &msg])
            .output()
            .map_err(|e| format!("git not available: {e}"))?;
        if !commit.status.success() {
            return Err(String::from_utf8_lossy(&commit.stderr).to_string());
        }
    }

    // 3. Push the ACTUAL current branch (cloning an empty repo yields the local
    //    default branch name, which may differ from settings.branch)
    let current_branch = run_git(&repo_dir, &["rev-parse", "--abbrev-ref", "HEAD"])
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| branch.clone());
    let push = run_git(&repo_dir, &["push", "-u", "origin", &current_branch]);
    pushed = push.is_ok();

    // 4. Pull remote-only changes (no-op if we are up to date)
    let pull = run_git(&repo_dir, &["pull", "--rebase", "-q", "origin", &current_branch]);
    if let Err(e) = pull {
        // Empty remote (nothing pushed yet, e.g. commit was a no-op): not an error
        if !e.contains("couldn't find remote ref") && !e.contains("no tracking information") {
            return Err(format!("pull failed: {e}"));
        }
    }

    // 5. Copy remote state back into local data dir. Remove the local WAL/SHM
    //    first — they belong to the old database and would shadow the restored file.
    let mut restored = 0;
    let _ = std::fs::remove_file(config.data_dir.join("projects.db-wal"));
    let _ = std::fs::remove_file(config.data_dir.join("projects.db-shm"));
    if repo_db.exists() {
        std::fs::copy(&repo_db, &config.db_path).map_err(|e| e.to_string())?;
        restored += 1;
    }
    if repo_notes.exists() {
        restored += copy_into(&repo_notes, &config.notes_dir)?;
    }

    let stamp = chrono::Local::now().to_rfc3339();
    let _ = crate::queries::set_settings_metadata(config, "last_synced_at", &stamp);

    Ok(format!(
        "Sync complete: {} (pushed: {}, files in sync: {})",
        if pushed { "pushed to remote" } else { "no changes to push" },
        pushed,
        restored
    ))
}

pub fn sync_status(config: &Config, settings: &SyncSettings) -> SyncStatus {
    let repo_dir = sync_repo_path(config);
    let repo_ready = repo_dir.join(".git").exists();
    let last = crate::queries::get_settings_metadata(config, "last_synced_at")
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
        .map(|d| d.timestamp());
    SyncStatus {
        configured: !settings.repo_url.is_empty(),
        repo_ready,
        last_message: if settings.repo_url.is_empty() {
            "Not configured".to_string()
        } else if repo_ready {
            "Repository ready".to_string()
        } else {
            "Will clone on first sync".to_string()
        },
        last_synced_at: last,
    }
}