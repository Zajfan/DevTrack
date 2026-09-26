use clap::{Parser, Subcommand};
use rusqlite::{params, Connection, Result};
use directories::ProjectDirs;
use std::path::{PathBuf};
use std::fs;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use git2::{Repository, StatusOptions};
use ratatui::{
    backend::CrosstermBackend,
    widgets::{Block, Borders, List, ListItem, Paragraph, Scrollbar, ScrollbarOrientation},
    layout::{Layout, Constraint, Direction},
    Terminal,
    style::{Style, Modifier, Color},
    text::{Line, Span},
};
use crossterm::{
    event::{self, Event, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use std::io;
use walkdir::WalkDir;

#[derive(Parser)]
#[command(name = "dt")]
#[command(about = "DevTrack - Solo Dev Project Management System", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Add {
        #[arg(default_value = ".")]
        path: PathBuf,
        #[arg(short, long)]
        name: String,
    },
    Ls {
        #[arg(short, long)]
        active: bool,
        #[arg(short, long)]
        archived: bool,
    },
    Go {
        name: String,
    },
    Task {
        #[command(subcommand)]
        action: TaskAction,
    },
    Scan {
        path: PathBuf,
    },
    Dashboard {
        #[arg(short, long)]
        archived: bool,
    },
    Jump {
        name: String,
    },
    Backup {},
    Note {
        #[command(subcommand)]
        action: NoteAction,
    },
    Alias {},
    Search {
        query: String,
    },
    Log {
        period: Option<String>,
    },
}

#[derive(Subcommand)]
enum TaskAction {
    Add { project_name: String, title: String, #[arg(short, long, default_value = "Medium")] priority: String },
    Ls { project_name: String },
    Done { task_id: i32 },
}

#[derive(Subcommand)]
enum NoteAction {
    Open { project_name: String },
    Add { project_name: String, text: String },
}

#[derive(Clone, Default)]
struct Project {
    id: i32,
    name: String,
    path: String,
    status: String,
    tags: String,
    last_accessed: Option<String>,
}

#[derive(Clone, Default)]
struct Task {
    id: i32,
    project_id: i32,
    project_name: String,
    title: String,
    status: String,
    priority: String,
    description: String,
    due_date: Option<String>,
}

struct SubTask {
    id: i32,
    task_id: i32,
    title: String,
    done: bool,
}

struct TimeEntry {
    id: i32,
    task_id: i32,
    task_title: String,
    project_name: String,
    start_time: i64,
    end_time: Option<i64>,
    duration_seconds: i64,
    description: String,
}

struct GitInfo {
    branch: String,
    is_dirty: bool,
    ahead: usize,
    behind: usize,
    stashes: usize,
}

fn get_git_info(path: &str) -> Option<GitInfo> {
    let mut repo = Repository::open(path).ok()?;
    let head = repo.head().ok()?;
    let branch = head.shorthand().unwrap_or("unknown").to_string();
    let local_oid = head.target()?;
    drop(head); // Release the immutable borrow on repo
    
    // Get upstream tracking info
    let (ahead, behind) = if let Ok(branch_ref) = repo.find_branch(&branch, git2::BranchType::Local) {
        if let Ok(upstream) = branch_ref.upstream() {
            let upstream_oid = upstream.get().target()?;
            repo.graph_ahead_behind(local_oid, upstream_oid).unwrap_or((0, 0))
        } else {
            (0, 0)
        }
    } else {
        (0, 0)
    };
    
    // Count stashes
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

fn init_db() -> Result<Connection> {
    let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack")
        .expect("Could not determine config directory");
    let data_dir = proj_dirs.data_dir();
    fs::create_dir_all(data_dir).expect("Could not create data directory");
    
    let notes_dir = proj_dirs.data_dir().join("notes");
    fs::create_dir_all(notes_dir).expect("Could not create notes directory");

    let db_path = data_dir.join("projects.db");
    let conn = Connection::open(db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY, 
            name TEXT NOT NULL UNIQUE, 
            path TEXT NOT NULL, 
            status TEXT NOT NULL DEFAULT 'Active', 
            tags TEXT DEFAULT '', 
            last_accessed DATETIME, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )", 
        []
    )?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY, 
            project_id INTEGER NOT NULL, 
            title TEXT NOT NULL, 
            description TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Todo', 
            priority TEXT DEFAULT 'Medium', 
            due_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            FOREIGN KEY(project_id) REFERENCES projects(id)
        )", 
        []
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS subtasks (
            id INTEGER PRIMARY KEY,
            task_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            done BOOLEAN NOT NULL DEFAULT 0,
            FOREIGN KEY(task_id) REFERENCES tasks(id)
        )",
        []
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS time_entries (
            id INTEGER PRIMARY KEY,
            task_id INTEGER NOT NULL,
            start_time INTEGER NOT NULL,
            end_time INTEGER,
            duration_seconds INTEGER DEFAULT 0,
            description TEXT DEFAULT '',
            FOREIGN KEY(task_id) REFERENCES tasks(id)
        )",
        []
    )?;

    // Migrations
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE tasks ADD COLUMN due_date TEXT", []);
    
    Ok(conn)
}

fn scan_projects(conn: &Connection, root: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let mut found = 0;
    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_dir() {
            let path = entry.path();
            let is_project = path.join(".git").exists() || path.join("Cargo.toml").exists() || path.join("package.json").exists() || path.join("go.mod").exists();
            if is_project {
                let name = path.file_name().unwrap_or_default().to_string_lossy().into_owned();
                let abs_path = fs::canonicalize(path)?.to_string_lossy().into_owned();
                let _ = conn.execute("INSERT OR IGNORE INTO projects (name, path) VALUES (?1, ?2)", params![name, abs_path]);
                found += 1;
            }
        }
    }
    println!("Scanned root: {}. Registered {} projects.", root.display(), found);
    Ok(())
}

fn now_ts() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() as i64
}

