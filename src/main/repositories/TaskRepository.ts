import Database from 'better-sqlite3';
import { Task, CreateTaskData, UpdateTaskData, TaskStatus, TaskPriority } from '../models/Task';

/**
 * Database row interface for tasks table
 */
interface TaskRow {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  position: number;
  tags: string | null;
}

/**
 * Database row interface for task_labels table
 */
interface TaskLabelRow {
  label_id: number;
}

/**
 * Repository for Task CRUD operations
 */
export class TaskRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new task
   */
  create(data: CreateTaskData): Task {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        project_id, title, description, status, priority,
        assigned_to, start_date, due_date, created_at, updated_at, position, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.projectId,
      data.title,
      data.description || null,
      data.status || TaskStatus.Todo,
      data.priority || TaskPriority.Medium,
      data.assignedTo || null,
      data.startDate || null,
      data.dueDate || null,
      now,
      now,
      data.position || 0,
      data.tags || null
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created task');
    }
    return created;
  }

  /**
   * Find task by ID
   */
  findById(id: number): Task | undefined {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as TaskRow | undefined;
    return row ? this.mapRowToTask(row) : undefined;
  }

  /**
   * Find all tasks for a project
   */
  findByProjectId(projectId: number): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY position, created_at');
    const rows = stmt.all(projectId) as TaskRow[];
    return rows.map(row => this.mapRowToTask(row));
  }

  /**
   * Find tasks by status
   */
  findByStatus(status: TaskStatus, projectId?: number): Task[] {
    let sql = 'SELECT * FROM tasks WHERE status = ?';
    const params: any[] = [status];

    if (projectId !== undefined) {
      sql += ' AND project_id = ?';
      params.push(projectId);
    }

    sql += ' ORDER BY position, created_at';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as TaskRow[];
    return rows.map(row => this.mapRowToTask(row));
  }

  /**
   * Update a task
   */
  update(id: number, data: UpdateTaskData): Task | undefined {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
      
      // Set completed_at when status becomes 'done'
      if (data.status === TaskStatus.Done) {
        updates.push('completed_at = ?');
        values.push(now);
      }
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      values.push(data.priority);
    }
    if (data.assignedTo !== undefined) {
      updates.push('assigned_to = ?');
      values.push(data.assignedTo);
    }
    if (data.startDate !== undefined) {
      updates.push('start_date = ?');
      values.push(data.startDate);
    }
    if (data.dueDate !== undefined) {
      updates.push('due_date = ?');
      values.push(data.dueDate);
    }
    if (data.position !== undefined) {
      updates.push('position = ?');
      values.push(data.position);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(data.tags);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete a task
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Add label to task
   */
  addLabel(taskId: number, labelId: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)
    `);
    stmt.run(taskId, labelId);
  }

  /**
   * Remove label from task
   */
  removeLabel(taskId: number, labelId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM task_labels WHERE task_id = ? AND label_id = ?
    `);
    stmt.run(taskId, labelId);
  }

  /**
   * Get label IDs for a task
   */
  getLabelIds(taskId: number): number[] {
    const stmt = this.db.prepare('SELECT label_id FROM task_labels WHERE task_id = ?');
    const rows = stmt.all(taskId) as TaskLabelRow[];
    return rows.map(row => row.label_id);
  }

  /**
   * Map database row to Task model
   */
  private mapRowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      assignedTo: row.assigned_to,
      startDate: row.start_date,
      dueDate: row.due_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      position: row.position,
      tags: row.tags
    };
  }
}
