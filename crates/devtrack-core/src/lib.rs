use chrono::{Local, Utc};
use directories::ProjectDirs;
use git2::{BranchType, Repository, StatusOptions};
use rusqlite::{params, Connection, Result, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub mod repository;
pub mod models;
pub mod queries;
pub mod sync;

pub use models::*;
pub use queries::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub data_dir: PathBuf,
    pub db_path: PathBuf,
    pub notes_dir: PathBuf,
}

impl Config {
    pub fn new() -> anyhow::Result<Self> {
        let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack")
            .ok_or_else(|| anyhow::anyhow!("Could not determine config directory"))?;
        let data_dir = proj_dirs.data_dir().to_path_buf();
        let db_path = data_dir.join("projects.db");
        let notes_dir = data_dir.join("notes");
        std::fs::create_dir_all(&data_dir)?;
        std::fs::create_dir_all(&notes_dir)?;
        Ok(Self { data_dir, db_path, notes_dir })
    }
}

pub fn init_db(config: &Config) -> Result<Connection> {
    let conn = Connection::open(&config.db_path)?;
    
    // Enable WAL mode for better concurrency
    conn.pragma_update(None, "journal_mode", "WAL")?;
    
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY, 
            name TEXT NOT NULL UNIQUE, 
            path TEXT NOT NULL, 
            status TEXT NOT NULL DEFAULT 'Active', 
            tags TEXT DEFAULT '', 
            last_accessed DATETIME, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY, 
            project_id INTEGER NOT NULL, 
            title TEXT NOT NULL, 
            description TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Todo', 
            priority TEXT DEFAULT 'Medium', 
            due_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            FOREIGN KEY(project_id) REFERENCES projects(id)
        );
        
        CREATE TABLE IF NOT EXISTS subtasks (
            id INTEGER PRIMARY KEY,
            task_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            done BOOLEAN NOT NULL DEFAULT 0,
            FOREIGN KEY(task_id) REFERENCES tasks(id)
        );
        
        CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY,
            task_id INTEGER NOT NULL,
            start_time INTEGER NOT NULL,
            end_time INTEGER,
            duration_seconds INTEGER DEFAULT 0,
            description TEXT DEFAULT '',
            FOREIGN KEY(task_id) REFERENCES tasks(id)
        );",
    )?;

    // Migrations
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN due_date TEXT", []);
    let _ = conn.execute("ALTER TABLE time_entries ADD COLUMN paused_at INTEGER", []);
    
    Ok(conn)
}

pub fn get_db_connection(config: &Config) -> Result<Connection> {
    let conn = Connection::open(&config.db_path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    Ok(conn)
}

pub fn scan_projects(conn: &Connection, root: &Path) -> anyhow::Result<usize> {
    let mut found = 0;
    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_dir() {
            let path = entry.path();
            let is_project = path.join(".git").exists() 
                || path.join("Cargo.toml").exists() 
                || path.join("package.json").exists() 
                || path.join("go.mod").exists();
            if is_project {
                let name = path.file_name()
                    .and_then(|s| s.to_str())
                    .unwrap_or("unknown")
                    .to_string();
                let abs_path = std::fs::canonicalize(path)?.to_string_lossy().into_owned();
                let _ = conn.execute(
                    "INSERT OR IGNORE INTO projects (name, path) VALUES (?1, ?2)", 
                    params![name, abs_path]
                );
                found += 1;
            }
        }
    }
    Ok(found)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitInfo {
    pub branch: String,
    pub is_dirty: bool,
    pub ahead: usize,
    pub behind: usize,
    pub stashes: usize,
}

impl GitInfo {
    pub fn display_string(&self) -> String {
        let mut s = self.branch.clone();
        if self.ahead > 0 || self.behind > 0 {
            s.push_str(&format!(" ↑{} ↓{}", self.ahead, self.behind));
        }
        if self.stashes > 0 {
            s.push_str(&format!(" ${{${}}}", self.stashes));
        }
        if self.is_dirty { s.push_str(" *"); }
        s
    }
}

pub fn get_git_info(path: &str) -> Option<GitInfo> {
    let mut repo = Repository::open(path).ok()?;

    // Unborn HEAD (fresh `git init`, no commits) still has a branch name
    let (branch, local_oid) = match repo.head() {
        Ok(head) => {
            let b = head.shorthand().unwrap_or("unknown").to_string();
            let oid = head.target();
            (b, oid)
        }
        Err(_) if repo.is_empty().unwrap_or(false) => {
            let b = repo
                .config()
                .ok()
                .and_then(|c| c.get_string("init.defaultbranch").ok())
                .unwrap_or_else(|| "main".to_string());
            (b, None)
        }
        Err(_) => return None,
    };

    // Upstream tracking needs at least one commit
    let (ahead, behind) = if let Some(local_oid) = local_oid {
        if let Ok(branch_ref) = repo.find_branch(&branch, BranchType::Local) {
            if let Ok(upstream) = branch_ref.upstream() {
                if let Some(upstream_oid) = upstream.get().target() {
                    repo.graph_ahead_behind(local_oid, upstream_oid).unwrap_or((0, 0))
                } else {
                    (0, 0)
                }
            } else {
                (0, 0)
            }
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };

    let mut stashes = 0;
    let _ = repo.stash_foreach(|_index, _oid, _msg| {
        stashes += 1;
        true
    });

    let mut status_options = StatusOptions::new();
    let statuses = repo.statuses(Some(&mut status_options)).ok()?;
    let is_dirty = !statuses.is_empty();

    Some(GitInfo { branch, is_dirty, ahead, behind, stashes })
}