fn format_duration(seconds: i64) -> String {
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

fn run_dashboard(conn: &Connection, show_archived: bool) -> Result<(), Box<dyn std::error::Error>> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut projects = get_all_projects(conn, show_archived).unwrap_or_default();
    let mut selected_index = 0;
    let mut search_query = String::new();
    let mut view_mode = ViewMode::Projects;
    let mut selected_project_id = 0;
    let mut task_selected_index = 0;
    let mut input_mode = InputMode::None;
    let mut input_buffer = String::new();
    let mut note_scroll = 0;
    let mut task_detail_scroll = 0;
    let mut subtask_selected_index = 0;
    let mut editing_subtask = false;
    let mut log_scroll = 0;
    let mut log_filter = LogFilter::Today;

    // Timer state: (task_id, start_time)
    let mut active_timer: Option<(i32, i64)> = None;

    loop {
        // Update active timer display
        let timer_display = if let Some((task_id, start)) = active_timer {
            let elapsed = now_ts() - start;
            let task_title = conn.query_row("SELECT title FROM tasks WHERE id = ?1", params![task_id], |r| r.get::<_, String>(0)).unwrap_or_default();
            format!(" ⏱ {} - {} ", task_title, format_duration(elapsed))
        } else {
            String::new()
        };

        terminal.draw(|f| {
            let size = f.size();
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .constraints([
                    Constraint::Length(3), // Header/Search
                    Constraint::Min(0),    // Main Content
                    Constraint::Length(3), // Footer/Help
                ].as_ref())
                .split(size);

            // --- HEADER / SEARCH ---
            let header_title = match view_mode {
                ViewMode::Projects => " DevTrack - Projects ",
                ViewMode::Tasks => " DevTrack - Tasks ",
                ViewMode::GlobalTasks => " DevTrack - Global Tasks ",
                ViewMode::Summary => " DevTrack - Summary ",
                ViewMode::NoteViewer => " DevTrack - Notes ",
                ViewMode::TaskDetail => " DevTrack - Task Detail ",
                ViewMode::TimeLog => " DevTrack - Time Log ",
            };

            let search_text = match input_mode {
                InputMode::Task => format!("Adding Task: {}", input_buffer),
                InputMode::Tag => format!("Adding Tag: {}", input_buffer),
                InputMode::TaskDesc => format!("Task Description: {}", input_buffer),
                InputMode::TaskDueDate => format!("Due Date (YYYY-MM-DD): {}", input_buffer),
                InputMode::SubTask => format!("Sub-task: {}", input_buffer),
                InputMode::LogNote => format!("Log Note: {}", input_buffer),
                InputMode::CommitMsg => format!("Commit Message: {}", input_buffer),
                InputMode::None => match view_mode {
                    ViewMode::Projects => if search_query.is_empty() { "Search (@tag, type name)..." } else { &search_query },
                    ViewMode::Tasks => "Project Tasks (Enter: Detail, Esc: Back)",
                    ViewMode::GlobalTasks => "Global Todo List (Esc: Back)",
                    ViewMode::Summary => "Project Summary (Esc: Back)",
                    ViewMode::NoteViewer => "Notes (Esc: Back, n: Edit)",
                    ViewMode::TaskDetail => "Task Detail (Esc: Back)",
                    ViewMode::TimeLog => "Time Log (Esc: Back)",
                }.to_string(),
            };
            
            let header = Paragraph::new(search_text + &timer_display)
                .block(Block::default().borders(Borders::ALL).title(header_title));
            f.render_widget(header, chunks[0]);

            // --- MAIN CONTENT ---
            match view_mode {
                ViewMode::Tasks => {
                    let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                    let items: Vec<ListItem> = tasks.iter().enumerate().map(|(i, t)| {
                        let style = if i == task_selected_index { Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD) } else { Style::default() };
                        let desc_preview = if t.description.is_empty() { "" } else { &format!(" - {}", &t.description[..t.description.len().min(50)]) };
                        let timer_indicator = if active_timer.map(|(id, _)| id).unwrap_or(-1) == t.id { " ⏱" } else { "" };
                        ListItem::new(format!("[{}] ({}) {}{} - {}{}", t.id, t.priority, t.title, desc_preview, t.status, timer_indicator)).style(style)
                    }).collect();
                    let task_list = List::new(items)
                        .block(Block::default().borders(Borders::ALL).title(" Project Tasks "));
                    f.render_widget(task_list, chunks[1]);
                }
                ViewMode::GlobalTasks => {
                    let tasks = get_global_tasks(conn).unwrap_or_default();
                    let items: Vec<ListItem> = tasks.iter().map(|t| {
                        let timer_indicator = if active_timer.map(|(id, _)| id).unwrap_or(-1) == t.id { " ⏱" } else { "" };
                        ListItem::new(format!("[{}] ({}) ({}) {} - {}{}", t.id, t.priority, t.project_name, t.title, t.status, timer_indicator))
                    }).collect();
                    let global_list = List::new(items)
                        .block(Block::default().borders(Borders::ALL).title(" Global Todo List "));
                    f.render_widget(global_list, chunks[1]);
                }
                ViewMode::Summary => {
                    let p_info = get_project_by_id(conn, selected_project_id).unwrap_or_default();
                    let git = get_git_info(&p_info.path);
                    let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                    let tasks_text = tasks.iter().take(5).map(|t| format!("- {} [{}]", t.title, t.status)).collect::<Vec<_>>().join("\n");
                    
                    let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack").expect("Config dir fail");
                    let note_path = proj_dirs.data_dir().join("notes").join(format!("{}.md", p_info.name));
                    let note_content = fs::read_to_string(note_path).unwrap_or_else(|_| "No notes found.".to_string());
                    let note_snippet = note_content.lines().take(5).collect::<Vec<_>>().join("\n");

                    let git_str = match git {
                            Some(g) => {
                                let mut s = format!("{}", g.branch);
                                if g.ahead > 0 || g.behind > 0 {
                                    s.push_str(&format!(" ↑{} ↓{}", g.ahead, g.behind));
                                }
                                if g.stashes > 0 {
                                    s.push_str(&format!(" {{${}}}", g.stashes));
                                }
                                if g.is_dirty { s.push_str(" *"); }
                                s
                            }
                            None => "n/a".to_string(),
                        };
                    
                    let summary = format!(
                        "Project: {}\nStatus: {}\nTags: {}\nPath: {}\n\nGit: {}\n\nLast 5 Tasks:\n{}\n\nNotes Snippet:\n{}",
                        p_info.name, p_info.status, p_info.tags, p_info.path,
                        git_str,
                        tasks_text, note_snippet
                    );

                    let summary_para = Paragraph::new(summary)
                        .block(Block::default().borders(Borders::ALL).title(" Project Summary "));
                    f.render_widget(summary_para, chunks[1]);
                }
                ViewMode::NoteViewer => {
                    let p_info = get_project_by_id(conn, selected_project_id).unwrap_or_default();
                    let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack").expect("Config dir fail");
                    let note_path = proj_dirs.data_dir().join("notes").join(format!("{}.md", p_info.name));
                    let note_content = fs::read_to_string(note_path).unwrap_or_else(|_| "No notes found.".to_string());
                    
                    let lines: Vec<Line> = note_content.lines().map(|l| Line::from(l.to_string())).collect();
                    let paragraph = Paragraph::new(lines)
                        .block(Block::default().borders(Borders::ALL).title(format!(" Notes: {} ", p_info.name)))
                        .scroll((note_scroll as u16, 0));
                    f.render_widget(paragraph, chunks[1]);
                    
                    let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight)
                        .begin_symbol(Some("▲"))
                        .end_symbol(Some("▼"));
                    f.render_stateful_widget(scrollbar, chunks[1], &mut ratatui::widgets::ScrollbarState::default().content_length(note_content.lines().count()).position(note_scroll));
                }
                ViewMode::TaskDetail => {
                    let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                    if let Some(task) = tasks.get(task_selected_index) {
                        let subtasks = get_subtasks(conn, task.id).unwrap_or_default();
                        
                        let mut content = vec![
                            Line::from(vec![Span::styled("Title: ", Style::default().fg(Color::Cyan)), Span::raw(&task.title)]),
                            Line::from(vec![Span::styled("Status: ", Style::default().fg(Color::Cyan)), Span::raw(&task.status)]),
                            Line::from(vec![Span::styled("Priority: ", Style::default().fg(Color::Cyan)), Span::raw(&task.priority)]),
                            Line::from(vec![Span::styled("Due Date: ", Style::default().fg(Color::Cyan)), Span::raw(task.due_date.as_deref().unwrap_or("None"))]),
                            Line::from(""),
                            Line::from(vec![Span::styled("Description:", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))]),
                            Line::from(if task.description.is_empty() { "(empty)" } else { &task.description }),
                            Line::from(""),
                            Line::from(vec![Span::styled("Sub-tasks:", Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))]),
                        ];
                        
                        if subtasks.is_empty() {
                            content.push(Line::from("(no sub-tasks)"));
                        } else {
                            for (i, st) in subtasks.iter().enumerate() {
                                let style = if i == subtask_selected_index && !editing_subtask { Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD) } else { Style::default() };
                                let marker = if st.done { "[x]" } else { "[ ]" };
                                content.push(Line::from(vec![Span::styled(format!("{} {}", marker, st.title), style)]));
                            }
                        }

                        let content_len = content.len();
                        let paragraph = Paragraph::new(content)
                            .block(Block::default().borders(Borders::ALL).title(format!(" Task Detail: {} ", task.title)))
                            .scroll((task_detail_scroll as u16, 0));
                        f.render_widget(paragraph, chunks[1]);
                        
                        let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight);
                        f.render_stateful_widget(scrollbar, chunks[1], &mut ratatui::widgets::ScrollbarState::default().content_length(content_len).position(task_detail_scroll));
                    }
                }
                ViewMode::TimeLog => {
                    let entries = get_time_entries(conn, &log_filter).unwrap_or_default();
                    let visible_entries: Vec<_> = entries.iter().skip(log_scroll).collect();
                    let items: Vec<ListItem> = visible_entries.iter().map(|e| {
                        let date = chrono::DateTime::from_timestamp(e.start_time, 0).unwrap().format("%Y-%m-%d %H:%M").to_string();
                        let dur = format_duration(e.duration_seconds);
                        ListItem::new(format!("{} | {} | {} | {}", date, e.project_name, e.task_title, dur))
                    }).collect();
                    let list = List::new(items)
                        .block(Block::default().borders(Borders::ALL).title(format!(" Time Log - {} ", match log_filter { LogFilter::Today => "Today", LogFilter::Week => "This Week", LogFilter::All => "All Time" } )));
                    f.render_widget(list, chunks[1]);
                    
                    let scrollbar = Scrollbar::new(ScrollbarOrientation::VerticalRight);
                    f.render_stateful_widget(scrollbar, chunks[1], &mut ratatui::widgets::ScrollbarState::default().content_length(entries.len()).position(log_scroll));
                }
                ViewMode::Projects => {
                    let filtered_projects: Vec<_> = projects.iter()
                        .filter(|p| {
                            if search_query.starts_with('@') {
                                let tag = &search_query[1..];
                                p.tags.contains(tag)
                            } else {
                                p.name.to_lowercase().contains(&search_query.to_lowercase()) || p.path.contains(&search_query) || p.tags.contains(&search_query)
                            }
                        })
                        .collect();

                    let items: Vec<ListItem> = filtered_projects.iter().enumerate().map(|(i, p)| {
                        let git = get_git_info(&p.path);
                        let git_str = match git {
                            Some(g) => {
                                let mut s = format!(" [{}", g.branch);
                                if g.ahead > 0 || g.behind > 0 {
                                    s.push_str(&format!(" ↑{} ↓{}", g.ahead, g.behind));
                                }
                                if g.stashes > 0 {
                                    s.push_str(&format!(" {{${}}}", g.stashes));
                                }
                                if g.is_dirty { s.push_str(" *"); }
                                s.push(']');
                                s
                            }
                            None => " [no git]".to_string(),
                        };
                        let style = if i == selected_index { Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD) } else { Style::default() };
                        ListItem::new(format!("{} ({}) Tags: [{}] : {}{}", p.name, p.status, p.tags, p.path, git_str)).style(style)
                    }).collect();

                    let list = List::new(items)
                        .block(Block::default().borders(Borders::ALL).title(" Projects "));
                    f.render_widget(list, chunks[1]);
                }
            }

            // --- FOOTER / HELP ---
            let help_text = match view_mode {
                ViewMode::Projects => " [Enter] Summary | [s] Status | [t] Tag | [a] Task | [g] Global | [l] Log | [q] Quit",
                ViewMode::Tasks => " [Enter] Detail | [a] Add Task | [Ctrl+T] Timer | [Ctrl+C] Commit | [Esc] Back",
                ViewMode::GlobalTasks => " [Esc] Back | [Ctrl+T] Timer | [Ctrl+C] Commit",
                ViewMode::Summary => " [n] View Notes | [e] Edit Notes | [l] Log | [Ctrl+C] Commit | [Esc] Back",
                ViewMode::NoteViewer => " [↑/↓] Scroll | [e] Edit | [Esc] Back",
                ViewMode::TaskDetail => " [↑/↓] Scroll | [Enter] Toggle Sub | [d] Desc | [D] Due | [a] Sub | [Ctrl+T] Timer | [Ctrl+C] Commit | [Esc] Back",
                ViewMode::TimeLog => " [↑/↓] Scroll | [1] Today | [2] Week | [3] All | [Esc] Back",
            };
            let footer = Paragraph::new(help_text)
                .block(Block::default().borders(Borders::ALL).title(" Help "));
            f.render_widget(footer, chunks[2]);
        })?;

        if event::poll(std::time::Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                if input_mode != InputMode::None {
                    match key.code {
                        KeyCode::Enter => {
                            if !input_buffer.is_empty() {
                                match input_mode {
                                    InputMode::Task => {
                                        let _ = conn.execute("INSERT INTO tasks (project_id, title) VALUES (?1, ?2)", params![selected_project_id, input_buffer]);
                                    }
                                    InputMode::Tag => {
                                        let current_tags: String = conn.query_row("SELECT tags FROM projects WHERE id = ?1", params![selected_project_id], |row| row.get(0)).unwrap_or_default();
                                        let new_tags = if current_tags.is_empty() { input_buffer.clone() } else { format!("{},{}", current_tags, input_buffer) };
                                        let _ = conn.execute("UPDATE projects SET tags = ?1 WHERE id = ?2", params![new_tags, selected_project_id]);
                                        projects = get_all_projects(conn, show_archived).unwrap_or_default();
                                    }
                                    InputMode::TaskDesc => {
                                        let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                                        if let Some(t) = tasks.get(task_selected_index) {
                                            let _ = conn.execute("UPDATE tasks SET description = ?1 WHERE id = ?2", params![input_buffer.clone(), t.id]);
                                        }
                                    }
                                    InputMode::TaskDueDate => {
                                        let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                                        if let Some(t) = tasks.get(task_selected_index) {
                                            let due = if input_buffer.is_empty() { None } else { Some(input_buffer.clone()) };
                                            let _ = conn.execute("UPDATE tasks SET due_date = ?1 WHERE id = ?2", params![due, t.id]);
                                        }
                                    }
                                    InputMode::SubTask => {
                                        let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                                        if let Some(t) = tasks.get(task_selected_index) {
                                            let _ = conn.execute("INSERT INTO subtasks (task_id, title) VALUES (?1, ?2)", params![t.id, input_buffer.clone()]);
                                        }
                                    }
                                    InputMode::LogNote => {
                                        if let Some((task_id, start)) = active_timer {
                                            let _ = conn.execute("UPDATE time_entries SET description = ?1 WHERE task_id = ?2 AND start_time = ?3 AND end_time IS NULL", params![input_buffer.clone(), task_id, start]);
                                        }
                                    }
                                    InputMode::CommitMsg => {
                                        let p_info = get_project_by_id(conn, selected_project_id).unwrap_or_default();
                                        let mut repo = Repository::open(&p_info.path).ok();
                                        if let Some(repo) = repo.as_mut() {
                                            // Stage all changes
                                            let mut index = repo.index().unwrap();
                                            index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None).ok();
                                            index.write().ok();
                                            
                                            // Create commit
                                            let tree_id = index.write_tree().ok();
                                            if let Some(tree_id) = tree_id {
                                                let tree = repo.find_tree(tree_id).ok();
                                                let sig = repo.signature().ok();
                                                let parent_commit = repo.head().ok().and_then(|h| h.peel_to_commit().ok());
                                                let parents: Vec<&git2::Commit> = parent_commit.iter().collect();
                                                
                                                if let (Some(tree), Some(sig)) = (tree, sig) {
                                                    let _ = repo.commit(
                                                        Some("HEAD"),
                                                        &sig,
                                                        &sig,
                                                        &input_buffer,
                                                        &tree,
                                                        &parents,
                                                    );
                                                }
                                            }
                                            
                                            // Push
                                            let mut remote = repo.find_remote("origin").ok();
                                            if let Some(remote) = remote.as_mut() {
                                                let _ = remote.push(&["refs/heads/main"], None);
}
                            }
                        }
                        _ => {}
                    }
                            }
                            input_buffer.clear();
                            input_mode = InputMode::None;
                            editing_subtask = false;
                        }
                        KeyCode::Esc => { 
                            input_buffer.clear(); 
                            input_mode = InputMode::None; 
                            editing_subtask = false;
                        }
                        KeyCode::Char(c) => input_buffer.push(c),
                        KeyCode::Backspace => { input_buffer.pop(); }
                        _ => {}
                    }
                } else if view_mode == ViewMode::NoteViewer {
                    match key.code {
                        KeyCode::Esc | KeyCode::Char('q') => view_mode = ViewMode::Summary,
                        KeyCode::Char('n') | KeyCode::Char('e') => {
                            let p_info = get_project_by_id(conn, selected_project_id).unwrap_or_default();
                            let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack").expect("Config dir fail");
                            let note_path = proj_dirs.data_dir().join("notes").join(format!("{}.md", p_info.name));
                            let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vim".to_string());
                            let _ = Command::new(&editor).arg(&note_path).status();
                        }
                        KeyCode::Up => if note_scroll > 0 { note_scroll -= 1; }
                        KeyCode::Down => { note_scroll += 1; }
                        KeyCode::PageUp => { note_scroll = note_scroll.saturating_sub(10); }
                        KeyCode::PageDown => { note_scroll += 10; }
                        _ => {}
                    }
                } else if view_mode == ViewMode::TaskDetail {
                    match key.code {
                        KeyCode::Esc | KeyCode::Char('q') => view_mode = ViewMode::Tasks,
                        KeyCode::Up => if task_detail_scroll > 0 { task_detail_scroll -= 1; }
                        KeyCode::Down => { task_detail_scroll += 1; }
                        KeyCode::PageUp => { task_detail_scroll = task_detail_scroll.saturating_sub(10); }
                        KeyCode::PageDown => { task_detail_scroll += 10; }
                        KeyCode::Enter => {
                            let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                            if let Some(t) = tasks.get(task_selected_index) {
                                let subtasks = get_subtasks(conn, t.id).unwrap_or_default();
                                if subtask_selected_index < subtasks.len() {
                                    let st = &subtasks[subtask_selected_index];
                                    let new_done = !st.done;
                                    let _ = conn.execute("UPDATE subtasks SET done = ?1 WHERE id = ?2", params![new_done, st.id]);
                                }
                            }
                        }
                        KeyCode::Char('d') => {
                            input_mode = InputMode::TaskDesc;
                            let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                            if let Some(t) = tasks.get(task_selected_index) {
                                input_buffer = t.description.clone();
                            }
                        }
                        KeyCode::Char('D') => {
                            input_mode = InputMode::TaskDueDate;
                            let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                            if let Some(t) = tasks.get(task_selected_index) {
                                input_buffer = t.due_date.clone().unwrap_or_default();
                            }
                        }
                        KeyCode::Char('a') => {
                            input_mode = InputMode::SubTask;
                            input_buffer.clear();
                        }
                        KeyCode::Char('k') => {
                            let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                            if let Some(t) = tasks.get(task_selected_index) {
                                let subtasks = get_subtasks(conn, t.id).unwrap_or_default();
                                if subtask_selected_index > 0 && subtask_selected_index < subtasks.len() { subtask_selected_index -= 1; }
                            }
                        }
                        KeyCode::Char('j') => {
                            let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                            if let Some(t) = tasks.get(task_selected_index) {
                                let subtasks = get_subtasks(conn, t.id).unwrap_or_default();
                                if subtask_selected_index < subtasks.len().saturating_sub(1) { subtask_selected_index += 1; }
                            }
                        }
                        KeyCode::Char('t') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            // Start/stop timer
                            let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                            if let Some(t) = tasks.get(task_selected_index) {
                                if let Some((running_id, _)) = active_timer {
                                    if running_id == t.id {
                                        // Stop timer
                                        let end = now_ts();
                                        let duration = end - active_timer.unwrap().1;
                                        let _ = conn.execute("UPDATE time_entries SET end_time = ?1, duration_seconds = ?2 WHERE task_id = ?3 AND end_time IS NULL", params![end, duration, t.id]);
                                        active_timer = None;
                                    } else {
                                        // Switch timer to this task
                                        let start = now_ts();
                                        let _ = conn.execute("INSERT INTO time_entries (task_id, start_time) VALUES (?1, ?2)", params![t.id, start]);
                                        active_timer = Some((t.id, start));
                                    }
                                } else {
                                    // Start new timer
                                    let start = now_ts();
                                    let _ = conn.execute("INSERT INTO time_entries (task_id, start_time) VALUES (?1, ?2)", params![t.id, start]);
                                    active_timer = Some((t.id, start));
                                }
                            }
                        }
                        _ => {}
                    }
                } else if view_mode == ViewMode::TimeLog {
                    match key.code {
                        KeyCode::Esc | KeyCode::Char('q') => view_mode = ViewMode::Projects,
                        KeyCode::Up => if log_scroll > 0 { log_scroll -= 1; }
                        KeyCode::Down => { log_scroll += 1; }
                        KeyCode::PageUp => { log_scroll = log_scroll.saturating_sub(10); }
                        KeyCode::PageDown => { log_scroll += 10; }
                        KeyCode::Char('1') => { log_filter = LogFilter::Today; log_scroll = 0; }
                        KeyCode::Char('2') => { log_filter = LogFilter::Week; log_scroll = 0; }
                        KeyCode::Char('3') => { log_filter = LogFilter::All; log_scroll = 0; }
                        KeyCode::Char('n') => {
                            input_mode = InputMode::LogNote;
                            input_buffer.clear();
                        }
                        _ => {}
                    }
                } else if view_mode == ViewMode::Tasks {
                    match key.code {
                        KeyCode::Char('q') | KeyCode::Esc => view_mode = ViewMode::Projects,
                        KeyCode::Up => if task_selected_index > 0 { task_selected_index -= 1; }
                        KeyCode::Down => {
                            let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                            if task_selected_index < tasks.len().saturating_sub(1) { task_selected_index += 1; }
                        }
                        KeyCode::Enter => {
                            let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                            if !tasks.is_empty() {
                                view_mode = ViewMode::TaskDetail;
                                task_detail_scroll = 0;
                                subtask_selected_index = 0;
                            }
                        }
                        KeyCode::Char('a') => {
                            input_mode = InputMode::Task;
                            let filtered: Vec<_> = projects.iter()
                                .filter(|p| {
                                    if search_query.starts_with('@') {
                                        let tag = &search_query[1..];
                                        p.tags.contains(tag)
                                    } else {
                                        p.name.to_lowercase().contains(&search_query.to_lowercase()) || p.path.contains(&search_query) || p.tags.contains(&search_query)
                                    }
                                })
                                .collect();
                            if selected_index < filtered.len() { selected_project_id = filtered[selected_index].id; }
                        }
                        KeyCode::Char('t') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            let tasks = get_tasks_for_project(conn, selected_project_id).unwrap_or_default();
                            if let Some(t) = tasks.get(task_selected_index) {
                                if let Some((running_id, _)) = active_timer {
                                    if running_id == t.id {
                                        let end = now_ts();
                                        let duration = end - active_timer.unwrap().1;
                                        let _ = conn.execute("UPDATE time_entries SET end_time = ?1, duration_seconds = ?2 WHERE task_id = ?3 AND end_time IS NULL", params![end, duration, t.id]);
                                        active_timer = None;
                                    } else {
                                        let start = now_ts();
                                        let _ = conn.execute("INSERT INTO time_entries (task_id, start_time) VALUES (?1, ?2)", params![t.id, start]);
                                        active_timer = Some((t.id, start));
                                    }
                                } else {
                                    let start = now_ts();
                                    let _ = conn.execute("INSERT INTO time_entries (task_id, start_time) VALUES (?1, ?2)", params![t.id, start]);
                                    active_timer = Some((t.id, start));
                                }
                            }
                        }
                        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            // Quick commit
                            input_mode = InputMode::CommitMsg;
                            input_buffer.clear();
                        }
                        _ => {}
                    }
                } else if view_mode == ViewMode::GlobalTasks {
                    match key.code {
                        KeyCode::Esc | KeyCode::Char('q') => view_mode = ViewMode::Projects,
                        KeyCode::Char('t') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            let tasks = get_global_tasks(conn).unwrap_or_default();
                            if let Some(t) = tasks.get(task_selected_index) {
                                if let Some((running_id, _)) = active_timer {
                                    if running_id == t.id {
                                        let end = now_ts();
                                        let duration = end - active_timer.unwrap().1;
                                        let _ = conn.execute("UPDATE time_entries SET end_time = ?1, duration_seconds = ?2 WHERE task_id = ?3 AND end_time IS NULL", params![end, duration, t.id]);
                                        active_timer = None;
                                    } else {
                                        let start = now_ts();
                                        let _ = conn.execute("INSERT INTO time_entries (task_id, start_time) VALUES (?1, ?2)", params![t.id, start]);
                                        active_timer = Some((t.id, start));
                                    }
                                } else {
                                    let start = now_ts();
                                    let _ = conn.execute("INSERT INTO time_entries (task_id, start_time) VALUES (?1, ?2)", params![t.id, start]);
                                    active_timer = Some((t.id, start));
                                }
                            }
                        }
                        KeyCode::Up => if task_selected_index > 0 { task_selected_index -= 1; }
                        KeyCode::Down => {
                            let tasks = get_global_tasks(conn).unwrap_or_default();
                            if task_selected_index < tasks.len().saturating_sub(1) { task_selected_index += 1; }
                        }
                        _ => {}
                    }
                } else if view_mode == ViewMode::Summary {
                    match key.code {
                        KeyCode::Esc | KeyCode::Char('q') => view_mode = ViewMode::Projects,
                        KeyCode::Char('n') => {
                            view_mode = ViewMode::NoteViewer;
                            note_scroll = 0;
                        }
                        KeyCode::Char('e') => {
                            let p_info = get_project_by_id(conn, selected_project_id).unwrap_or_default();
                            let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack").expect("Config dir fail");
                            let note_path = proj_dirs.data_dir().join("notes").join(format!("{}.md", p_info.name));
                            let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vim".to_string());
                            let _ = Command::new(&editor).arg(&note_path).status();
                        }
                        KeyCode::Char('l') => {
                            view_mode = ViewMode::TimeLog;
                            log_scroll = 0;
                            log_filter = LogFilter::Today;
                        }
                        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            // Quick commit
                            input_mode = InputMode::CommitMsg;
                            input_buffer.clear();
                        }
                        _ => {}
                    }
                } else {
                    match key.code {
                        KeyCode::Char('q') => break,
                        KeyCode::Char('a') if search_query.is_empty() => {
                            input_mode = InputMode::Task;
                            let filtered: Vec<_> = projects.iter()
                                .filter(|p| {
                                    if search_query.starts_with('@') {
                                        let tag = &search_query[1..];
                                        p.tags.contains(tag)
                                    } else {
                                        p.name.to_lowercase().contains(&search_query.to_lowercase()) || p.path.contains(&search_query) || p.tags.contains(&search_query)
                                    }
                                })
                                .collect();
                            if selected_index < filtered.len() { selected_project_id = filtered[selected_index].id; }
                        }
                        KeyCode::Char('t') if search_query.is_empty() => {
                            input_mode = InputMode::Tag;
                            let filtered: Vec<_> = projects.iter()
                                .filter(|p| {
                                    if search_query.starts_with('@') {
                                        let tag = &search_query[1..];
                                        p.tags.contains(tag)
                                    } else {
                                        p.name.to_lowercase().contains(&search_query.to_lowercase()) || p.path.contains(&search_query) || p.tags.contains(&search_query)
                                    }
                                })
                                .collect();
                            if selected_index < filtered.len() { selected_project_id = filtered[selected_index].id; }
                        }
                        KeyCode::Char('s') if search_query.is_empty() => {
                            let filtered: Vec<_> = projects.iter()
                                .filter(|p| {
                                    if search_query.starts_with('@') {
                                        let tag = &search_query[1..];
                                        p.tags.contains(tag)
                                    } else {
                                        p.name.to_lowercase().contains(&search_query.to_lowercase()) || p.path.contains(&search_query) || p.tags.contains(&search_query)
                                    }
                                })
                                .collect();
                            if selected_index < filtered.len() {
                                let p = filtered[selected_index];
                                let next_status = match p.status.as_str() {
                                    "Active" => "Paused",
                                    "Paused" => "Archived",
                                    _ => "Active",
                                };
                                let _ = conn.execute("UPDATE projects SET status = ?1 WHERE id = ?2", params![next_status, p.id]);
                                projects = get_all_projects(conn, show_archived).unwrap_or_default();
                            }
                        }
                        KeyCode::Char('g') if search_query.is_empty() => view_mode = ViewMode::GlobalTasks,
                        KeyCode::Char('l') if search_query.is_empty() => {
                            view_mode = ViewMode::TimeLog;
                            log_scroll = 0;
                            log_filter = LogFilter::Today;
                        }
                        KeyCode::Enter => {
                            let filtered: Vec<_> = projects.iter()
                                .filter(|p| {
                                    if search_query.starts_with('@') {
                                        let tag = &search_query[1..];
                                        p.tags.contains(tag)
                                    } else {
                                        p.name.to_lowercase().contains(&search_query.to_lowercase()) || p.path.contains(&search_query) || p.tags.contains(&search_query)
                                    }
                                })
                                .collect();
                            if selected_index < filtered.len() {
                                selected_project_id = filtered[selected_index].id;
                                view_mode = ViewMode::Summary;
                            }
                        }
                        KeyCode::Up => if selected_index > 0 { selected_index -= 1; }
                        KeyCode::Down => {
                            let filtered_len = projects.iter().filter(|p| {
                                if search_query.starts_with('@') {
                                    let tag = &search_query[1..];
                                    p.tags.contains(tag)
                                } else {
                                    p.name.to_lowercase().contains(&search_query.to_lowercase()) || p.path.contains(&search_query) || p.tags.contains(&search_query)
                                }
                            }).count();
                            if selected_index < filtered_len.saturating_sub(1) { selected_index += 1; }
                        }
                        KeyCode::Char(c) => { search_query.push(c); selected_index = 0; }
                        KeyCode::Backspace => { search_query.pop(); }
                        _ => {}
                    }
                }
            }
        }
    }

    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    Ok(())
}

