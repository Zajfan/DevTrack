import Database from 'better-sqlite3';
import {
  TimeEntry,
  CreateTimeEntryData,
  UpdateTimeEntryData,
  TimeEntryWithDetails,
  TimeTrackingStats,
} from '../models/TimeEntry';

/**
 * Database row interface for time_entries table
 */
interface TimeEntryRow {
  id: number;
  task_id: number;
  user_id: number;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  is_billable: number;
  hourly_rate: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row interface for time entries with task/project details
 */
interface TimeEntryWithDetailsRow extends TimeEntryRow {
  task_title: string;
  task_status: string;
  project_id: number;
  user_name: string;
  project_name: string;
}

/**
 * Repository for managing time entries
 */
export class TimeEntryRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new time entry
   */
  create(data: CreateTimeEntryData): TimeEntry {
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO time_entries (
        task_id, user_id, description, start_time, end_time,
        duration, is_billable, hourly_rate, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.taskId,
      data.userId,
      data.description || null,
      data.startTime,
      data.endTime || null,
      data.duration || null,
      data.isBillable ? 1 : 0,
      data.hourlyRate || null,
      now,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created time entry');
    }
    return created;
  }

  /**
   * Find time entry by ID
   */
  findById(id: number): TimeEntry | undefined {
    const stmt = this.db.prepare('SELECT * FROM time_entries WHERE id = ?');
    const row = stmt.get(id) as TimeEntryRow | undefined;
    return row ? this.mapRowToTimeEntry(row) : undefined;
  }

