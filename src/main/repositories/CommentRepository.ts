import Database from 'better-sqlite3';
import { Comment, CreateCommentData, UpdateCommentData } from '../models/Comment';

/**
 * Database row interface for comments table
 */
interface CommentRow {
  id: number;
  task_id: number;
  author: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Repository for Comment CRUD operations
 */
export class CommentRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new comment
   */
  create(data: CreateCommentData): Comment {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO comments (task_id, author, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.taskId,
      data.author,
      data.content,
      now,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created comment');
    }
    return created;
  }

  /**
   * Find comment by ID
   */
  findById(id: number): Comment | undefined {
    const stmt = this.db.prepare('SELECT * FROM comments WHERE id = ?');
    const row = stmt.get(id) as CommentRow | undefined;
    return row ? this.mapRowToComment(row) : undefined;
  }

  /**
   * Find all comments for a task
   */
  findByTaskId(taskId: number): Comment[] {
    const stmt = this.db.prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(taskId) as CommentRow[];
    return rows.map(row => this.mapRowToComment(row));
  }

  /**
   * Update a comment
   */
  update(id: number, data: UpdateCommentData): Comment | undefined {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      UPDATE comments SET content = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(data.content, now, id);

    return this.findById(id);
  }

  /**
   * Delete a comment
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM comments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Map database row to Comment model
   */
  private mapRowToComment(row: CommentRow): Comment {
    return {
      id: row.id,
      taskId: row.task_id,
      author: row.author,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