#[derive(PartialEq)]
enum ViewMode { Projects, Tasks, GlobalTasks, Summary, NoteViewer, TaskDetail, TimeLog }

#[derive(PartialEq)]
enum InputMode { None, Task, Tag, TaskDesc, TaskDueDate, SubTask, LogNote, CommitMsg }

#[derive(PartialEq)]
enum LogFilter { Today, Week, All }

fn get_all_projects(conn: &Connection, show_archived: bool) -> Result<Vec<Project>> {
    let mut stmt = if show_archived {
        conn.prepare("SELECT id, name, path, status, tags, last_accessed FROM projects")?
    } else {
        conn.prepare("SELECT id, name, path, status, tags, last_accessed FROM projects WHERE status != 'Archived'")?
    };
    let project_iter = stmt.query_map([], |row| Ok(Project { id: row.get(0)?, name: row.get(1)?, path: row.get(2)?, status: row.get(3)?, tags: row.get(4)?, last_accessed: row.get(5)? }))?;
    project_iter.collect()
}

fn get_project_by_id(conn: &Connection, id: i32) -> Result<Project> {
    conn.query_row("SELECT id, name, path, status, tags, last_accessed FROM projects WHERE id = ?1", params![id], |row| Ok(Project { id: row.get(0)?, name: row.get(1)?, path: row.get(2)?, status: row.get(3)?, tags: row.get(4)?, last_accessed: row.get(5)? }))
}

