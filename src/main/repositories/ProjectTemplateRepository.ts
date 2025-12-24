import Database from 'better-sqlite3';
import {
  ProjectTemplate,
  CreateProjectTemplateData,
  UpdateProjectTemplateData,
  ProjectTemplateWithTasks,
} from '../models/Template';
import { TaskTemplateRepository } from './TaskTemplateRepository';

/**
 * Database row interface for project_templates table
 */
interface ProjectTemplateRow {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category: string | null;
  is_public: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  concept_what: string | null;
  concept_how: string | null;
  concept_where: string | null;
  concept_with_what: string | null;
  concept_when: string | null;
  concept_why: string | null;
}

/**
 * Repository for project templates
 * Handles CRUD operations for reusable project templates
 */
export class ProjectTemplateRepository {
  private taskTemplateRepo: TaskTemplateRepository;

  constructor(private db: Database.Database) {
    this.taskTemplateRepo = new TaskTemplateRepository(db);
  }

  /**
   * Create a new project template
   */
  create(data: CreateProjectTemplateData): ProjectTemplate {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO project_templates (
        name, description, icon, color, category, is_public,
        created_by, created_at, updated_at,
        concept_what, concept_how, concept_where,
        concept_with_what, concept_when, concept_why
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.description || null,
      data.icon || null,
      data.color || null,
      data.category || null,
      data.isPublic ? 1 : 0,
      data.createdBy || null,
      now,
      now,
      data.conceptWhat || null,
      data.conceptHow || null,
      data.conceptWhere || null,
      data.conceptWithWhat || null,
      data.conceptWhen || null,
      data.conceptWhy || null
    );

    const template = this.findById(result.lastInsertRowid as number);
    if (!template) {
      throw new Error('Failed to create project template');
    }
    return template;
  }

  /**
   * Find project template by ID
   */
  findById(id: number): ProjectTemplate | null {
    const stmt = this.db.prepare('SELECT * FROM project_templates WHERE id = ?');
    const row = stmt.get(id) as ProjectTemplateRow | undefined;
    return row ? this.mapRowToTemplate(row) : null;
  }

  /**
   * Find project template by ID with associated tasks
   */
  findByIdWithTasks(id: number): ProjectTemplateWithTasks | null {
    const template = this.findById(id);
    if (!template) return null;

    const tasks = this.taskTemplateRepo.findByProjectTemplateId(id);
    return {
      ...template,
      tasks,
    };
  }

  /**
   * Get all project templates
   */
  findAll(): ProjectTemplate[] {
    const stmt = this.db.prepare('SELECT * FROM project_templates ORDER BY created_at DESC');
    const rows = stmt.all() as ProjectTemplateRow[];
    return rows.map(row => this.mapRowToTemplate(row));
  }

  /**
   * Get all public project templates
   */
  findPublic(): ProjectTemplate[] {
    const stmt = this.db.prepare(
      'SELECT * FROM project_templates WHERE is_public = 1 ORDER BY created_at DESC'
    );
    const rows = stmt.all() as ProjectTemplateRow[];
    return rows.map(row => this.mapRowToTemplate(row));
  }

  /**
   * Get templates by category
   */
  findByCategory(category: string): ProjectTemplate[] {
    const stmt = this.db.prepare(
      'SELECT * FROM project_templates WHERE category = ? ORDER BY created_at DESC'
    );
    const rows = stmt.all(category) as ProjectTemplateRow[];
    return rows.map(row => this.mapRowToTemplate(row));
  }

  /**
   * Get templates created by a specific user
   */
  findByCreator(userId: number): ProjectTemplate[] {
    const stmt = this.db.prepare(
      'SELECT * FROM project_templates WHERE created_by = ? ORDER BY created_at DESC'
    );
    const rows = stmt.all(userId) as ProjectTemplateRow[];
    return rows.map(row => this.mapRowToTemplate(row));
  }

  /**
   * Update a project template
   */
  update(id: number, data: UpdateProjectTemplateData): ProjectTemplate {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.icon !== undefined) {
      fields.push('icon = ?');
      values.push(data.icon);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      values.push(data.color);
    }
    if (data.category !== undefined) {
      fields.push('category = ?');
      values.push(data.category);
    }
    if (data.isPublic !== undefined) {
      fields.push('is_public = ?');
      values.push(data.isPublic ? 1 : 0);
    }
    if (data.conceptWhat !== undefined) {
      fields.push('concept_what = ?');
      values.push(data.conceptWhat);
    }
    if (data.conceptHow !== undefined) {
      fields.push('concept_how = ?');
      values.push(data.conceptHow);
    }
    if (data.conceptWhere !== undefined) {
      fields.push('concept_where = ?');
      values.push(data.conceptWhere);
    }
    if (data.conceptWithWhat !== undefined) {
      fields.push('concept_with_what = ?');
      values.push(data.conceptWithWhat);
    }
    if (data.conceptWhen !== undefined) {
      fields.push('concept_when = ?');
      values.push(data.conceptWhen);
    }
    if (data.conceptWhy !== undefined) {
      fields.push('concept_why = ?');
      values.push(data.conceptWhy);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE project_templates SET ${fields.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    const template = this.findById(id);
    if (!template) {
      throw new Error('Template not found after update');
    }
    return template;
  }

  /**
   * Delete a project template (cascades to task templates)
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM project_templates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Duplicate a template
   */
  duplicate(id: number, newName?: string): ProjectTemplate {
    const original = this.findByIdWithTasks(id);
    if (!original) {
      throw new Error('Template not found');
    }

    // Create new template
    const newTemplate = this.create({
      name: newName || `${original.name} (Copy)`,
      description: original.description || undefined,
      icon: original.icon || undefined,
      color: original.color || undefined,
      category: original.category || undefined,
      isPublic: original.isPublic,
      conceptWhat: original.conceptWhat || undefined,
      conceptHow: original.conceptHow || undefined,
      conceptWhere: original.conceptWhere || undefined,
      conceptWithWhat: original.conceptWithWhat || undefined,
      conceptWhen: original.conceptWhen || undefined,
      conceptWhy: original.conceptWhy || undefined,
    });

    // Copy tasks
    for (const task of original.tasks) {
      this.taskTemplateRepo.create({
        projectTemplateId: newTemplate.id,
        title: task.title,
        description: task.description || undefined,
        priority: task.priority,
        estimatedHours: task.estimatedHours || undefined,
        position: task.position,
      });
    }

    return newTemplate;
  }

  /**
   * Map database row to ProjectTemplate model
   */
  private mapRowToTemplate(row: ProjectTemplateRow): ProjectTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      category: row.category,
      isPublic: row.is_public === 1,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      conceptWhat: row.concept_what,
      conceptHow: row.concept_how,
      conceptWhere: row.concept_where,
      conceptWithWhat: row.concept_with_what,
      conceptWhen: row.concept_when,
      conceptWhy: row.concept_why,
    };
  }
}
