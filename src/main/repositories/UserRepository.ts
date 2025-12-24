import Database from 'better-sqlite3';
import { User, CreateUserData, UpdateUserData } from '../models/User';

/**
 * Database row interface for users table
 */
interface UserRow {
  id: number;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Repository for managing users
 */
export class UserRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new user
   */
  create(data: CreateUserData): User {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO users (username, email, display_name, avatar_url, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.username,
      data.email,
      data.displayName,
      data.avatarUrl || null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1,
      now,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created user');
    }
    return created;
  }

  /**
   * Find user by ID
   */
  findById(id: number): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as UserRow | undefined;
    return row ? this.mapRowToUser(row) : undefined;
  }

  /**
   * Find user by username
   */
  findByUsername(username: string): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    const row = stmt.get(username) as UserRow | undefined;
    return row ? this.mapRowToUser(row) : undefined;
  }

  /**
   * Find user by email
   */
  findByEmail(email: string): User | undefined {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as UserRow | undefined;
    return row ? this.mapRowToUser(row) : undefined;
  }

  /**
   * Find all users
   */
  findAll(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY display_name ASC');
    const rows = stmt.all() as UserRow[];
    return rows.map(row => this.mapRowToUser(row));
  }

  /**
   * Find all active users
   */
  findActive(): User[] {
    const stmt = this.db.prepare('SELECT * FROM users WHERE is_active = 1 ORDER BY display_name ASC');
    const rows = stmt.all() as UserRow[];
    return rows.map(row => this.mapRowToUser(row));
  }

  /**
   * Update user
   */
  update(id: number, data: UpdateUserData): User | undefined {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.username !== undefined) {
      updates.push('username = ?');
      values.push(data.username);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.displayName !== undefined) {
      updates.push('display_name = ?');
      values.push(data.displayName);
    }
    if (data.avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(data.avatarUrl);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.findById(id);
  }

  /**
   * Delete user
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