fn get_tasks_for_project(conn: &Connection, project_id: i32) -> Result<Vec<Task>> {
    let mut stmt = conn.prepare("SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, p.name FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.project_id = ?1")?;
    let task_iter = stmt.query_map([project_id], |row| Ok(Task { 
        id: row.get(0)?, 
        project_id: project_id, 
        project_name: row.get(6)?, 
        title: row.get(1)?, 
        description: row.get(2)?, 
        status: row.get(3)?, 
        priority: row.get(4)?, 
        due_date: row.get(5)? 
    }))?;
    task_iter.collect()
}

fn get_global_tasks(conn: &Connection) -> Result<Vec<Task>> {
    let mut stmt = conn.prepare("SELECT t.id, t.project_id, p.name, t.title, t.description, t.status, t.priority, t.due_date FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.status = 'Todo'")?;
    let task_iter = stmt.query_map([], |row| Ok(Task { 
        id: row.get(0)?, 
        project_id: row.get(1)?, 
        project_name: row.get(2)?, 
        title: row.get(3)?, 
        description: row.get(4)?, 
        status: row.get(5)?, 
        priority: row.get(6)?, 
        due_date: row.get(7)? 
    }))?;
    let mut tasks: Vec<Task> = task_iter.collect::<Result<Vec<_>>>()?;
    
    tasks.sort_by(|a, b| {
        let priority_val = |p: &str| match p { "High" => 0, "Medium" => 1, "Low" => 2, _ => 3 };
        priority_val(&a.priority).cmp(&priority_val(&b.priority))
    });
    
    Ok(tasks)
}

