use devtrack_core::{Config, init_db, queries, scan_projects, get_git_info};
use devtrack_core::models::{Project, Task, SubTask, TimeEntry};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    username: String,
    email: String,
    default_project_path: String,
    auto_start_timer: bool,
    theme: String,
    compact_mode: bool,
    sidebar_collapsed: bool,
    desktop_notifications: bool,
    timer_complete_sound: bool,
    daily_summary_email: bool,
    sync_enabled: bool,
    sync_provider: String,
    sync_url: String,
    api_port: u16,
    debug_mode: bool,
    telemetry_enabled: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            username: "developer".to_string(),
            email: "dev@example.com".to_string(),
            default_project_path: ".".to_string(),
            auto_start_timer: false,
            theme: "system".to_string(),
            compact_mode: false,
            sidebar_collapsed: false,
            desktop_notifications: true,
            timer_complete_sound: true,
            daily_summary_email: false,
            sync_enabled: false,
            sync_provider: "webdav".to_string(),
            sync_url: "".to_string(),
            api_port: 8080,
            debug_mode: false,
            telemetry_enabled: true,
        }
    }
}

fn now_ts() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64
}

fn setup_test_db() -> (Config, Arc<Mutex<rusqlite::Connection>>) {
    let mut _config = Config::new().unwrap();
    _config.db_path = std::path::PathBuf::from(":memory:");
    let conn = init_db(&_config).unwrap();
    (_config, Arc::new(Mutex::new(conn)))
}

#[test]
fn test_project_crud() {
    let (_config, db) = setup_test_db();
    let conn = db.lock().unwrap();

    let project_id = queries::create_project(&conn, "Test Project", "/tmp/test").unwrap();
    assert!(project_id > 0);

    let project = queries::get_project_by_id(&conn, project_id).unwrap();
    assert_eq!(project.name, "Test Project");
    assert_eq!(project.path, "/tmp/test");
    assert_eq!(project.status, "Active");

    let projects = queries::get_all_projects(&conn, false).unwrap();
    assert_eq!(projects.len(), 1);

    queries::update_project(&conn, project_id, None, None, Some("Archived"), Some("tag1,tag2")).unwrap();
    let updated = queries::get_project_by_id(&conn, project_id).unwrap();
    assert_eq!(updated.status, "Archived");
    assert_eq!(updated.tags, "tag1,tag2");

    queries::delete_project(&conn, project_id).unwrap();
    let projects = queries::get_all_projects(&conn, true).unwrap();
    assert_eq!(projects.len(), 0);
}

#[test]
fn test_task_crud() {
    let (_config, db) = setup_test_db();
    let conn = db.lock().unwrap();

    let project_id = queries::create_project(&conn, "Test Project", "/tmp/test").unwrap();

    let task_id = queries::create_task(&conn, project_id, "Test Task", Some("Description"), Some("High"), Some("2025-12-31")).unwrap();
    assert!(task_id > 0);

    let task = queries::get_task_by_id(&conn, task_id).unwrap();
    assert_eq!(task.title, "Test Task");
    assert_eq!(task.description, "Description");
    assert_eq!(task.priority, "High");
    assert_eq!(task.due_date, Some("2025-12-31".to_string()));
    assert_eq!(task.status, "Todo");
    assert_eq!(task.project_name, "Test Project");

    let tasks = queries::get_tasks_for_project(&conn, project_id).unwrap();
    assert_eq!(tasks.len(), 1);

    queries::update_task(&conn, task_id, Some("Updated Task"), None, Some("Done"), Some("Low"), None).unwrap();
    let updated = queries::get_task_by_id(&conn, task_id).unwrap();
    assert_eq!(updated.title, "Updated Task");
    assert_eq!(updated.status, "Done");
    assert_eq!(updated.priority, "Low");

    queries::delete_task(&conn, task_id).unwrap();
    let tasks = queries::get_tasks_for_project(&conn, project_id).unwrap();
    assert_eq!(tasks.len(), 0);
}

