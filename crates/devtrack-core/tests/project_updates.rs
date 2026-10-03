use devtrack_core::{queries, Config, init_db};

#[test]
fn project_update_persists_location_and_metadata_together() {
    let root = std::env::temp_dir().join(format!("devtrack-project-update-{}", std::process::id()));
    std::fs::create_dir_all(&root).unwrap();
    let config = Config { data_dir: root.clone(), db_path: root.join("projects.db"), notes_dir: root.join("notes") };
    let conn = init_db(&config).unwrap();
    let id = queries::create_project(&conn, "Old name", "/old/location").unwrap();

    queries::update_project(&conn, id, Some("New name"), Some("/new/location"), Some("Paused"), Some("research, rust")).unwrap();

    let project = queries::get_project_by_id(&conn, id).unwrap();
    assert_eq!(project.name, "New name");
    assert_eq!(project.path, "/new/location");
    assert_eq!(project.status, "Paused");
    assert_eq!(project.tags, "research, rust");
    drop(conn);
    std::fs::remove_dir_all(root).unwrap();
}