fn get_subtasks(conn: &Connection, task_id: i32) -> Result<Vec<SubTask>> {
    let mut stmt = conn.prepare("SELECT id, task_id, title, done FROM subtasks WHERE task_id = ?1")?;
    let iter = stmt.query_map([task_id], |row| Ok(SubTask { 
        id: row.get(0)?, 
        task_id: row.get(1)?, 
        title: row.get(2)?, 
        done: row.get(3)? 
    }))?;
    iter.collect()
}

fn get_time_entries(conn: &Connection, filter: &LogFilter) -> Result<Vec<TimeEntry>> {
    let (start_cutoff, end_cutoff) = match filter {
        LogFilter::Today => {
            let now = chrono::Local::now();
            let start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc().timestamp();
            let end = now.date_naive().and_hms_opt(23, 59, 59).unwrap().and_utc().timestamp();
            (start, end)
        }
        LogFilter::Week => {
            let now = chrono::Local::now();
            let start = (now.date_naive() - chrono::Duration::days(7)).and_hms_opt(0, 0, 0).unwrap().and_utc().timestamp();
            let end = now.date_naive().and_hms_opt(23, 59, 59).unwrap().and_utc().timestamp();
            (start, end)
        }
        LogFilter::All => (0, i64::MAX),
    };
    
    let mut stmt = conn.prepare(
        "SELECT te.id, te.task_id, t.title, p.name, te.start_time, te.end_time, te.duration_seconds, te.description
         FROM time_entries te
         JOIN tasks t ON te.task_id = t.id
         JOIN projects p ON t.project_id = p.id
         WHERE te.start_time >= ?1 AND te.start_time <= ?2
         ORDER BY te.start_time DESC"
    )?;
    let iter = stmt.query_map([start_cutoff, end_cutoff], |row| Ok(TimeEntry {
        id: row.get(0)?,
        task_id: row.get(1)?,
        task_title: row.get(2)?,
        project_name: row.get(3)?,
        start_time: row.get(4)?,
        end_time: row.get(5)?,
        duration_seconds: row.get(6)?,
        description: row.get(7)?,
    }))?;
    iter.collect()
}

