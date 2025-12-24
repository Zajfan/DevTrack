import Database from 'better-sqlite3';
import { Role, CreateRoleData, UpdateRoleData } from '../models/Role';
import { Permission } from '../models/Permission';

/**
 * Database row interface for roles table
 */
interface RoleRow {
  id: number;
  name: string;
  description: string | null;
  is_system: number;
  created_at: string;
}

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
 * Repository for managing roles
 */
export class RoleRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new role
   */
  create(data: CreateRoleData): Role {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO roles (name, description, is_system, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.description || null,
      data.isSystem !== undefined ? (data.isSystem ? 1 : 0) : 0,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created role');
    }
    return created;
  }

  /**
   * Find role by ID
   */
  findById(id: number): Role | undefined {
    const stmt = this.db.prepare('SELECT * FROM roles WHERE id = ?');
    const row = stmt.get(id) as RoleRow | undefined;
    return row ? this.mapRowToRole(row) : undefined;
  }

  /**
   * Find role by name
   */
  findByName(name: string): Role | undefined {
    const stmt = this.db.prepare('SELECT * FROM roles WHERE name = ?');
    const row = stmt.get(name) as RoleRow | undefined;
    return row ? this.mapRowToRole(row) : undefined;
  }

  /**
   * Find all roles
   */
  findAll(): Role[] {
    const stmt = this.db.prepare('SELECT * FROM roles ORDER BY name ASC');
    const rows = stmt.all() as RoleRow[];
    return rows.map(row => this.mapRowToRole(row));
  }

  /**
   * Get permissions for a role
   */
  getPermissions(roleId: number): Permission[] {
    const stmt = this.db.prepare(`
      SELECT p.* FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.resource, p.action
    `);
    const rows = stmt.all(roleId) as PermissionRow[];
    return rows.map(row => this.mapRowToPermission(row));
  }

  /**
   * Add permission to role
   */
  addPermission(roleId: number, permissionId: number): boolean {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (?, ?)
      `);
      stmt.run(roleId, permissionId);
      return true;
    } catch (err) {
      // Ignore duplicate errors
      return false;
    }
  }

  /**
   * Remove permission from role
   */
  removePermission(roleId: number, permissionId: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM role_permissions
      WHERE role_id = ? AND permission_id = ?
    `);
    const result = stmt.run(roleId, permissionId);
    return result.changes > 0;
  }

  /**
   * Update role
   */
  update(id: number, data: UpdateRoleData): Role | undefined {
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

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE roles SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  /**
   * Delete role (only if not system role)
   */
  delete(id: number): boolean {
    // Check if system role
    const role = this.findById(id);
    if (role?.isSystem) {
      throw new Error('Cannot delete system role');
    }

    const stmt = this.db.prepare('DELETE FROM roles WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Map database row to Role object
   */
  private mapRowToRole(row: RoleRow): Role {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isSystem: row.is_system === 1,
      createdAt: row.created_at,
    };
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