  /**
   * Find all time entries for a task
   */
  findByTaskId(taskId: number): TimeEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM time_entries
      WHERE task_id = ?
      ORDER BY start_time DESC
    `);
    const rows = stmt.all(taskId) as TimeEntryRow[];
    return rows.map(row => this.mapRowToTimeEntry(row));
  }

  /**
   * Find all time entries for a user
   */
  findByUserId(userId: number): TimeEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM time_entries
      WHERE user_id = ?
      ORDER BY start_time DESC
    `);
    const rows = stmt.all(userId) as TimeEntryRow[];
    return rows.map(row => this.mapRowToTimeEntry(row));
  }

  /**
   * Find time entries by task with details
   */
  findByTaskIdWithDetails(taskId: number): TimeEntryWithDetails[] {
    const stmt = this.db.prepare(`
      SELECT
        te.*,
        t.title as task_title,
        t.status as task_status,
        t.project_id as project_id,
        u.display_name as user_name,
        p.name as project_name
      FROM time_entries te
      JOIN tasks t ON t.id = te.task_id
      JOIN users u ON u.id = te.user_id
      JOIN projects p ON p.id = t.project_id
      WHERE te.task_id = ?
      ORDER BY te.start_time DESC
    `);
    const rows = stmt.all(taskId) as TimeEntryWithDetailsRow[];
    return rows.map(row => this.mapRowToTimeEntryWithDetails(row));
  }

  /**
   * Find time entries by user with details
   */
  findByUserIdWithDetails(userId: number): TimeEntryWithDetails[] {
    const stmt = this.db.prepare(`
      SELECT
        te.*,
        t.title as task_title,
        t.status as task_status,
        t.project_id as project_id,
        u.display_name as user_name,
        p.name as project_name
      FROM time_entries te
      JOIN tasks t ON t.id = te.task_id
      JOIN users u ON u.id = te.user_id
      JOIN projects p ON p.id = t.project_id
      WHERE te.user_id = ?
      ORDER BY te.start_time DESC
    `);
    const rows = stmt.all(userId) as TimeEntryWithDetailsRow[];
    return rows.map(row => this.mapRowToTimeEntryWithDetails(row));
  }

  /**
   * Find time entries by date range
   */
  findByDateRange(startDate: string, endDate: string, userId?: number): TimeEntry[] {
    let sql = `
      SELECT * FROM time_entries
      WHERE start_time >= ? AND start_time <= ?
    `;
    const params: any[] = [startDate, endDate];

    if (userId !== undefined) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY start_time DESC';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as TimeEntryRow[];
    return rows.map(row => this.mapRowToTimeEntry(row));
  }

  /**
   * Find active (running) time entry for user
   */
  findActiveByUserId(userId: number): TimeEntry | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM time_entries
      WHERE user_id = ? AND end_time IS NULL
      ORDER BY start_time DESC
      LIMIT 1
    `);
    const row = stmt.get(userId) as TimeEntryRow | undefined;
    return row ? this.mapRowToTimeEntry(row) : undefined;
  }

  /**
   * Update a time entry
   */
  update(id: number, data: UpdateTimeEntryData): TimeEntry | undefined {
    const updates: string[] = [];
    const values: any[] = [];
    const now = new Date().toISOString();

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.startTime !== undefined) {
      updates.push('start_time = ?');
      values.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      updates.push('end_time = ?');
      values.push(data.endTime);
    }
    if (data.duration !== undefined) {
      updates.push('duration = ?');
      values.push(data.duration);
    }
    if (data.isBillable !== undefined) {
      updates.push('is_billable = ?');
      values.push(data.isBillable ? 1 : 0);
    }
    if (data.hourlyRate !== undefined) {
      updates.push('hourly_rate = ?');
      values.push(data.hourlyRate);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Stop a running time entry (set end_time and calculate duration)
   */
  stop(id: number, endTime?: string): TimeEntry | undefined {
    const entry = this.findById(id);
    if (!entry) return undefined;

    const end = endTime || new Date().toISOString();
    const startMs = new Date(entry.startTime).getTime();
    const endMs = new Date(end).getTime();
    const durationSeconds = Math.floor((endMs - startMs) / 1000);

    return this.update(id, {
      endTime: end,
      duration: durationSeconds,
    });
  }

  /**
   * Delete a time entry
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM time_entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get time tracking statistics for a task
   */
  getTaskStats(taskId: number): TimeTrackingStats {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as entry_count,
        COALESCE(SUM(duration), 0) as total_duration,
        COALESCE(SUM(CASE WHEN is_billable = 1 THEN duration ELSE 0 END), 0) as billable_duration,
        COALESCE(SUM(CASE WHEN is_billable = 0 THEN duration ELSE 0 END), 0) as non_billable_duration,
        COALESCE(SUM(CASE WHEN is_billable = 1 AND hourly_rate IS NOT NULL 
          THEN (duration / 3600.0) * hourly_rate ELSE 0 END), 0) as total_earnings
      FROM time_entries
      WHERE task_id = ? AND duration IS NOT NULL
    `);
    
    const row: any = stmt.get(taskId);
    
    return {
      totalDuration: row.total_duration || 0,
      billableDuration: row.billable_duration || 0,
      nonBillableDuration: row.non_billable_duration || 0,
      totalEarnings: row.total_earnings || 0,
      entryCount: row.entry_count || 0,
      averageDuration: row.entry_count > 0 ? (row.total_duration / row.entry_count) : 0,
    };
  }

  /**
   * Get time tracking statistics for a user
   */
  getUserStats(userId: number, startDate?: string, endDate?: string): TimeTrackingStats {
    let sql = `
      SELECT 
        COUNT(*) as entry_count,
        COALESCE(SUM(duration), 0) as total_duration,
        COALESCE(SUM(CASE WHEN is_billable = 1 THEN duration ELSE 0 END), 0) as billable_duration,
        COALESCE(SUM(CASE WHEN is_billable = 0 THEN duration ELSE 0 END), 0) as non_billable_duration,
        COALESCE(SUM(CASE WHEN is_billable = 1 AND hourly_rate IS NOT NULL 
          THEN (duration / 3600.0) * hourly_rate ELSE 0 END), 0) as total_earnings
      FROM time_entries
      WHERE user_id = ? AND duration IS NOT NULL
    `;
    
    const params: any[] = [userId];
    
    if (startDate && endDate) {
      sql += ' AND start_time >= ? AND start_time <= ?';
      params.push(startDate, endDate);
    }
    
    const stmt = this.db.prepare(sql);
    const row: any = stmt.get(...params);
    
    return {
      totalDuration: row.total_duration || 0,
      billableDuration: row.billable_duration || 0,
      nonBillableDuration: row.non_billable_duration || 0,
      totalEarnings: row.total_earnings || 0,
      entryCount: row.entry_count || 0,
      averageDuration: row.entry_count > 0 ? (row.total_duration / row.entry_count) : 0,
    };
  }

  /**
   * Map database row to TimeEntry model
   */
  private mapRowToTimeEntry(row: TimeEntryRow): TimeEntry {
    return {
      id: row.id,
      taskId: row.task_id,
      userId: row.user_id,
      description: row.description,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      isBillable: row.is_billable === 1,
      hourlyRate: row.hourly_rate,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to TimeEntryWithDetails model
   */
  private mapRowToTimeEntryWithDetails(row: TimeEntryWithDetailsRow): TimeEntryWithDetails {
    return {
      ...this.mapRowToTimeEntry(row),
      taskTitle: row.task_title,
      taskStatus: row.task_status,
      userName: row.user_name,
      projectId: row.project_id,
      projectName: row.project_name,
    };
  }
}
