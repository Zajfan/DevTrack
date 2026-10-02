mod project_repository;
use tauri::{
    Emitter,
    Manager,
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
};
use tauri_plugin_window_state::{StateFlags, WindowExt};

mod state;
mod commands;
mod settings;

use crate::state::AppState;

fn build_native_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let file = Submenu::with_id(app, "file", "File", true)?;
    let new_project = MenuItem::with_id(app, "new-project", "New Project", true, Some("Ctrl+N"))?;
    file.append(&new_project)?;
    let backup = MenuItem::with_id(app, "backup", "Backup Database…", true, None::<&str>)?;
    file.append(&backup)?;
    file.append(&PredefinedMenuItem::separator(app)?)?;
    file.append(&PredefinedMenuItem::quit(app, None::<&str>)?)?;

    let edit = Submenu::with_id(app, "edit", "Edit", true)?;
    edit.append(&PredefinedMenuItem::undo(app, None::<&str>)?)?;
    edit.append(&PredefinedMenuItem::redo(app, None::<&str>)?)?;
    edit.append(&PredefinedMenuItem::separator(app)?)?;
    edit.append(&PredefinedMenuItem::cut(app, None::<&str>)?)?;
    edit.append(&PredefinedMenuItem::copy(app, None::<&str>)?)?;
    edit.append(&PredefinedMenuItem::paste(app, None::<&str>)?)?;
    edit.append(&PredefinedMenuItem::select_all(app, None::<&str>)?)?;

    let view = Submenu::with_id(app, "view", "View", true)?;
    for (id, label, accel) in [
        ("nav-dashboard", "Dashboard", Some("Ctrl+1")),
        ("nav-projects", "Projects", Some("Ctrl+2")),
        ("nav-tasks", "Tasks", Some("Ctrl+3")),
        ("nav-timer", "Timer", Some("Ctrl+4")),
        ("nav-reports", "Reports", Some("Ctrl+5")),
        ("nav-settings", "Settings", Some("Ctrl+6")),
    ] {
        let item = MenuItem::with_id(app, id, label, true, accel)?;
        view.append(&item)?;
    }

    let window = Submenu::with_id(app, "window", "Window", true)?;
    window.append(&PredefinedMenuItem::minimize(app, None::<&str>)?)?;
    window.append(&PredefinedMenuItem::maximize(app, None::<&str>)?)?;
    window.append(&PredefinedMenuItem::separator(app)?)?;
    window.append(&PredefinedMenuItem::close_window(app, None::<&str>)?)?;

    let help = Submenu::with_id(app, "help", "Help", true)?;
    let about = MenuItem::with_id(app, "about", "About DevTrack", true, None::<&str>)?;
    help.append(&about)?;

    Menu::with_items(app, &[&file, &edit, &view, &window, &help])
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_single_instance::init(|app, _args, _cwd| {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }),
        )
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .on_menu_event(|app, event| {
            use tauri::Emitter;
            match event.id().as_ref() {
                "new-project" => { let _ = app.emit("menu-action", "new-project"); }
                "backup" => { let _ = app.emit("menu-action", "backup"); }
                "about" => {
                    use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
                    let _ = app.dialog().message("DevTrack — Solo Dev Project Management System.\n\nLocal-first project tracking with Git awareness, tasks, notes and time tracking.").kind(MessageDialogKind::Info).title("About DevTrack").show(|_| {});
                }
                id if id.starts_with("nav-") => {
                    let target = id.trim_start_matches("nav-");
                    let _ = app.emit("menu-action", target);
                }
                _ => {}
            }
        })
        .setup(|app| {
            let state = AppState::new().expect("Failed to initialize app state");
            app.manage(state);
            let menu = build_native_menu(app.handle())?;
            app.set_menu(menu)?;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.restore_state(StateFlags::all());
            }

            // Auto-sync: run once on start, then every 5 minutes (when enabled).
            // Runs in a background thread; skips when a timer is active.
            {
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    let run = |app: &tauri::AppHandle| -> Result<String, String> {
                        let state: tauri::State<AppState> = app.state();
                        if state.get_active_timer().is_some() {
                            return Err("timer running".to_string());
                        }
                        let settings = crate::settings::get_settings(app)?;
                        if !settings.sync_enabled || settings.sync_url.is_empty() {
                            return Err("sync disabled".to_string());
                        }
                        let sync = devtrack_core::sync::SyncSettings {
                            enabled: true,
                            repo_url: settings.sync_url,
                            branch: "main".to_string(),
                        };
                        let result = devtrack_core::sync::sync_now(&state.config, &sync);
                        if result.is_ok() {
                            if let Ok(fresh) = devtrack_core::get_db_connection(&state.config) {
                                *state.db.lock().unwrap() = fresh;
                            }
                            let _ = app.emit("sync-complete", ());
                        }
                        result
                    };
                    // on start (small delay so the UI settles)
                    std::thread::sleep(std::time::Duration::from_secs(10));
                    let _ = run(&app_handle);
                    // periodic
                    loop {
                        std::thread::sleep(std::time::Duration::from_secs(300));
                        let _ = run(&app_handle);
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            project_repository::project_directory,
            project_repository::project_file,
            project_repository::project_history,
            project_repository::project_github_open,
            project_repository::project_documentation_link,
            commands::projects_list,
            commands::project_get,
            commands::project_create,
            commands::project_update,
            commands::project_delete,
            commands::project_scan,
            commands::project_git,
            commands::tasks_list,
            commands::task_get,
            commands::task_create,
            commands::task_update,
            commands::task_delete,
            commands::task_toggle,
            commands::tasks_global,
            commands::git_commit,
            commands::subtasks_list,
            commands::subtask_create,
            commands::subtask_update,
            commands::subtask_delete,
            commands::timer_start,
            commands::timer_stop,
            commands::timer_active,
            commands::time_entries_list,
            commands::time_report,
            commands::notes_get,
            commands::notes_update,
            commands::dashboard_summary,
            commands::project_open_path,
            commands::project_open_terminal,
            commands::app_backup,
            commands::app_export_data,
            commands::app_import_data,
            commands::app_get_data_dir,
            commands::show_window,
            commands::quit_app,
            commands::settings_get,
            commands::settings_set,
            commands::sync_settings_get,
            commands::sync_test,
            commands::sync_now,
            commands::sync_status,
            commands::timer_pause,
            commands::timer_resume,
            commands::timer_state,
            commands::task_time_entries,
            commands::task_total_time,
            commands::time_entry_update,
            commands::time_entry_delete,
            commands::project_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}