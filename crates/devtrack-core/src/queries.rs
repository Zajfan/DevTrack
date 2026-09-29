use super::models::*;
use crate::models::format_duration;
use chrono::{Local, Utc};
use git2::Repository;
use rusqlite::{params, Connection, Result, OptionalExtension};
use std::collections::HashMap;

pub fn get_all_projects(conn: &Connection, show_archived: bool) -> Result<Vec<Project>> {
    let sql = if show_archived {
        "SELECT id, name, path, status, tags, last_accessed, created_at FROM projects"
    } else {
        "SELECT id, name, path, status, tags, last_accessed, created_at FROM projects WHERE status != 'Archived'"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], |row| Ok(Project {
        id: row.get(0)?,
        name: row.get(1)?,
        path: row.get(2)?,
        status: row.get(3)?,
        tags: row.get(4)?,
        last_accessed: row.get(5)?,
        created_at: row.get(6)?,
    }))?;
    rows.collect()
}

pub fn get_project_by_id(conn: &Connection, id: i64) -> Result<Project> {
    conn.query_row(
        "SELECT id, name, path, status, tags, last_accessed, created_at FROM projects WHERE id = ?1",
        params![id],
        |row| Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            path: row.get(2)?,
            status: row.get(3)?,
            tags: row.get(4)?,
            last_accessed: row.get(5)?,
            created_at: row.get(6)?,
        }),
    )
}

pub fn create_project(conn: &Connection, name: &str, path: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO projects (name, path) VALUES (?1, ?2)",
        params![name, path],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_project(conn: &Connection, id: i64, status: Option<&str>, tags: Option<&str>) -> Result<()> {
    let mut updates = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(s) = status {
        updates.push("status = ?");
        params_vec.push(Box::new(s.to_string()));
    }
    if let Some(t) = tags {
        updates.push("tags = ?");
        params_vec.push(Box::new(t.to_string()));
    }
    
    if updates.is_empty() {
        return Ok(());
    }
    
    let sql = format!("UPDATE projects SET {} WHERE id = ?", updates.join(", "));
    params_vec.push(Box::new(id));
    
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice())?;
    Ok(())
}

pub fn update_project_last_accessed(conn: &Connection, id: i64) -> Result<()> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE projects SET last_accessed = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    Ok(())
}

pub fn delete_project(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_tasks_for_project(conn: &Connection, project_id: i64) -> Result<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at, p.name 
         FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.project_id = ?1"
    )?;
    let rows = stmt.query_map([project_id], |row| Ok(Task {
        id: row.get(0)?,
        project_id,
        project_name: row.get(7)?,
        title: row.get(1)?,
        description: row.get(2)?,
        status: row.get(3)?,
        priority: row.get(4)?,
        due_date: row.get(5)?,
        created_at: row.get(6)?,
    }))?;
    rows.collect()
}

pub fn get_task_by_id(conn: &Connection, id: i64) -> Result<Task> {
    conn.query_row(
        "SELECT t.id, t.project_id, p.name, t.title, t.description, t.status, t.priority, t.due_date, t.created_at 
         FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ?1",
        params![id],
        |row| Ok(Task {
            id: row.get(0)?,
            project_id: row.get(1)?,
            project_name: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            status: row.get(5)?,
            priority: row.get(6)?,
            due_date: row.get(7)?,
            created_at: row.get(8)?,
        }),
    )
}

pub fn create_task(conn: &Connection, project_id: i64, title: &str, description: Option<&str>, priority: Option<&str>, due_date: Option<&str>) -> Result<i64> {
    let priority = priority.unwrap_or("Medium");
    conn.execute(
        "INSERT INTO tasks (project_id, title, description, priority, due_date) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![project_id, title, description.unwrap_or(""), priority, due_date],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_task(conn: &Connection, id: i64, title: Option<&str>, description: Option<&str>, status: Option<&str>, priority: Option<&str>, due_date: Option<&str>) -> Result<()> {
    let mut updates = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(t) = title { updates.push("title = ?"); params_vec.push(Box::new(t.to_string())); }
    if let Some(d) = description { updates.push("description = ?"); params_vec.push(Box::new(d.to_string())); }
    if let Some(s) = status { updates.push("status = ?"); params_vec.push(Box::new(s.to_string())); }
    if let Some(p) = priority { updates.push("priority = ?"); params_vec.push(Box::new(p.to_string())); }
    if let Some(d) = due_date { updates.push("due_date = ?"); params_vec.push(Box::new(d.to_string())); }
    
    if updates.is_empty() {
        return Ok(());
    }
    
    let sql = format!("UPDATE tasks SET {} WHERE id = ?", updates.join(", "));
    params_vec.push(Box::new(id));
    
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice())?;
    Ok(())
}