#[test]
fn test_subtask_crud() {
    let (_config, db) = setup_test_db();
    let conn = db.lock().unwrap();

    let project_id = queries::create_project(&conn, "Test Project", "/tmp/test").unwrap();
    let task_id = queries::create_task(&conn, project_id, "Test Task", None, None, None).unwrap();

    let subtask_id = queries::create_subtask(&conn, task_id, "Subtask 1").unwrap();
    assert!(subtask_id > 0);

    let subtasks = queries::get_subtasks(&conn, task_id).unwrap();
    assert_eq!(subtasks.len(), 1);
    assert_eq!(subtasks[0].title, "Subtask 1");
    assert!(!subtasks[0].done);

    queries::update_subtask(&conn, subtask_id, Some("Updated Subtask"), Some(true)).unwrap();
    let updated = queries::get_subtasks(&conn, task_id).unwrap();
    assert_eq!(updated[0].title, "Updated Subtask");
    assert!(updated[0].done);

    queries::delete_subtask(&conn, subtask_id).unwrap();
    let subtasks = queries::get_subtasks(&conn, task_id).unwrap();
    assert_eq!(subtasks.len(), 0);
}

#[test]
fn test_timer_operations() {
    let (_config, db) = setup_test_db();
    let conn = db.lock().unwrap();

    let project_id = queries::create_project(&conn, "Test Project", "/tmp/test").unwrap();
    let task_id = queries::create_task(&conn, project_id, "Test Task", None, None, None).unwrap();

    let _start_time = queries::start_timer(&conn, task_id).unwrap();

    let active = queries::get_active_timer(&conn).unwrap();
    assert!(active.is_some());
    assert_eq!(active.unwrap().0, task_id);

    let duration = queries::stop_timer(&conn, task_id).unwrap();
    assert!(duration.is_some());
    assert!(duration.unwrap() >= 0);

    let active = queries::get_active_timer(&conn).unwrap();
    assert!(active.is_none());

    let entries = queries::get_time_entries(&conn, "all").unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].task_id, task_id);
    assert!(entries[0].duration_seconds >= 0);
}

#[test]
fn test_time_entries_filter() {
    let (_config, db) = setup_test_db();
    let conn = db.lock().unwrap();

    let project_id = queries::create_project(&conn, "Test Project", "/tmp/test").unwrap();
    let task_id = queries::create_task(&conn, project_id, "Test Task", None, None, None).unwrap();

    let _start = queries::start_timer(&conn, task_id).unwrap();
    std::thread::sleep(std::time::Duration::from_millis(10));
    let _ = queries::stop_timer(&conn, task_id).unwrap();

    let today_entries = queries::get_time_entries(&conn, "today").unwrap();
    assert_eq!(today_entries.len(), 1);

    let week_entries = queries::get_time_entries(&conn, "week").unwrap();
    assert_eq!(week_entries.len(), 1);

    let all_entries = queries::get_time_entries(&conn, "all").unwrap();
    assert_eq!(all_entries.len(), 1);
}

#[test]
fn test_time_report() {
    let (_config, db) = setup_test_db();
    let conn = db.lock().unwrap();

    let project_id = queries::create_project(&conn, "Test Project", "/tmp/test").unwrap();
    let task_id = queries::create_task(&conn, project_id, "Test Task", None, None, None).unwrap();

    let _start = queries::start_timer(&conn, task_id).unwrap();
    std::thread::sleep(std::time::Duration::from_millis(10));
    let _ = queries::stop_timer(&conn, task_id).unwrap();

    let report = queries::get_time_log_report(&conn, "today").unwrap();
    assert_eq!(report.period, "Today");
    assert!(report.total_seconds >= 0);
    assert!(!report.total_formatted.is_empty());
    assert_eq!(report.entries.len(), 1);
    assert_eq!(report.entries[0].project, "Test Project");
    assert_eq!(report.entries[0].task, "Test Task");
}

#[test]
fn test_notes_operations() {
    let (config, _db) = setup_test_db();
    let conn = _db.lock().unwrap();

    let project_id = queries::create_project(&conn, "Test Project", "/tmp/test").unwrap();
    let _ = project_id;

    let notes_content = "# Test Notes\n\nThis is a test.";
    queries::write_notes(&config, "Test Project", notes_content).unwrap();

    let read_content = queries::read_notes(&config, "Test Project").unwrap();
    assert_eq!(read_content, notes_content);
}

