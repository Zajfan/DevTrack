-- Schema before task target versions and paused timers. Keep this fixture
-- independent of init_db so a broken migration cannot rewrite its own input.
CREATE TABLE projects (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active', tags TEXT DEFAULT '',
    last_accessed DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL, title TEXT NOT NULL,
    description TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'Todo',
    priority TEXT DEFAULT 'Medium', due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id)
);
CREATE TABLE subtasks (
    id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL, title TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT 0, FOREIGN KEY(task_id) REFERENCES tasks(id)
);
CREATE TABLE time_entries (
    id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL, start_time INTEGER NOT NULL,
    end_time INTEGER, duration_seconds INTEGER DEFAULT 0, description TEXT DEFAULT '',
    FOREIGN KEY(task_id) REFERENCES tasks(id)
);
INSERT INTO tasks VALUES (1, 1, 'Keep legacy task', 'Existing task description', 'Done', 'High', '2026-11-01', '2026-01-01 12:00:00');
INSERT INTO subtasks VALUES (1, 1, 'Keep legacy subtask', 1);
INSERT INTO time_entries VALUES (1, 1, 1767268800, 1767268860, 60, 'Existing time entry');