pub fn delete_task(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_global_tasks(conn: &Connection, include_done: bool) -> Result<Vec<Task>> {
    let sql = if include_done {
        "SELECT t.id, t.project_id, p.name, t.title, t.description, t.status, t.priority, t.due_date, t.created_at 
         FROM tasks t JOIN projects p ON t.project_id = p.id
         ORDER BY 
            CASE t.status WHEN 'Todo' THEN 0 WHEN 'Done' THEN 1 ELSE 2 END,
            CASE t.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 WHEN 'Low' THEN 2 ELSE 3 END,
            t.created_at"
    } else {
        "SELECT t.id, t.project_id, p.name, t.title, t.description, t.status, t.priority, t.due_date, t.created_at 
         FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.status = 'Todo'
         ORDER BY 
            CASE t.priority WHEN 'High' THEN 0 WHEN 'Medium' THEN 1 WHEN 'Low' THEN 2 ELSE 3 END,
            t.created_at"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], |row| Ok(Task {
        id: row.get(0)?,
        project_id: row.get(1)?,
        project_name: row.get(2)?,
        title: row.get(3)?,
        description: row.get(4)?,
        status: row.get(5)?,
        priority: row.get(6)?,
        due_date: row.get(7)?,
        created_at: row.get(8)?,
    }))?;
    rows.collect()
}

pub fn get_subtasks(conn: &Connection, task_id: i64) -> Result<Vec<SubTask>> {
    let mut stmt = conn.prepare("SELECT id, task_id, title, done FROM subtasks WHERE task_id = ?1")?;
    let rows = stmt.query_map([task_id], |row| Ok(SubTask {
        id: row.get(0)?,
        task_id: row.get(1)?,
        title: row.get(2)?,
        done: row.get(3)?,
    }))?;
    rows.collect()
}

