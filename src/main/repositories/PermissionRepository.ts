import Database from 'better-sqlite3';
import { Permission, CreatePermissionData } from '../models/Permission';

/**
 * Database row interface for permissions table
 */
interface PermissionRow {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  created_at: string;
}

/**
 * Repository for managing permissions
 */
export class PermissionRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new permission
   */
  create(data: CreatePermissionData): Permission {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO permissions (name, resource, action, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.resource,
      data.action,
      data.description || null,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created permission');
    }
    return created;
  }

  /**
   * Find permission by ID
   */
  findById(id: number): Permission | undefined {
    const stmt = this.db.prepare('SELECT * FROM permissions WHERE id = ?');
    const row = stmt.get(id) as PermissionRow | undefined;
    return row ? this.mapRowToPermission(row) : undefined;
  }

  /**
   * Find permission by name
   */
  findByName(name: string): Permission | undefined {
    const stmt = this.db.prepare('SELECT * FROM permissions WHERE name = ?');
    const row = stmt.get(name) as PermissionRow | undefined;
    return row ? this.mapRowToPermission(row) : undefined;
  }

  /**
   * Find all permissions
   */
  findAll(): Permission[] {
    const stmt = this.db.prepare('SELECT * FROM permissions ORDER BY resource, action');
    const rows = stmt.all() as PermissionRow[];
    return rows.map(row => this.mapRowToPermission(row));
  }

  /**
   * Find permissions by resource
   */
  findByResource(resource: string): Permission[] {
    const stmt = this.db.prepare('SELECT * FROM permissions WHERE resource = ? ORDER BY action');
    const rows = stmt.all(resource) as PermissionRow[];
    return rows.map(row => this.mapRowToPermission(row));
  }

  /**
   * Delete permission
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM permissions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Map database row to Permission object
   */
  private mapRowToPermission(row: PermissionRow): Permission {
    return {
      id: row.id,
      name: row.name,
      resource: row.resource,
      action: row.action,
      description: row.description,
      createdAt: row.created_at,
    };
  }
}
