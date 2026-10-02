use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub path: String,
    pub status: String,
    pub tags: String,
    pub last_accessed: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectWithGit {
    #[serde(flatten)]
    pub project: Project,
    pub git: Option<GitInfo>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: i64,
    pub project_id: i64,
    pub project_name: String,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub due_date: Option<String>,
    #[serde(default)]
    pub target_version: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubTask {
    pub id: i64,
    pub task_id: i64,
    pub title: String,
    pub done: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeEntry {
    pub id: i64,
    pub task_id: i64,
    pub task_title: String,
    pub project_name: String,
    pub start_time: i64,
    pub end_time: Option<i64>,
    pub duration_seconds: i64,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeLogFilter {
    pub period: String, // "today", "week", "all"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeLogEntry {
    pub date: String,
    pub project: String,
    pub task: String,
    pub duration: String,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeLogSummary {
    pub period: String,
    pub entries: Vec<TimeLogEntry>,
    pub total_seconds: i64,
    pub total_formatted: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskWithDetails {
    #[serde(flatten)]
    pub task: Task,
    pub subtasks: Vec<SubTask>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSummary {
    pub project: Project,
    pub git: Option<GitInfo>,
    pub recent_tasks: Vec<Task>,
    pub notes_snippet: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectRequest {
    pub status: Option<String>,
    pub tags: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskRequest {
    pub target_version: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskRequest {
    pub target_version: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSubTaskRequest {
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSubTaskRequest {
    pub title: Option<String>,
    pub done: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTimeEntryRequest {
    pub task_id: i64,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTimeEntryRequest {
    pub end_time: Option<i64>,
    pub duration_seconds: Option<i64>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotesRequest {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommitRequest {
    pub message: String,
}

impl Default for Task {
    fn default() -> Self {
        Self {
            id: 0,
            project_id: 0,
            project_name: String::new(),
            title: String::new(),
            description: String::new(),
            status: "Todo".to_string(),
            priority: "Medium".to_string(),
            due_date: None,
            target_version: String::new(),
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

impl Default for Project {
    fn default() -> Self {
        Self {
            id: 0,
            name: String::new(),
            path: String::new(),
            status: "Active".to_string(),
            tags: String::new(),
            last_accessed: None,
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

pub fn now_ts() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64
}

pub fn format_duration(seconds: i64) -> String {
    let hrs = seconds / 3600;
    let mins = (seconds % 3600) / 60;
    let secs = seconds % 60;
    if hrs > 0 {
        format!("{}h {}m", hrs, mins)
    } else if mins > 0 {
        format!("{}m {}s", mins, secs)
    } else {
        format!("{}s", secs)
    }
}