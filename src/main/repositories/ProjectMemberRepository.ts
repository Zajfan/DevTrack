import Database from 'better-sqlite3';
import { ProjectMember, ProjectMemberWithDetails, CreateProjectMemberData } from '../models/ProjectMember';
import { User } from '../models/User';
import { Role } from '../models/Role';

/**
 * Database row interface for project_members table
 */
interface ProjectMemberRow {
  id: number;
  project_id: number;
  user_id: number;
  role_id: number;
  added_at: string;
  added_by: number | null;
}

/**
 * Database row interface for project_members with joined user/role details
 */
interface ProjectMemberWithDetailsRow extends ProjectMemberRow {
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_active: number;
  user_created_at: string;
  user_updated_at: string;
  role_name: string;
  role_description: string | null;
  role_is_system: number;
  role_created_at: string;
  added_by_id: number | null;
  added_by_username: string | null;
  added_by_email: string | null;
  added_by_display_name: string | null;
  added_by_avatar_url: string | null;
  added_by_is_active: number | null;
  added_by_created_at: string | null;
  added_by_updated_at: string | null;
}

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
 * Database row interface for member count query
 */
interface CountRow {
  count: number;
}

/**
 * Repository for managing project members
 */
export class ProjectMemberRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new project member
   */
  create(data: CreateProjectMemberData): ProjectMember {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO project_members (project_id, user_id, role_id, added_at, added_by)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.projectId,
      data.userId,
      data.roleId,
      now,
      data.addedBy || null
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created project member');
    }
    return created;
  }

  /**
   * Find project member by ID
   */
  findById(id: number): ProjectMember | undefined {
    const stmt = this.db.prepare('SELECT * FROM project_members WHERE id = ?');
    const row = stmt.get(id) as ProjectMemberRow | undefined;
    return row ? this.mapRowToProjectMember(row) : undefined;
  }

  /**
   * Find project members by project ID
   */
  findByProjectId(projectId: number): ProjectMember[] {
    const stmt = this.db.prepare('SELECT * FROM project_members WHERE project_id = ?');
    const rows = stmt.all(projectId) as ProjectMemberRow[];
    return rows.map(this.mapRowToProjectMember);
  }

  /**
   * Find project members by user ID
   */
  findByUserId(userId: number): ProjectMember[] {
    const stmt = this.db.prepare('SELECT * FROM project_members WHERE user_id = ?');
    const rows = stmt.all(userId) as ProjectMemberRow[];
    return rows.map(this.mapRowToProjectMember);
  }

  /**
   * Find project member with full details (user, role, added by)
   */
  findByIdWithDetails(id: number): ProjectMemberWithDetails | undefined {
    const stmt = this.db.prepare(`
      SELECT
        pm.*,
        u.id as user_id, u.username, u.email, u.display_name, u.avatar_url, u.is_active,
        u.created_at as user_created_at, u.updated_at as user_updated_at,
        r.id as role_id, r.name as role_name, r.description as role_description,
        r.is_system as role_is_system, r.created_at as role_created_at,
        ab.id as added_by_id, ab.username as added_by_username, ab.email as added_by_email,
        ab.display_name as added_by_display_name, ab.avatar_url as added_by_avatar_url,
        ab.is_active as added_by_is_active, ab.created_at as added_by_created_at,
        ab.updated_at as added_by_updated_at
      FROM project_members pm
      INNER JOIN users u ON pm.user_id = u.id
      INNER JOIN roles r ON pm.role_id = r.id
      LEFT JOIN users ab ON pm.added_by = ab.id
      WHERE pm.id = ?
    `);
    const row = stmt.get(id) as ProjectMemberWithDetailsRow | undefined;
    return row ? this.mapRowToProjectMemberWithDetails(row) : undefined;
  }

  /**
   * Find project members with full details by project ID
   */
  findByProjectIdWithDetails(projectId: number): ProjectMemberWithDetails[] {
    const stmt = this.db.prepare(`
      SELECT
        pm.*,
        u.id as user_id, u.username, u.email, u.display_name, u.avatar_url, u.is_active,
        u.created_at as user_created_at, u.updated_at as user_updated_at,
        r.id as role_id, r.name as role_name, r.description as role_description,
        r.is_system as role_is_system, r.created_at as role_created_at,
        ab.id as added_by_id, ab.username as added_by_username, ab.email as added_by_email,
        ab.display_name as added_by_display_name, ab.avatar_url as added_by_avatar_url,
        ab.is_active as added_by_is_active, ab.created_at as added_by_created_at,
        ab.updated_at as added_by_updated_at
      FROM project_members pm
      INNER JOIN users u ON pm.user_id = u.id
      INNER JOIN roles r ON pm.role_id = r.id
      LEFT JOIN users ab ON pm.added_by = ab.id
      WHERE pm.project_id = ?
      ORDER BY pm.added_at DESC
    `);
    const rows = stmt.all(projectId) as ProjectMemberWithDetailsRow[];
    return rows.map(this.mapRowToProjectMemberWithDetails);
  }

  /**
   * Get user's role in a project
   */
  getUserRole(projectId: number, userId: number): Role | undefined {
    const stmt = this.db.prepare(`
      SELECT r.* FROM roles r
      INNER JOIN project_members pm ON r.id = pm.role_id
      WHERE pm.project_id = ? AND pm.user_id = ?
    `);
    const row = stmt.get(projectId, userId) as RoleRow | undefined;
    return row ? this.mapRowToRole(row) : undefined;
  }

  /**
   * Update project member role
   */
  updateRole(id: number, roleId: number): ProjectMember | undefined {
    const stmt = this.db.prepare(`
      UPDATE project_members SET role_id = ? WHERE id = ?
    `);
    stmt.run(roleId, id);
    return this.findById(id);
  }

  /**
   * Delete project member
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM project_members WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Remove user from project
   */
  removeUserFromProject(projectId: number, userId: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM project_members 
      WHERE project_id = ? AND user_id = ?
    `);
    const result = stmt.run(projectId, userId);
    return result.changes > 0;
  }

  /**
   * Check if user is member of project
   */
  isMember(projectId: number, userId: number): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM project_members
      WHERE project_id = ? AND user_id = ?
    `);
    const row = stmt.get(projectId, userId) as CountRow;
    return row.count > 0;
  }

  /**
   * Map database row to ProjectMember object
   */
  private mapRowToProjectMember(row: ProjectMemberRow): ProjectMember {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      roleId: row.role_id,
      addedAt: row.added_at,
      addedBy: row.added_by,
    };
  }

  /**
   * Map database row to ProjectMemberWithDetails object
   */
  private mapRowToProjectMemberWithDetails(row: ProjectMemberWithDetailsRow): ProjectMemberWithDetails {
    const member: ProjectMemberWithDetails = {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      roleId: row.role_id,
      addedAt: row.added_at,
      addedBy: row.added_by,
      user: {
        id: row.user_id,
        username: row.username,
        email: row.email,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        isActive: row.is_active === 1,
        createdAt: row.user_created_at,
        updatedAt: row.user_updated_at,
      },
      role: {
        id: row.role_id,
        name: row.role_name,
        description: row.role_description,
        isSystem: row.role_is_system === 1,
        createdAt: row.role_created_at,
      },
    };

    if (row.added_by_id && row.added_by_username && row.added_by_email && row.added_by_display_name && row.added_by_created_at && row.added_by_updated_at) {
      member.addedByUser = {
        id: row.added_by_id,
        username: row.added_by_username,
        email: row.added_by_email,
        displayName: row.added_by_display_name,
        avatarUrl: row.added_by_avatar_url,
        isActive: row.added_by_is_active === 1,
        createdAt: row.added_by_created_at,
        updatedAt: row.added_by_updated_at,
      };
    }

    return member;
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
}