#[test]
fn test_git_info() {
    use std::process::Command;
    let temp_dir = std::env::temp_dir().join(format!("devtrack_test_{}", now_ts()));
    std::fs::create_dir_all(&temp_dir).unwrap();

    Command::new("git")
        .args(["init"])
        .current_dir(&temp_dir)
        .output()
        .unwrap();

    Command::new("git")
        .args(["config", "user.email", "test@test.com"])
        .current_dir(&temp_dir)
        .output()
        .unwrap();

    Command::new("git")
        .args(["config", "user.name", "Test User"])
        .current_dir(&temp_dir)
        .output()
        .unwrap();

    std::fs::write(temp_dir.join("README.md"), "# Test").unwrap();
    Command::new("git")
        .args(["add", "."])
        .current_dir(&temp_dir)
        .output()
        .unwrap();

    Command::new("git")
        .args(["commit", "-m", "Initial commit"])
        .current_dir(&temp_dir)
        .output()
        .unwrap();

    let git_info = get_git_info(temp_dir.to_str().unwrap());
    assert!(git_info.is_some());
    let info = git_info.unwrap();
    assert!(info.branch == "main" || info.branch == "master");
    assert!(!info.is_dirty);

    std::fs::write(temp_dir.join("README.md"), "# Test Modified").unwrap();
    let git_info = get_git_info(temp_dir.to_str().unwrap()).unwrap();
    assert!(git_info.is_dirty);

    std::fs::remove_dir_all(&temp_dir).unwrap();
}

#[test]
fn test_project_scan() {
    let temp_dir = std::env::temp_dir().join(format!("devtrack_scan_{}", now_ts()));
    std::fs::create_dir_all(&temp_dir).unwrap();

    let project_dir = temp_dir.join("test_project");
    std::fs::create_dir_all(&project_dir).unwrap();
    std::fs::write(project_dir.join("Cargo.toml"), "[package]\nname = \"test\"").unwrap();

    let (_config, db) = setup_test_db();
    let conn = db.lock().unwrap();

    let count = scan_projects(&conn, &temp_dir).unwrap();
    assert!(count > 0);

    let projects = queries::get_all_projects(&conn, false).unwrap();
    assert!(projects.iter().any(|p| p.name == "test_project"));

    std::fs::remove_dir_all(&temp_dir).unwrap();
}

#[test]
fn test_settings_persistence() {
    let (_config, _db) = setup_test_db();
    
    let settings = Settings::default();
    assert_eq!(settings.username, "developer");
    assert_eq!(settings.theme, "system");
    assert!(settings.desktop_notifications);

    let updated_settings = Settings {
        username: "testuser".to_string(),
        theme: "dark".to_string(),
        ..settings
    };

    assert_eq!(updated_settings.username, "testuser");
    assert_eq!(updated_settings.theme, "dark");
}

#[test]
fn test_export_import_data() {
    let (_config, db) = setup_test_db();
    let conn = db.lock().unwrap();

    let project_id = queries::create_project(&conn, "Test Project", "/tmp/test").unwrap();
    let task_id = queries::create_task(&conn, project_id, "Test Task", Some("Description"), Some("High"), None).unwrap();
    let _subtask_id = queries::create_subtask(&conn, task_id, "Subtask 1").unwrap();

    let _start = queries::start_timer(&conn, task_id).unwrap();
    std::thread::sleep(std::time::Duration::from_millis(10));
    let _ = queries::stop_timer(&conn, task_id).unwrap();

    let projects = queries::get_all_projects(&conn, true).unwrap();
    let mut all_tasks = Vec::new();
    let mut all_subtasks = Vec::new();
    let mut all_time_entries = Vec::new();

    for project in &projects {
        let tasks = queries::get_tasks_for_project(&conn, project.id).unwrap();
        for task in &tasks {
            let subtasks = queries::get_subtasks(&conn, task.id).unwrap();
            all_subtasks.extend(subtasks);
        }
        all_tasks.extend(tasks);
    }

    all_time_entries = queries::get_time_entries(&conn, "all").unwrap();

    assert_eq!(projects.len(), 1);
    assert_eq!(all_tasks.len(), 1);
    assert_eq!(all_subtasks.len(), 1);
    assert_eq!(all_time_entries.len(), 1);

    #[derive(serde::Serialize)]
    struct ExportData {
        projects: Vec<Project>,
        tasks: Vec<Task>,
        subtasks: Vec<SubTask>,
        time_entries: Vec<TimeEntry>,
        exported_at: String,
    }

    let export = ExportData {
        projects: projects.clone(),
        tasks: all_tasks.clone(),
        subtasks: all_subtasks.clone(),
        time_entries: all_time_entries.clone(),
        exported_at: chrono::Utc::now().to_rfc3339(),
    };

    let json = serde_json::to_string_pretty(&export).unwrap();
    assert!(json.contains("Test Project"));
    assert!(json.contains("Test Task"));
    assert!(json.contains("Subtask 1"));
}

