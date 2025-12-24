import Database from 'better-sqlite3';
import { Project, CreateProjectData, UpdateProjectData, ProjectStatus } from '../models/Project';

/**
 * Database row interface for projects table
 */
interface ProjectRow {
  id: number;
  name: string;
  description: string | null;
  status: string;
  icon: string | null;
  color: string | null;
  start_date: string | null;
  end_date: string | null;
  concept_what: string | null;
  concept_how: string | null;
  concept_where: string | null;
  concept_with_what: string | null;
  concept_when: string | null;
  concept_why: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Repository for Project CRUD operations
 */
export class ProjectRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new project
   */
  create(data: CreateProjectData): Project {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO projects (
        name, description, status, color, icon,
        created_at, updated_at,
        concept_what, concept_how, concept_where,
        concept_with_what, concept_when, concept_why
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.description || null,
      data.status || ProjectStatus.Active,
      data.color || null,
      data.icon || null,
      now,
      now,
      data.conceptWhat || null,
      data.conceptHow || null,
      data.conceptWhere || null,
      data.conceptWithWhat || null,
      data.conceptWhen || null,
      data.conceptWhy || null
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created project');
    }
    return created;
  }

  /**
   * Find project by ID
   */
  findById(id: number): Project | undefined {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id) as ProjectRow | undefined;
    return row ? this.mapRowToProject(row) : undefined;
  }

  /**
   * Find all projects
   */
  findAll(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
    const rows = stmt.all() as ProjectRow[];
    return rows.map(row => this.mapRowToProject(row));
  }

  /**
   * Find projects by status
   */
  findByStatus(status: ProjectStatus): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE status = ? ORDER BY updated_at DESC');
    const rows = stmt.all(status) as ProjectRow[];
    return rows.map(row => this.mapRowToProject(row));
  }

  /**
   * Update a project
   */
  update(id: number, data: UpdateProjectData): Project | undefined {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      values.push(data.color);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      values.push(data.icon);
    }
    if (data.conceptWhat !== undefined) {
      updates.push('concept_what = ?');
      values.push(data.conceptWhat);
    }
    if (data.conceptHow !== undefined) {
      updates.push('concept_how = ?');
      values.push(data.conceptHow);
    }
    if (data.conceptWhere !== undefined) {
      updates.push('concept_where = ?');
      values.push(data.conceptWhere);
    }
    if (data.conceptWithWhat !== undefined) {
      updates.push('concept_with_what = ?');
      values.push(data.conceptWithWhat);
    }
    if (data.conceptWhen !== undefined) {
      updates.push('concept_when = ?');
      values.push(data.conceptWhen);
    }
    if (data.conceptWhy !== undefined) {
      updates.push('concept_why = ?');
      values.push(data.conceptWhy);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE projects SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete a project
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Map database row to Project model
   */
  private mapRowToProject(row: ProjectRow): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status as ProjectStatus,
      color: row.color,
      icon: row.icon,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      conceptWhat: row.concept_what,
      conceptHow: row.concept_how,
      conceptWhere: row.concept_where,
      conceptWithWhat: row.concept_with_what,
      conceptWhen: row.concept_when,
      conceptWhy: row.concept_why
    };
  }
}
