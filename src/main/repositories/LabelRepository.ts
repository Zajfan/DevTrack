import Database from 'better-sqlite3';
import { Label, CreateLabelData, UpdateLabelData } from '../models/Label';

/**
 * Database row interface for labels table
 */
interface LabelRow {
  id: number;
  project_id: number;
  name: string;
  color: string;
  description: string | null;
  created_at: string;
}

/**
 * Repository for Label CRUD operations
 */
export class LabelRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new label
   */
  create(data: CreateLabelData): Label {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO labels (project_id, name, color, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.projectId,
      data.name,
      data.color,
      data.description || null,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created label');
    }
    return created;
  }

  /**
   * Find label by ID
   */
  findById(id: number): Label | undefined {
    const stmt = this.db.prepare('SELECT * FROM labels WHERE id = ?');
    const row = stmt.get(id) as LabelRow | undefined;
    return row ? this.mapRowToLabel(row) : undefined;
  }

  /**
   * Find all labels for a project
   */
  findByProjectId(projectId: number): Label[] {
    const stmt = this.db.prepare('SELECT * FROM labels WHERE project_id = ? ORDER BY name');
    const rows = stmt.all(projectId) as LabelRow[];
    return rows.map(row => this.mapRowToLabel(row));
  }

  /**
   * Update a label
   */
  update(id: number, data: UpdateLabelData): Label | undefined {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE labels SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete a label
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM labels WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Add a label to a task
   */
  addToTask(taskId: number, labelId: number): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO task_labels (task_id, label_id)
        VALUES (?, ?)
      `);
      stmt.run(taskId, labelId);
      return true;
    } catch (error) {
      // Ignore duplicate entries (unique constraint)
      return false;
    }
  }

  /**
   * Remove a label from a task
   */
  removeFromTask(taskId: number, labelId: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM task_labels
      WHERE task_id = ? AND label_id = ?
    `);
    const result = stmt.run(taskId, labelId);
    return result.changes > 0;
  }

  /**
   * Get all labels for a task
   */
  findByTaskId(taskId: number): Label[] {
    const stmt = this.db.prepare(`
      SELECT l.* FROM labels l
      INNER JOIN task_labels tl ON l.id = tl.label_id
      WHERE tl.task_id = ?
      ORDER BY l.name
    `);
    const rows = stmt.all(taskId) as LabelRow[];
    return rows.map(row => this.mapRowToLabel(row));
  }

  /**
   * Map database row to Label model
   */
  private mapRowToLabel(row: LabelRow): Label {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      color: row.color,
      description: row.description,
      createdAt: row.created_at
    };
  }
}
