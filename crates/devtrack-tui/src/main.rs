use clap::{Parser, Subcommand};
use crossterm::{
    event::{self, Event, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use devtrack_core::{
    models::*,
    queries::*,
    init_db, scan_projects, get_git_info, format_duration,
    Config,
};
use ratatui::{
    backend::CrosstermBackend,
    widgets::{Block, Borders, List, ListItem, Paragraph, Scrollbar, ScrollbarOrientation},
    layout::{Layout, Constraint, Direction},
    Terminal,
    style::{Style, Modifier, Color},
    text::{Line, Span},
};
use rusqlite::{params, Connection};
use std::io;
use std::process::Command;

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
        path: std::path::PathBuf,
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
        path: std::path::PathBuf,
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
    Done { task_id: i64 },
}

#[derive(Subcommand)]
enum NoteAction {
    Open { project_name: String },
    Add { project_name: String, text: String },
}

#[derive(PartialEq)]
enum ViewMode { Projects, Tasks, GlobalTasks, Summary, NoteViewer, TaskDetail, TimeLog }

#[derive(PartialEq)]
enum InputMode { None, Task, Tag, TaskDesc, TaskDueDate, SubTask, LogNote, CommitMsg }

#[derive(PartialEq)]
enum LogFilter { Today, Week, All }

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    let config = Config::new()?;
    let conn = init_db(&config)?;

    match &cli.command {
        Commands::Add { path, name } => {
            let abs_path = std::fs::canonicalize(path).expect("Invalid path").to_string_lossy().into_owned();
            let id = create_project(&conn, name, &abs_path)?;
            println!("Project '{}' registered with id {}.", name, id);
        }
        Commands::Ls { active, archived } => {
            let projects = if *archived {
                get_all_projects(&conn, true)?
            } else if *active {
                get_all_projects(&conn, false)?.into_iter().filter(|p| p.status == "Active").collect()
            } else {
                get_all_projects(&conn, false)?
            };
            
            println!("{:<15} {:<20} {:<10} {:<20}", "Name", "Path", "Status", "Git");
            println!("{}", "-".repeat(65));
            for p in projects {
                let git = get_git_info(&p.path);
                let git_info = git.map(|g| g.display_string()).unwrap_or_else(|| "n/a".to_string());
                println!("{:<15} {:<20} {:<10} {:<20}", p.name, p.path, p.status, git_info);
            }
        }
        Commands::Go { name } => {
            let projects = get_all_projects(&conn, true)?;
            if let Some(p) = projects.iter().find(|p| p.name == *name) {
                update_project_last_accessed(&conn, p.id)?;
                println!("{}", p.path);
            } else {
                eprintln!("Project '{}' not found", name);
            }
        }
        Commands::Jump { name } => {
            let projects = get_all_projects(&conn, true)?;
            if let Some(p) = projects.iter().find(|p| p.name == *name) {
                update_project_last_accessed(&conn, p.id)?;
                println!("{}", p.path);
            } else {
                eprintln!("Project '{}' not found", name);
            }
        }
        Commands::Task { action } => match action {
            TaskAction::Add { project_name, title, priority } => {
                let projects = get_all_projects(&conn, true)?;
                if let Some(p) = projects.iter().find(|p| p.name == *project_name) {
                    let id = create_task(&conn, p.id, &title, None, Some(&priority), None)?;
                    println!("Task added with id {}.", id);
                } else {
                    eprintln!("Project '{}' not found", project_name);
                }
            }
            TaskAction::Ls { project_name } => {
                let projects = get_all_projects(&conn, true)?;
                if let Some(p) = projects.iter().find(|p| p.name == *project_name) {
                    let tasks = get_tasks_for_project(&conn, p.id)?;
                    for t in tasks {
                        println!("[{}] ({}) {} - {}", t.id, t.priority, t.title, t.status);
                    }
                } else {
                    eprintln!("Project '{}' not found", project_name);
                }
            }
            TaskAction::Done { task_id } => {
                update_task(&conn, *task_id, None, None, Some("Done"), None, None)?;
                println!("Done.");
            }
        },
        Commands::Scan { path } => {
            let found = scan_projects(&conn, &path)?;
            println!("Scanned root: {}. Registered {} projects.", path.display(), found);
        }
        Commands::Dashboard { archived } => {
            run_dashboard(&conn, *archived)?;
        }
        Commands::Backup {} => {
            let backup_path = config.data_dir.join(format!("projects_{}.db.bak", chrono::Local::now().format("%Y%m%d_%H%M%S")));
            std::fs::copy(&config.db_path, backup_path)?;
            println!("Backup created successfully.");
        }
        Commands::Note { action } => match action {
            NoteAction::Open { project_name } => {
                let path = get_notes_path(&Config::new()?, &project_name);
                println!("Note path: {}", path.display());
            }
            NoteAction::Add { project_name, text } => {
                let path = get_notes_path(&Config::new()?, &project_name);
                let mut file = std::fs::OpenOptions::new().append(true).create(true).open(path)?;
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
            let config = Config::new()?;
            let notes_dir = config.notes_dir;
            for entry in walkdir::WalkDir::new(notes_dir).into_iter().filter_map(|e| e.ok()) {
                if entry.file_type().is_file() {
                    let content = std::fs::read_to_string(entry.path()).unwrap_or_default();
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
            let summary = get_time_log_report(&conn, p)?;
            println!("=== Time Log ({}) ===", summary.period);
            println!("{:<30} {:<20} {}", "Project", "Task", "Duration");
            println!("{}", "-".repeat(70));
            for e in summary.entries {
                println!("{:<30} {:<20} {}", e.project, e.task, e.duration);
            }
            println!("\nTotal: {}", summary.total_formatted);
        }
    }
    Ok(())
}

fn run_dashboard(conn: &Connection, show_archived: bool) -> anyhow::Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut projects = get_all_projects(conn, show_archived)?;
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
    let mut active_timer: Option<(i64, i64)> = None;

    loop {
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
                    Constraint::Length(3),
                    Constraint::Min(0),
                    Constraint::Length(3),
                ].as_ref())
                .split(size);

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
                    
                    let config = Config::new().expect("Config dir fail");
                    let note_path = config.notes_dir.join(format!("{}.md", p_info.name));
                    let note_content = std::fs::read_to_string(note_path).unwrap_or_else(|_| "No notes found.".to_string());
                    let note_snippet = note_content.lines().take(5).collect::<Vec<_>>().join("\n");

                    let git_str = git.map(|g| g.display_string()).unwrap_or_else(|| "n/a".to_string());

                    let summary = format!(
                        "Project: {}\nStatus: {}\nTags: {}\nPath: {}\n\nGit: {}\n\nLast 5 Tasks:\n{}\n\nNotes Snippet:\n{}",
                        p_info.name, p_info.status, p_info.tags, p_info.path,
                        git_str, tasks_text, note_snippet
                    );

                    let summary_para = Paragraph::new(summary)
                        .block(Block::default().borders(Borders::ALL).title(" Project Summary "));
                    f.render_widget(summary_para, chunks[1]);
                }
                ViewMode::NoteViewer => {
                    let p_info = get_project_by_id(conn, selected_project_id).unwrap_or_default();
                    let config = Config::new().expect("Config dir fail");
                    let note_path = config.notes_dir.join(format!("{}.md", p_info.name));
                    let note_content = std::fs::read_to_string(note_path).unwrap_or_else(|_| "No notes found.".to_string());
                    
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
                    let entries = get_time_entries(conn, match log_filter { LogFilter::Today => "today", LogFilter::Week => "week", LogFilter::All => "all" }).unwrap_or_default();
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
                        let git_str = git.map(|g| format!(" [{}]", g.display_string())).unwrap_or_else(|| " [no git]".to_string());
                        let style = if i == selected_index { Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD) } else { Style::default() };
                        ListItem::new(format!("{} ({}) Tags: [{}] : {}{}", p.name, p.status, p.tags, p.path, git_str)).style(style)
                    }).collect();

                    let list = List::new(items)
                        .block(Block::default().borders(Borders::ALL).title(" Projects "));
                    f.render_widget(list, chunks[1]);
                }
            }

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
                                        projects = get_all_projects(conn, show_archived)?;
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
                                        let p_info = get_project_by_id(conn, selected_project_id)?;
                                        let _ = commit_and_push(&p_info.path, &input_buffer);
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
                            let p_info = get_project_by_id(conn, selected_project_id)?;
                            let config = Config::new()?;
                            let note_path = config.notes_dir.join(format!("{}.md", p_info.name));
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
                            input_mode = InputMode::CommitMsg;
                            input_buffer.clear();
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
                        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            input_mode = InputMode::CommitMsg;
                            input_buffer.clear();
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
                            let p_info = get_project_by_id(conn, selected_project_id)?;
                            let config = Config::new()?;
                            let note_path = config.notes_dir.join(format!("{}.md", p_info.name));
                            let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vim".to_string());
                            let _ = Command::new(&editor).arg(&note_path).status();
                        }
                        KeyCode::Char('l') => {
                            view_mode = ViewMode::TimeLog;
                            log_scroll = 0;
                            log_filter = LogFilter::Today;
                        }
                        KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
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
                                projects = get_all_projects(conn, show_archived)?;
                            }
                        }
                        KeyCode::Char('g') if search_query.is_empty() => view_mode = ViewMode::GlobalTasks,
                        KeyCode::Char('l') if search_query.is_empty() => {
                            view_mode = ViewMode::TimeLog;
                            log_scroll = 0;
                            log_filter = LogFilter::Today;
                        }
                        KeyCode::Char('c') if search_query.is_empty() && key.modifiers.contains(KeyModifiers::CONTROL) => {
                            input_mode = InputMode::CommitMsg;
                            input_buffer.clear();
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