pub fn create_subtask(conn: &Connection, task_id: i64, title: &str) -> Result<i64> {
    conn.execute(
        "INSERT INTO subtasks (task_id, title) VALUES (?1, ?2)",
        params![task_id, title],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn update_subtask(conn: &Connection, id: i64, title: Option<&str>, done: Option<bool>) -> Result<()> {
    let mut updates = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(t) = title { updates.push("title = ?"); params_vec.push(Box::new(t.to_string())); }
    if let Some(d) = done { updates.push("done = ?"); params_vec.push(Box::new(d)); }
    
    if updates.is_empty() {
        return Ok(());
    }
    
    let sql = format!("UPDATE subtasks SET {} WHERE id = ?", updates.join(", "));
    params_vec.push(Box::new(id));
    
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice())?;
    Ok(())
}

pub fn delete_subtask(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM subtasks WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_time_entries(conn: &Connection, filter: &str) -> Result<Vec<TimeEntry>> {
    let (start_cutoff, end_cutoff) = match filter {
        "today" => {
            let now = Local::now();
            let start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_local_timezone(Local).unwrap().timestamp();
            let end = now.date_naive().and_hms_opt(23, 59, 59).unwrap().and_local_timezone(Local).unwrap().timestamp();
            (start, end)
        }
        "week" => {
            let now = Local::now();
            let start = (now - chrono::Duration::days(7)).date_naive().and_hms_opt(0, 0, 0).unwrap().and_local_timezone(Local).unwrap().timestamp();
            let end = now.date_naive().and_hms_opt(23, 59, 59).unwrap().and_local_timezone(Local).unwrap().timestamp();
            (start, end)
        }
        _ => (0, i64::MAX),
    };
    
    let mut stmt = conn.prepare(
        "SELECT te.id, te.task_id, t.title, p.name, te.start_time, te.end_time, te.duration_seconds, te.description
         FROM time_entries te
         JOIN tasks t ON te.task_id = t.id
         JOIN projects p ON t.project_id = p.id
         WHERE te.start_time >= ?1 AND te.start_time <= ?2
         ORDER BY te.start_time DESC"
    )?;
    let rows = stmt.query_map([start_cutoff, end_cutoff], |row| Ok(TimeEntry {
        id: row.get(0)?,
        task_id: row.get(1)?,
        task_title: row.get(2)?,
        project_name: row.get(3)?,
        start_time: row.get(4)?,
        end_time: row.get(5)?,
        duration_seconds: row.get(6)?,
        description: row.get(7)?,
    }))?;
    rows.collect()
}

pub fn start_timer(conn: &Connection, task_id: i64) -> Result<i64> {
    let start = now_ts();
    conn.execute(
        "INSERT INTO time_entries (task_id, start_time) VALUES (?1, ?2)",
        params![task_id, start],
    )?;
    Ok(start)
}

pub fn stop_timer(conn: &Connection, task_id: i64) -> Result<Option<i64>> {
    let entry = conn.query_row(
        "SELECT id, start_time FROM time_entries WHERE task_id = ?1 AND end_time IS NULL ORDER BY start_time DESC LIMIT 1",
        params![task_id],
        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
    ).optional()?;
    
    if let Some((entry_id, start)) = entry {
        let end = now_ts();
        let duration = end - start;
        conn.execute(
            "UPDATE time_entries SET end_time = ?1, duration_seconds = ?2 WHERE id = ?3",
            params![end, duration, entry_id],
        )?;
        Ok(Some(duration))
    } else {
        Ok(None)
    }
}

pub fn get_active_timer(conn: &Connection) -> Result<Option<(i64, i64)>> {
    conn.query_row(
        "SELECT task_id, start_time FROM time_entries WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1",
        [],
        |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
    ).optional()
}

pub fn update_time_entry_description(conn: &Connection, task_id: i64, start_time: i64, description: &str) -> Result<()> {
    conn.execute(
        "UPDATE time_entries SET description = ?1 WHERE task_id = ?2 AND start_time = ?3 AND end_time IS NULL",
        params![description, task_id, start_time],
    )?;
    Ok(())
}

pub fn get_time_log_report(conn: &Connection, period: &str) -> Result<TimeLogSummary> {
    let entries = get_time_entries(conn, period)?;
    
    let mut by_task: HashMap<(i64, String, String), i64> = HashMap::new();
    for e in &entries {
        let key = (e.task_id, e.project_name.clone(), e.task_title.clone());
        *by_task.entry(key).or_insert(0) += e.duration_seconds;
    }
    
    let mut sorted: Vec<_> = by_task.into_iter().collect();
    sorted.sort_by(|a, b| b.1.cmp(&a.1));
    
    let log_entries: Vec<TimeLogEntry> = sorted.into_iter().map(|((_, project, task), dur)| {
        TimeLogEntry {
            date: "".to_string(),
            project,
            task,
            duration: format_duration(dur),
            duration_seconds: dur,
        }
    }).collect();
    
    let total: i64 = entries.iter().map(|e| e.duration_seconds).sum();
    
    Ok(TimeLogSummary {
        period: match period { "today" => "Today", "week" => "This Week", _ => "All Time" }.to_string(),
        entries: log_entries,
        total_seconds: total,
        total_formatted: format_duration(total),
    })
}

pub fn get_notes_path(config: &crate::Config, project_name: &str) -> std::path::PathBuf {
    config.notes_dir.join(format!("{}.md", project_name))
}

pub fn read_notes(config: &crate::Config, project_name: &str) -> std::io::Result<String> {
    let path = get_notes_path(config, project_name);
    std::fs::read_to_string(path).or_else(|_| Ok("No notes found.".to_string()))
}

pub fn write_notes(config: &crate::Config, project_name: &str, content: &str) -> std::io::Result<()> {
    let path = get_notes_path(config, project_name);
    std::fs::write(path, content)
}

pub fn commit_and_push(path: &str, message: &str) -> anyhow::Result<()> {
    let mut repo = Repository::open(path)?;
    let mut index = repo.index()?;
    index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
    index.write()?;
    
    let tree_id = index.write_tree()?;
    let tree = repo.find_tree(tree_id)?;
    let sig = repo.signature()?;
    
    // Unborn HEAD (fresh repo): commit with no parents
    let parent_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
    let parents: Vec<&git2::Commit> = parent_commit.iter().collect();
    
    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        message,
        &tree,
        &parents,
    )?;
    
    // Push only if a remote exists; branch name follows HEAD
    if repo.find_remote("origin").is_ok() {
        let head_branch = repo.head()?.shorthand().unwrap_or("main").to_string();
        let refspec = format!("refs/heads/{}", head_branch);
        let mut remote = repo.find_remote("origin")?;
        remote.push(&[refspec.as_str()], None)?;
    }
    
    Ok(())
}
/// Simple key-value metadata store (sync state, etc.)
pub fn set_settings_metadata(config: &crate::Config, key: &str, value: &str) -> Result<()> {
    let conn = crate::get_db_connection(config)?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
        [],
    )?;
    conn.execute(
        "INSERT INTO metadata (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

pub fn get_settings_metadata(config: &crate::Config, key: &str) -> Option<String> {
    let conn = crate::get_db_connection(config).ok()?;
    conn.query_row(
        "SELECT value FROM metadata WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .ok()
}
