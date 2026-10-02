use devtrack_core::{Config, init_db, queries};
use rusqlite::params;

#[test]
fn migrates_existing_tasks_without_losing_data_and_is_repeatable() {
    let root = std::env::temp_dir().join(format!("devtrack-version-test-{}", std::process::id()));
    std::fs::create_dir_all(&root).unwrap();
    let config = Config { data_dir: root.clone(), db_path: root.join("projects.db"), notes_dir: root.join("notes") };
    let conn = init_db(&config).unwrap();
    let project = queries::create_project(&conn, "Version fixture", "/tmp").unwrap();
    let task = queries::create_task(&conn, project, "Existing task", None, None, None).unwrap();
    let version: String = conn.query_row("SELECT target_version FROM tasks WHERE id=?1", params![task], |r| r.get(0)).unwrap();
    assert_eq!(version, "");
    // Simulate the previous release schema with a populated task table.
    conn.execute("ALTER TABLE tasks DROP COLUMN target_version", []).unwrap();
    drop(conn);
    let conn = init_db(&config).unwrap();
    assert_eq!(queries::get_task_by_id(&conn, task).unwrap().title, "Existing task");
    drop(conn);
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn versions_round_trip_clear_and_invalid_updates_are_atomic() {
    let conn = rusqlite::Connection::open_in_memory().unwrap();
    conn.execute_batch("CREATE TABLE projects(id INTEGER PRIMARY KEY,name TEXT,path TEXT,status TEXT,tags TEXT,last_accessed TEXT,created_at TEXT); CREATE TABLE tasks(id INTEGER PRIMARY KEY,project_id INTEGER,title TEXT,description TEXT,status TEXT DEFAULT 'Todo',priority TEXT,due_date TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,target_version TEXT NOT NULL DEFAULT '');").unwrap();
    let project = queries::create_project(&conn, "Fixture", "/tmp").unwrap();
    for version in ["1.0", "0.0.0", "0.1.0-alpha.1", "1.0.0-beta.2+build.7"] {
        let id = queries::create_task_versioned(&conn, project, "Task", None, None, None, Some(version)).unwrap();
        assert_eq!(queries::get_task_by_id(&conn, id).unwrap().target_version, version);
        assert!(queries::update_task_versioned(&conn,id,Some("Lost title"),None,None,None,None,Some("invalid")).is_err());
        assert_eq!(queries::get_task_by_id(&conn,id).unwrap().title,"Task");
        queries::update_task_versioned(&conn,id,None,None,Some("Done"),None,None,None).unwrap();
        assert_eq!(queries::get_tasks_for_project(&conn,project).unwrap().iter().find(|t|t.id==id).unwrap().target_version,version);
        queries::update_task_versioned(&conn,id,None,None,None,None,None,Some("")).unwrap();
        assert_eq!(queries::get_global_tasks(&conn,true).unwrap().iter().find(|t|t.id==id).unwrap().target_version,"");
    }
    for version in ["1", "1.2.3.4", "01.2", "1.0-", "../1.0"] {
        assert!(queries::create_task_versioned(&conn,project,"Invalid",None,None,None,Some(version)).is_err());
    }
    assert_eq!(queries::get_global_tasks(&conn,true).unwrap().len(),4);
}
