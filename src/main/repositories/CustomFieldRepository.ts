import Database from 'better-sqlite3';
import {
  CustomField,
  CreateCustomFieldData,
  UpdateCustomFieldData,
  TaskCustomValue,
  CustomFieldType
} from '../models/CustomField';

/**
 * Database row interface for custom_fields table
 */
interface CustomFieldRow {
  id: number;
  project_id: number;
  name: string;
  field_type: string;
  options: string | null;
  required: number;
  created_at: string;
}

/**
 * Database row interface for task_custom_values table
 */
interface TaskCustomValueRow {
  task_id: number;
  custom_field_id: number;
  value: string;
}

/**
 * Repository for CustomField CRUD operations
 */
export class CustomFieldRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new custom field
   */
  create(data: CreateCustomFieldData): CustomField {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO custom_fields (
        project_id, name, field_type, options, required, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.projectId,
      data.name,
      data.fieldType,
      data.options || null,
      data.required ? 1 : 0,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created custom field');
    }
    return created;
  }

  /**
   * Find custom field by ID
   */
  findById(id: number): CustomField | undefined {
    const stmt = this.db.prepare('SELECT * FROM custom_fields WHERE id = ?');
    const row = stmt.get(id) as CustomFieldRow | undefined;
    return row ? this.mapRowToCustomField(row) : undefined;
  }

  /**
   * Find all custom fields for a project
   */
  findByProjectId(projectId: number): CustomField[] {
    const stmt = this.db.prepare('SELECT * FROM custom_fields WHERE project_id = ? ORDER BY name');
    const rows = stmt.all(projectId) as CustomFieldRow[];
    return rows.map(row => this.mapRowToCustomField(row));
  }

  /**
   * Update a custom field
   */
  update(id: number, data: UpdateCustomFieldData): CustomField | undefined {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.options !== undefined) {
      updates.push('options = ?');
      values.push(data.options);
    }
    if (data.required !== undefined) {
      updates.push('required = ?');
      values.push(data.required ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE custom_fields SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete a custom field
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM custom_fields WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Set custom field value for a task
   */
  setTaskValue(taskId: number, customFieldId: number, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO task_custom_values (task_id, custom_field_id, value)
      VALUES (?, ?, ?)
    `);
    stmt.run(taskId, customFieldId, value);
  }

  /**
   * Get custom field value for a task
   */
  getTaskValue(taskId: number, customFieldId: number): string | undefined {
    const stmt = this.db.prepare(`
      SELECT value FROM task_custom_values WHERE task_id = ? AND custom_field_id = ?
    `);
    const row = stmt.get(taskId, customFieldId) as { value: string } | undefined;
    return row ? row.value : undefined;
  }

  /**
   * Get all custom field values for a task
   */
  getTaskValues(taskId: number): TaskCustomValue[] {
    const stmt = this.db.prepare(`
      SELECT task_id, custom_field_id, value
      FROM task_custom_values
      WHERE task_id = ?
    `);
    const rows = stmt.all(taskId) as TaskCustomValueRow[];
    return rows.map(row => ({
      taskId: row.task_id,
      customFieldId: row.custom_field_id,
      value: row.value
    }));
  }

  /**
   * Delete custom field value for a task
   */
  deleteTaskValue(taskId: number, customFieldId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM task_custom_values WHERE task_id = ? AND custom_field_id = ?
    `);
    stmt.run(taskId, customFieldId);
  }

  /**
   * Map database row to CustomField model
   */
  private mapRowToCustomField(row: CustomFieldRow): CustomField {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      fieldType: row.field_type as CustomFieldType,
      options: row.options,
      required: row.required === 1,
      createdAt: row.created_at
    };
  }
}
