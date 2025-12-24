import Database from 'better-sqlite3';
import { Attachment, CreateAttachmentData } from '../models/Attachment';

/**
 * Database row interface for attachments table
 */
interface AttachmentRow {
  id: number;
  task_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

/**
 * Repository for Attachment CRUD operations
 */
export class AttachmentRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new attachment
   */
  create(data: CreateAttachmentData): Attachment {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO attachments (
        task_id, file_name, file_path, file_size,
        mime_type, uploaded_by, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.taskId,
      data.fileName,
      data.filePath,
      data.fileSize,
      data.mimeType,
      data.uploadedBy,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created attachment');
    }
    return created;
  }

  /**
   * Find attachment by ID
   */
  findById(id: number): Attachment | undefined {
    const stmt = this.db.prepare('SELECT * FROM attachments WHERE id = ?');
    const row = stmt.get(id) as AttachmentRow | undefined;
    return row ? this.mapRowToAttachment(row) : undefined;
  }

  /**
   * Find all attachments for a task
   */
  findByTaskId(taskId: number): Attachment[] {
    const stmt = this.db.prepare('SELECT * FROM attachments WHERE task_id = ? ORDER BY uploaded_at DESC');
    const rows = stmt.all(taskId) as AttachmentRow[];
    return rows.map(row => this.mapRowToAttachment(row));
  }

  /**
   * Delete an attachment
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM attachments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Map database row to Attachment model
   */
  private mapRowToAttachment(row: AttachmentRow): Attachment {
    return {
      id: row.id,
      taskId: row.task_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at
    };
  }
}
