import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

/**
 * DevTrack database manager using better-sqlite3
 * Handles connection, initialization, and schema creation
 */
export class DevTrackDatabase {
  private db: Database.Database | null = null;
  private readonly dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'devtrack.db');
  }

  /**
   * Initialize database connection and create tables
   */
  public initialize(): void {
    console.log('[Database] Initializing database at:', this.dbPath);
    this.db = new Database(this.dbPath);
    
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    console.log('[Database] Foreign keys enabled');
    
    // Create schema
    console.log('[Database] Creating tables...');
    this.createTables();
    console.log('[Database] Creating indexes...');
    this.createIndexes();
    console.log('[Database] Database initialization complete');
  }

  /**
   * Get database instance
   */
  public getDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Create all database tables
   */
  private createTables(): void {
    if (!this.db) {
      console.error('[Database] ERROR: db is null in createTables!');
      return;
    }

    console.log('[Database] Creating projects table...');
    // Projects table with 5W1H concept fields
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        color TEXT,
        icon TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        concept_what TEXT,
        concept_how TEXT,
        concept_where TEXT,
        concept_with_what TEXT,
        concept_when TEXT,
        concept_why TEXT
      )
    `);

    // Tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        assigned_to TEXT,
        start_date TEXT,
        due_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        tags TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Comments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // Labels table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Task-Label junction table (many-to-many)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_labels (
        task_id INTEGER NOT NULL,
        label_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, label_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
      )
    `);

    // Attachments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )
    `);

    // Custom fields table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS custom_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        field_type TEXT NOT NULL,
        options TEXT,
        required INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // Task custom field values table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_custom_values (
        task_id INTEGER NOT NULL,
        custom_field_id INTEGER NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (task_id, custom_field_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
      )
    `);

    // Task dependencies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        depends_on_task_id INTEGER NOT NULL,
        dependency_type TEXT NOT NULL DEFAULT 'blocks',
        created_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE(task_id, depends_on_task_id)
      )
    `);

    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Roles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `);

    // Permissions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // Role-Permission junction table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id INTEGER NOT NULL,
        permission_id INTEGER NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);

    // Project members table (user-project-role association)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        added_at TEXT NOT NULL,
        added_by INTEGER,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id),
        FOREIGN KEY (added_by) REFERENCES users(id),
        UNIQUE(project_id, user_id)
      )
    `);

    // Project templates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        category TEXT,
        is_public INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        concept_what TEXT,
        concept_how TEXT,
        concept_where TEXT,
        concept_with_what TEXT,
        concept_when TEXT,
        concept_why TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Task templates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_template_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        estimated_hours INTEGER,
        position INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (project_template_id) REFERENCES project_templates(id) ON DELETE CASCADE
      )
    `);

    // Notifications table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT,
        related_project_id INTEGER,
        related_task_id INTEGER,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        read_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (related_project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL
      )
    `);

    // Time entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        description TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        is_billable INTEGER NOT NULL DEFAULT 0,
        hourly_rate REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Automation rules table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        project_id INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        trigger_type TEXT NOT NULL,
        trigger_config TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_config TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_executed_at TEXT,
        execution_count INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Automation execution logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id INTEGER NOT NULL,
        trigger_data TEXT NOT NULL,
        action_data TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        executed_at TEXT NOT NULL,
        FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Create indexes for performance
   */
  private createIndexes(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
      CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
      CREATE INDEX IF NOT EXISTS idx_labels_project_id ON labels(project_id);
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category);
      CREATE INDEX IF NOT EXISTS idx_project_templates_is_public ON project_templates(is_public);
      CREATE INDEX IF NOT EXISTS idx_task_templates_project_template_id ON task_templates(project_template_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
      CREATE INDEX IF NOT EXISTS idx_automation_rules_project_id ON automation_rules(project_id);
      CREATE INDEX IF NOT EXISTS idx_automation_rules_is_active ON automation_rules(is_active);
      CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_type ON automation_rules(trigger_type);
      CREATE INDEX IF NOT EXISTS idx_automation_logs_rule_id ON automation_logs(rule_id);
      CREATE INDEX IF NOT EXISTS idx_automation_logs_executed_at ON automation_logs(executed_at);
    `);
  }
}

// Singleton instance
let dbInstance: DevTrackDatabase | null = null;

/**
 * Get singleton database instance
 */
export function getDatabase(): DevTrackDatabase {
  if (!dbInstance) {
    dbInstance = new DevTrackDatabase();
  }
  return dbInstance;
}
