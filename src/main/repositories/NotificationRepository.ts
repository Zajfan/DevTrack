import Database from 'better-sqlite3';
import { Notification, CreateNotificationData, NotificationType } from '../models/Notification';

/**
 * Database row interface for notifications table
 */
interface NotificationRow {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  related_project_id: number | null;
  related_task_id: number | null;
  is_read: number;
  created_at: string;
  read_at: string | null;
}

/**
 * Repository for managing notifications
 */
export class NotificationRepository {
  constructor(private db: Database.Database) {}

  /**
   * Validate and sanitize limit parameter to prevent SQL injection
   */
  private validateLimit(limit?: number): number | undefined {
    if (limit === undefined) return undefined;
    if (!Number.isInteger(limit) || limit < 0) {
      throw new Error('Invalid limit parameter: must be a positive integer');
    }
    if (limit > 10000) {
      throw new Error('Invalid limit parameter: maximum value is 10000');
    }
    return limit;
  }

  /**
   * Create a new notification
   */
  create(data: CreateNotificationData): Notification {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, title, message, link, 
        related_project_id, related_task_id, is_read, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    const result = stmt.run(
      data.userId,
      data.type,
      data.title,
      data.message,
      data.link || null,
      data.relatedProjectId || null,
      data.relatedTaskId || null,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created notification');
    }
    return created;
  }

  /**
   * Create multiple notifications at once (bulk insert)
   */
  createBulk(notifications: CreateNotificationData[]): number {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO notifications (
        user_id, type, title, message, link, 
        related_project_id, related_task_id, is_read, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    const insert = this.db.transaction((notifs: CreateNotificationData[]) => {
      for (const data of notifs) {
        stmt.run(
          data.userId,
          data.type,
          data.title,
          data.message,
          data.link || null,
          data.relatedProjectId || null,
          data.relatedTaskId || null,
          now
        );
      }
    });

    insert(notifications);
    return notifications.length;
  }

  /**
   * Find notification by ID
   */
  findById(id: number): Notification | undefined {
    const stmt = this.db.prepare('SELECT * FROM notifications WHERE id = ?');
    const row = stmt.get(id) as NotificationRow | undefined;
    return row ? this.mapRowToNotification(row) : undefined;
  }

  /**
   * Find all notifications for a user
   */
  findByUserId(userId: number, limit?: number): Notification[] {
    const validatedLimit = this.validateLimit(limit);
    const limitClause = validatedLimit ? `LIMIT ${validatedLimit}` : '';
    const stmt = this.db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      ${limitClause}
    `);
    const rows = stmt.all(userId) as NotificationRow[];
    return rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Find unread notifications for a user
   */
  findUnreadByUserId(userId: number, limit?: number): Notification[] {
    const validatedLimit = this.validateLimit(limit);
    const limitClause = validatedLimit ? `LIMIT ${validatedLimit}` : '';
    const stmt = this.db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? AND is_read = 0
      ORDER BY created_at DESC
      ${limitClause}
    `);
    const rows = stmt.all(userId) as NotificationRow[];
    return rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Get unread count for a user
   */
  getUnreadCount(userId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE user_id = ? AND is_read = 0
    `);
    const row = stmt.get(userId) as { count: number };
    return row.count;
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE notifications 
      SET is_read = 1, read_at = ? 
      WHERE id = ?
    `);
    const result = stmt.run(new Date().toISOString(), id);
    return result.changes > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: number): number {
    const stmt = this.db.prepare(`
      UPDATE notifications 
      SET is_read = 1, read_at = ? 
      WHERE user_id = ? AND is_read = 0
    `);
    const result = stmt.run(new Date().toISOString(), userId);
    return result.changes;
  }

  /**
   * Mark notification as unread
   */
  markAsUnread(id: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE notifications 
      SET is_read = 0, read_at = NULL 
      WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete notification
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM notifications WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete all notifications for a user
   */
  deleteAllByUserId(userId: number): number {
    const stmt = this.db.prepare('DELETE FROM notifications WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  }

  /**
   * Delete old read notifications (older than specified days)
   */
  deleteOldReadNotifications(daysOld: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffISO = cutoffDate.toISOString();

    const stmt = this.db.prepare(`
      DELETE FROM notifications 
      WHERE is_read = 1 AND created_at < ?
    `);
    const result = stmt.run(cutoffISO);
    return result.changes;
  }

  /**
   * Find notifications by type
   */
  findByType(userId: number, type: NotificationType, limit?: number): Notification[] {
    const validatedLimit = this.validateLimit(limit);
    const limitClause = validatedLimit ? `LIMIT ${validatedLimit}` : '';
    const stmt = this.db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? AND type = ?
      ORDER BY created_at DESC
      ${limitClause}
    `);
    const rows = stmt.all(userId, type) as NotificationRow[];
    return rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Find notifications related to a project
   */
  findByProjectId(userId: number, projectId: number, limit?: number): Notification[] {
    const validatedLimit = this.validateLimit(limit);
    const limitClause = validatedLimit ? `LIMIT ${validatedLimit}` : '';
    const stmt = this.db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? AND related_project_id = ?
      ORDER BY created_at DESC
      ${limitClause}
    `);
    const rows = stmt.all(userId, projectId) as NotificationRow[];
    return rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Find notifications related to a task
   */
  findByTaskId(userId: number, taskId: number, limit?: number): Notification[] {
    const validatedLimit = this.validateLimit(limit);
    const limitClause = validatedLimit ? `LIMIT ${validatedLimit}` : '';
    const stmt = this.db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ? AND related_task_id = ?
      ORDER BY created_at DESC
      ${limitClause}
    `);
    const rows = stmt.all(userId, taskId) as NotificationRow[];
    return rows.map(row => this.mapRowToNotification(row));
  }

  /**
   * Map database row to Notification object
   */
  private mapRowToNotification(row: NotificationRow): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      title: row.title,
      message: row.message,
      link: row.link,
      relatedProjectId: row.related_project_id,
      relatedTaskId: row.related_task_id,
      isRead: row.is_read === 1,
      createdAt: row.created_at,
      readAt: row.read_at,
    };
  }
}