fn run_log_report(conn: &Connection, period: &str) -> Result<(), Box<dyn std::error::Error>> {
    let filter = match period {
        "today" => LogFilter::Today,
        "week" => LogFilter::Week,
        "all" => LogFilter::All,
        _ => LogFilter::Today,
    };
    
    let entries = get_time_entries(conn, &filter)?;
    
    // Group by task
    use std::collections::HashMap;
    let mut by_task: HashMap<(i32, String, String), i64> = HashMap::new();
    for e in &entries {
        let key = (e.task_id, e.project_name.clone(), e.task_title.clone());
        *by_task.entry(key).or_insert(0) += e.duration_seconds;
    }
    
    let mut sorted: Vec<_> = by_task.into_iter().collect();
    sorted.sort_by(|a, b| b.1.cmp(&a.1));
    
    println!("=== Time Log ({}) ===", match filter { LogFilter::Today => "Today", LogFilter::Week => "This Week", LogFilter::All => "All Time" });
    println!("{:<30} {:<20} {}", "Project", "Task", "Duration");
    println!("{}", "-".repeat(70));
    for ((_, project, task), dur) in sorted {
        println!("{:<30} {:<20} {}", project, task, format_duration(dur));
    }
    
    let total: i64 = entries.iter().map(|e| e.duration_seconds).sum();
    println!("\nTotal: {}", format_duration(total));
    
    Ok(())
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();
    let conn = init_db()?;

    match &cli.command {
        Commands::Add { path, name } => {
            let abs_path = fs::canonicalize(path).expect("Invalid path").to_string_lossy().into_owned();
            conn.execute("INSERT INTO projects (name, path) VALUES (?1, ?2)", params![name, abs_path])?;
            println!("Project '{}' registered.", name);
        }
        Commands::Ls { active, archived } => {
            let mut stmt = if *archived {
                conn.prepare("SELECT id, name, path, status FROM projects WHERE status = 'Archived'")?
            } else if *active {
                conn.prepare("SELECT id, name, path, status FROM projects WHERE status = 'Active'")?
            } else {
                conn.prepare("SELECT id, name, path, status FROM projects WHERE status != 'Archived'")?
            };
            let project_iter = stmt.query_map([], |row| Ok(Project { id: row.get(0)?, name: row.get(1)?, path: row.get(2)?, status: row.get(3)?, tags: "".to_string(), last_accessed: None }))?;
            println!("{:<15} {:<20} {:<10} {:<20}", "Name", "Path", "Status", "Git");
            println!("{}", "-".repeat(65));
            for project in project_iter {
                let p = project?;
                let git = get_git_info(&p.path);
                let git_info = match git {
                    Some(g) => {
                        let mut s = g.branch;
                        if g.ahead > 0 || g.behind > 0 {
                            s.push_str(&format!(" ↑{} ↓{}", g.ahead, g.behind));
                        }
                        if g.stashes > 0 {
                            s.push_str(&format!(" {{${}}}", g.stashes));
                        }
                        if g.is_dirty { s.push_str(" *"); }
                        s
                    }
                    None => "n/a".to_string(),
                };
                println!("{:<15} {:<20} {:<10} {:<20}", p.name, p.path, p.status, git_info);
            }
        }
        Commands::Go { name } => {
            let mut stmt = conn.prepare("SELECT path FROM projects WHERE name = ?1")?;
            let path: String = stmt.query_row([name], |row| row.get(0))?;
            let now = chrono::Local::now().to_rfc3339();
            let _ = conn.execute("UPDATE projects SET last_accessed = ?1 WHERE name = ?2", params![now, name]);
            println!("{}", path);
        }
        Commands::Jump { name } => {
            let mut stmt = conn.prepare("SELECT path FROM projects WHERE name = ?1")?;
            let path: String = stmt.query_row([name], |row| row.get(0))?;
            let now = chrono::Local::now().to_rfc3339();
            let _ = conn.execute("UPDATE projects SET last_accessed = ?1 WHERE name = ?2", params![now, name]);
            println!("{}", path);
        }
        Commands::Task { action } => match action {
            TaskAction::Add { project_name, title, priority } => {
                let project_id: i32 = conn.query_row("SELECT id FROM projects WHERE name = ?1", params![project_name], |row| row.get(0))?;
                conn.execute("INSERT INTO tasks (project_id, title, priority) VALUES (?1, ?2, ?3)", params![project_id, title, priority])?;
                println!("Task added.");
            }
            TaskAction::Ls { project_name } => {
                let project_id: i32 = conn.query_row("SELECT id FROM projects WHERE name = ?1", params![project_name], |row| row.get(0))?;
                let mut stmt = conn.prepare("SELECT id, title, status, priority FROM tasks WHERE project_id = ?1")?;
                let task_iter = stmt.query_map([project_id], |row| Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?)))?;
                for task in task_iter { let (id, title, status, priority) = task?; println!("[{}] ({}) {} - {}", id, priority, title, status); }
            }
            TaskAction::Done { task_id } => {
                conn.execute("UPDATE tasks SET status = 'Done' WHERE id = ?1", params![task_id])?;
                println!("Done.");
            }
        },
        Commands::Scan { path } => {
            scan_projects(&conn, path)?;
        }
        Commands::Dashboard { archived } => {
            run_dashboard(&conn, *archived)?;
        }
        Commands::Backup {} => {
            let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack").expect("Config dir fail");
            let data_dir = proj_dirs.data_dir();
            let backup_path = data_dir.join(format!("projects_{}.db.bak", chrono::Local::now().format("%Y%m%d_%H%M%S")));
            fs::copy(data_dir.join("projects.db"), backup_path)?;
            println!("Backup created successfully.");
        }
        Commands::Note { action } => match action {
            NoteAction::Open { project_name } => {
                let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack").expect("Config dir fail");
                let note_path = proj_dirs.data_dir().join("notes").join(format!("{}.md", project_name));
                println!("Note path: {}", note_path.display());
            }
            NoteAction::Add { project_name, text } => {
                let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack").expect("Config dir fail");
                let note_path = proj_dirs.data_dir().join("notes").join(format!("{}.md", project_name));
                let mut file = fs::OpenOptions::new().append(true).create(true).open(note_path)?;
                use std::io::Write;
                writeln!(file, "\n- {}", text)?;
                println!("Added to note.");
            }
        },
        Commands::Alias {} => {
            println!(
                "# Add these to your .bashrc or .zshrc\n\n\
                dtgo() {{ cd $(dt jump \"$1\"); }}\n\
                dtnote() {{ dt note add \"$1\" \"$2\"; }}\n\
                dtopen() {{ vim $(dt note open \"$1\"); }}"
            );
        }
        Commands::Search { query } => {
            let proj_dirs = ProjectDirs::from("com", "devtrack", "devtrack").expect("Config dir fail");
            let notes_dir = proj_dirs.data_dir().join("notes");
            for entry in WalkDir::new(notes_dir).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    let content = fs::read_to_string(entry.path()).unwrap_or_default();
                    if content.to_lowercase().contains(&query.to_lowercase()) {
                        println!("Match in {}:", entry.file_name().to_string_lossy());
                        for line in content.lines().filter(|l| l.to_lowercase().contains(&query.to_lowercase())) {
                            println!("  {}", line);
                        }
                    }
                }
            }
        }
        Commands::Log { period } => {
            let p = period.as_deref().unwrap_or("today");
            run_log_report(&conn, p)?;
        }
    }
    Ok(())
}