#[test]
fn test_backup_operation() {
    let temp_db = std::env::temp_dir().join(format!("test_projects_{}.db", now_ts()));
    let mut config = Config::new().unwrap();
    config.db_path = temp_db.clone();
    let conn = init_db(&config).unwrap();

    queries::create_project(&conn, "Test Project", "/tmp/test").unwrap();
    queries::create_task(&conn, 1, "Test Task", None, None, None).unwrap();

    let backup_path = config.data_dir.join(format!(
        "projects_{}.db.bak",
        chrono::Local::now().format("%Y%m%d_%H%M%S")
    ));
    
    std::fs::copy(&config.db_path, &backup_path).unwrap();
    assert!(backup_path.exists());
    
    std::fs::remove_file(&backup_path).unwrap();
    std::fs::remove_file(&temp_db).unwrap();
}

#[test]
fn test_dashboard_summary() {
    let (_config, db) = setup_test_db();
    let conn = db.lock().unwrap();

    let project_id1 = queries::create_project(&conn, "Project 1", "/tmp/p1").unwrap();
    let project_id2 = queries::create_project(&conn, "Project 2", "/tmp/p2").unwrap();
    queries::update_project(&conn, project_id2, None, None, Some("Archived"), None).unwrap();

    let _task_id1 = queries::create_task(&conn, project_id1, "Task 1", None, Some("High"), None).unwrap();
    let _task_id2 = queries::create_task(&conn, project_id1, "Task 2", None, Some("Medium"), None).unwrap();
    queries::update_task(&conn, _task_id2, None, None, Some("Done"), None, None).unwrap();
    let _task_id3 = queries::create_task(&conn, project_id2, "Task 3", None, Some("Low"), None).unwrap();

    let all_projects = queries::get_all_projects(&conn, true).unwrap();
    let active_projects = all_projects.iter().filter(|p| p.status == "Active").count();

    let mut total_tasks = 0;
    let mut active_tasks = 0;
    let mut completed_tasks = 0;

    for project in &all_projects {
        let tasks = queries::get_tasks_for_project(&conn, project.id).unwrap();
        total_tasks += tasks.len();
        for task in &tasks {
            if task.status == "Done" || task.status == "Completed" {
                completed_tasks += 1;
            } else {
                active_tasks += 1;
            }
        }
    }

    assert_eq!(all_projects.len(), 2);
    assert_eq!(active_projects, 1);
    assert_eq!(total_tasks, 3);
    assert_eq!(active_tasks, 2);
    assert_eq!(completed_tasks, 1);
}

#[test]
fn test_open_path_command() {
    use std::process::Command;
    
    #[cfg(target_os = "windows")]
    let cmd = "explorer";
    #[cfg(target_os = "macos")]
    let cmd = "open";
    #[cfg(target_os = "linux")]
    let cmd = "xdg-open";

    let temp_dir = std::env::temp_dir().join(format!("devtrack_open_{}", now_ts()));
    std::fs::create_dir_all(&temp_dir).unwrap();

    let output = Command::new(cmd)
        .arg(&temp_dir)
        .spawn();

    assert!(output.is_ok());
    std::fs::remove_dir_all(&temp_dir).unwrap();
}

#[test]
fn test_open_terminal_command() {
    use std::process::Command;
    
    let temp_dir = std::env::temp_dir().join(format!("devtrack_term_{}", now_ts()));
    std::fs::create_dir_all(&temp_dir).unwrap();

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("cmd")
            .args(["/C", "start", "cmd", "/K", "cd", &temp_dir.to_string_lossy()])
            .spawn();
        assert!(output.is_ok());
    }
    
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("osascript")
            .args([
                "-e",
                &format!("tell application \"Terminal\" to do script \"cd '{}'\"", temp_dir.to_string_lossy()),
            ])
            .spawn();
        assert!(output.is_ok());
    }
    
    #[cfg(target_os = "linux")]
    {
        let terminals = ["gnome-terminal", "konsole", "xterm", "alacritty", "kitty"];
        let mut _spawned = false;
        for term in terminals {
            if Command::new(term)
                .args(["--working-directory", &temp_dir.to_string_lossy()])
                .spawn()
                .is_ok()
            {
                _spawned = true;
                break;
            }
        }
    }

    std::fs::remove_dir_all(&temp_dir).unwrap();
}
