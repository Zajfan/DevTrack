import Database from 'better-sqlite3';
import {
  TaskTemplate,
  CreateTaskTemplateData,
  UpdateTaskTemplateData,
} from '../models/Template';

/**
 * Database row interface for task_templates table
 */
interface TaskTemplateRow {
  id: number;
  project_template_id: number | null;
  title: string;
  description: string | null;
  priority: string;
  estimated_hours: number | null;
  position: number;
}

/**
 * Repository for task templates
 * Handles CRUD operations for tasks within project templates
 */
export class TaskTemplateRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new task template
   */
  create(data: CreateTaskTemplateData): TaskTemplate {
    const stmt = this.db.prepare(`
      INSERT INTO task_templates (
        project_template_id, title, description, priority,
        estimated_hours, position
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.projectTemplateId || null,
      data.title,
      data.description || null,
      data.priority || 'medium',
      data.estimatedHours || null,
      data.position || 0
    );

    const task = this.findById(result.lastInsertRowid as number);
    if (!task) {
      throw new Error('Failed to create task template');
    }
    return task;
  }

  /**
   * Find task template by ID
   */
  findById(id: number): TaskTemplate | null {
    const stmt = this.db.prepare('SELECT * FROM task_templates WHERE id = ?');
    const row = stmt.get(id) as TaskTemplateRow | undefined;
    return row ? this.mapRowToTaskTemplate(row) : null;
  }

  /**
   * Get all task templates for a project template
   */
  findByProjectTemplateId(projectTemplateId: number): TaskTemplate[] {
    const stmt = this.db.prepare(
      'SELECT * FROM task_templates WHERE project_template_id = ? ORDER BY position ASC'
    );
    const rows = stmt.all(projectTemplateId) as TaskTemplateRow[];
    return rows.map(row => this.mapRowToTaskTemplate(row));
  }

  /**
   * Get all standalone task templates (not part of a project template)
   */
  findStandalone(): TaskTemplate[] {
    const stmt = this.db.prepare(
      'SELECT * FROM task_templates WHERE project_template_id IS NULL ORDER BY position ASC'
    );
    const rows = stmt.all() as TaskTemplateRow[];
    return rows.map(row => this.mapRowToTaskTemplate(row));
  }

  /**
   * Update a task template
   */
  update(id: number, data: UpdateTaskTemplateData): TaskTemplate {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.priority !== undefined) {
      fields.push('priority = ?');
      values.push(data.priority);
    }
    if (data.estimatedHours !== undefined) {
      fields.push('estimated_hours = ?');
      values.push(data.estimatedHours);
    }
    if (data.position !== undefined) {
      fields.push('position = ?');
      values.push(data.position);
    }

    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE task_templates SET ${fields.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    const task = this.findById(id);
    if (!task) {
      throw new Error('Task template not found after update');
    }
    return task;
  }

  /**
   * Delete a task template
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM task_templates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Reorder task templates within a project template
   */
  reorder(taskIds: number[]): void {
    const stmt = this.db.prepare('UPDATE task_templates SET position = ? WHERE id = ?');
    
    this.db.transaction(() => {
      taskIds.forEach((taskId, index) => {
        stmt.run(index, taskId);
      });
    })();
  }

  /**
   * Map database row to TaskTemplate model
   */
  private mapRowToTaskTemplate(row: TaskTemplateRow): TaskTemplate {
    return {
      id: row.id,
      projectTemplateId: row.project_template_id,
      title: row.title,
      description: row.description,
      priority: row.priority as 'low' | 'medium' | 'high' | 'critical',
      estimatedHours: row.estimated_hours,
      position: row.position,
    };
  }
}
