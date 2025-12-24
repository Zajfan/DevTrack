import Database from 'better-sqlite3';
import {
  AuditLog,
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditChange,
  AuditFilters,
  AuditReport,
  ComplianceReport,
  getActionCategory,
  getActionSeverity,
} from '../models/AuditLog';

/**
 * AuditLogger - Comprehensive audit trail system
 */
export class AuditLogger {
  constructor(private db: Database.Database) {
    this.initializeTable();
  }

  private initializeTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        user_id INTEGER,
        username TEXT,
        action TEXT NOT NULL,
        category TEXT NOT NULL,
        severity TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        entity_name TEXT,
        description TEXT NOT NULL,
        changes TEXT,
        metadata TEXT,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        session_id TEXT,
        success INTEGER NOT NULL DEFAULT 1,
        error_message TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
    `);
  }

  /**
   * Log an audit entry
   */
  log(entry: Omit<AuditLog, 'id' | 'timestamp' | 'category' | 'severity'>): number {
    const timestamp = new Date().toISOString();
    const category = getActionCategory(entry.action);
    const severity = getActionSeverity(entry.action);

    const result = this.db
      .prepare(
        `INSERT INTO audit_logs (
          timestamp, user_id, username, action, category, severity,
          entity_type, entity_id, entity_name, description, changes, metadata,
          ip_address, user_agent, session_id, success, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        timestamp,
        entry.userId || null,
        entry.username || null,
        entry.action,
        category,
        severity,
        entry.entityType || null,
        entry.entityId || null,
        entry.entityName || null,
        entry.description,
        entry.changes ? JSON.stringify(entry.changes) : null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ipAddress,
        entry.userAgent,
        entry.sessionId || null,
        entry.success ? 1 : 0,
        entry.errorMessage || null
      );

    return result.lastInsertRowid as number;
  }

  /**
   * Log a simple action
   */
  logAction(
    action: AuditAction,
    description: string,
    options?: {
      userId?: number;
      username?: string;
      entityType?: string;
      entityId?: number;
      entityName?: string;
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      errorMessage?: string;
      metadata?: Record<string, any>;
    }
  ): number {
    return this.log({
      action,
      description,
      userId: options?.userId,
      username: options?.username,
      entityType: options?.entityType,
      entityId: options?.entityId,
      entityName: options?.entityName,
      ipAddress: options?.ipAddress || '127.0.0.1',
      userAgent: options?.userAgent || 'System',
      success: options?.success !== undefined ? options.success : true,
      errorMessage: options?.errorMessage,
      metadata: options?.metadata,
    });
  }

  /**
   * Log data changes with before/after values
   */
  logChange(
    action: AuditAction,
    entityType: string,
    entityId: number,
    entityName: string,
    changes: AuditChange[],
    options?: {
      userId?: number;
      username?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): number {
    const description = `${entityType} "${entityName}" updated: ${changes.map(c => c.field).join(', ')}`;

    return this.log({
      action,
      description,
      entityType,
      entityId,
      entityName,
      changes,
      userId: options?.userId,
      username: options?.username,
      ipAddress: options?.ipAddress || '127.0.0.1',
      userAgent: options?.userAgent || 'System',
      success: true,
      metadata: options?.metadata,
    });
  }

  /**
   * Query audit logs with filters
   */
  query(filters?: AuditFilters): AuditLog[] {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    if (filters?.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }
    if (filters?.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters?.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters?.entityType) {
      query += ' AND entity_type = ?';
      params.push(filters.entityType);
    }
    if (filters?.entityId) {
      query += ' AND entity_id = ?';
      params.push(filters.entityId);
    }
    if (filters?.startDate) {
      query += ' AND timestamp >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += ' AND timestamp <= ?';
      params.push(filters.endDate);
    }
    if (filters?.searchQuery) {
      query += ' AND (description LIKE ? OR entity_name LIKE ? OR username LIKE ?)';
      const searchPattern = `%${filters.searchQuery}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }
    if (filters?.success !== undefined) {
      query += ' AND success = ?';
      params.push(filters.success ? 1 : 0);
    }

    query += ' ORDER BY timestamp DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(this.mapRowToAuditLog);
  }

  /**
   * Get audit log by ID
   */
  getById(id: number): AuditLog | null {
    const row = this.db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as any;
    return row ? this.mapRowToAuditLog(row) : null;
  }

  /**
   * Get audit logs for a specific entity
   */
  getEntityHistory(entityType: string, entityId: number, limit = 50): AuditLog[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM audit_logs 
         WHERE entity_type = ? AND entity_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`
      )
      .all(entityType, entityId, limit) as any[];

    return rows.map(this.mapRowToAuditLog);
  }

  /**
   * Get user activity log
   */
  getUserActivity(userId: number, limit = 100): AuditLog[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM audit_logs 
         WHERE user_id = ? 
         ORDER BY timestamp DESC 
         LIMIT ?`
      )
      .all(userId, limit) as any[];

    return rows.map(this.mapRowToAuditLog);
  }

  /**
   * Generate audit report
   */
  generateReport(filters?: { startDate?: string; endDate?: string }): AuditReport {
    const where = this.buildDateWhere(filters);
    const params = this.buildDateParams(filters);

    // Total entries
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM audit_logs ${where}`)
      .get(...params) as any;
    const totalEntries = totalRow.count;

    // By category
    const categoryRows = this.db
      .prepare(
        `SELECT category, COUNT(*) as count FROM audit_logs ${where} GROUP BY category`
      )
      .all(...params) as any[];
    const byCategory = Object.fromEntries(
      categoryRows.map((r) => [r.category, r.count])
    ) as Record<AuditCategory, number>;

    // By action
    const actionRows = this.db
      .prepare(`SELECT action, COUNT(*) as count FROM audit_logs ${where} GROUP BY action`)
      .all(...params) as any[];
    const byAction = Object.fromEntries(actionRows.map((r) => [r.action, r.count]));

    // By severity
    const severityRows = this.db
      .prepare(
        `SELECT severity, COUNT(*) as count FROM audit_logs ${where} GROUP BY severity`
      )
      .all(...params) as any[];
    const bySeverity = Object.fromEntries(
      severityRows.map((r) => [r.severity, r.count])
    ) as Record<AuditSeverity, number>;

    // By user
    const userRows = this.db
      .prepare(
        `SELECT user_id, username, COUNT(*) as count 
         FROM audit_logs ${where} AND user_id IS NOT NULL
         GROUP BY user_id, username
         ORDER BY count DESC`
      )
      .all(...params) as any[];
    const byUser = userRows.map((r) => ({
      userId: r.user_id,
      username: r.username || 'Unknown',
      count: r.count,
    }));

    // Top actions
    const topActions = actionRows
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((r) => ({ action: r.action as AuditAction, count: r.count }));

    // Failure rate
    const failureRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM audit_logs ${where} AND success = 0`)
      .get(...params) as any;
    const failureRate = totalEntries > 0 ? (failureRow.count / totalEntries) * 100 : 0;

    // Most active users
    const mostActiveUsers = byUser.slice(0, 10).map((u) => ({
      userId: u.userId,
      username: u.username,
      actionCount: u.count,
    }));

    // Most active hours
    const hourRows = this.db
      .prepare(
        `SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hour, COUNT(*) as count
         FROM audit_logs ${where}
         GROUP BY hour
         ORDER BY count DESC`
      )
      .all(...params) as any[];
    const mostActiveHours = hourRows.map((r) => ({ hour: r.hour, count: r.count }));

    return {
      totalEntries,
      dateRange: {
        start: filters?.startDate || 'all time',
        end: filters?.endDate || 'now',
      },
      byCategory,
      byAction,
      bySeverity,
      byUser,
      topActions,
      failureRate,
      mostActiveUsers,
      mostActiveHours,
    };
  }

  /**
   * Generate compliance report
   */
  generateComplianceReport(period?: { start?: string; end?: string }): ComplianceReport {
    const dateFilters = period ? {
      startDate: period.start,
      endDate: period.end
    } : undefined;
    
    const where = this.buildDateWhere(dateFilters);
    const params = this.buildDateParams(dateFilters);

    const totalRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM audit_logs ${where}`)
      .get(...params) as any;

    const securityRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM audit_logs ${where} AND category = 'security'`)
      .get(...params) as any;

    const dataAccessRow = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM audit_logs ${where} AND action LIKE '%downloaded%'`
      )
      .get(...params) as any;

    const dataModRow = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM audit_logs ${where} AND (action LIKE '%updated%' OR action LIKE '%deleted%' OR action LIKE '%created%')`
      )
      .get(...params) as any;

    const loginRow = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM audit_logs ${where} AND action = 'user_logged_in'`
      )
      .get(...params) as any;

    const failedLoginRow = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM security_events ${where.replace('audit_logs', 'security_events')} AND event_type = 'login_failed'`
      )
      .get(...params) as any;

    const permRow = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM audit_logs ${where} AND (action LIKE '%permission%' OR action LIKE '%role%')`
      )
      .get(...params) as any;

    const exportRow = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM audit_logs ${where} AND action = 'data_exported'`
      )
      .get(...params) as any;

    const criticalRow = this.db
      .prepare(`SELECT COUNT(*) as count FROM audit_logs ${where} AND severity = 'critical'`)
      .get(...params) as any;

    // Calculate compliance score (0-100)
    let score = 100;
    const recommendations: string[] = [];

    // Deduct points for security issues
    if (failedLoginRow.count > 10) {
      score -= 10;
      recommendations.push('High number of failed login attempts detected');
    }
    if (criticalRow.count > totalRow.count * 0.05) {
      score -= 15;
      recommendations.push('High percentage of critical events');
    }
    if (exportRow.count > 50) {
      score -= 5;
      recommendations.push('Consider reviewing data export patterns');
    }
    if (securityRow.count < totalRow.count * 0.01) {
      recommendations.push('Good security event coverage');
    }

    return {
      reportDate: new Date().toISOString(),
      period: {
        start: period?.start || 'all time',
        end: period?.end || 'now',
      },
      totalAuditEntries: totalRow.count,
      securityEvents: securityRow.count,
      dataAccessEvents: dataAccessRow.count,
      dataModificationEvents: dataModRow.count,
      userLoginEvents: loginRow.count,
      failedLoginAttempts: failedLoginRow.count || 0,
      permissionChanges: permRow.count,
      dataExports: exportRow.count,
      criticalEvents: criticalRow.count,
      complianceScore: Math.max(0, score),
      recommendations,
    };
  }

  /**
   * Delete old audit logs (for retention policy)
   */
  deleteOldLogs(retentionDays: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = this.db
      .prepare('DELETE FROM audit_logs WHERE timestamp < ?')
      .run(cutoffDate.toISOString());

    return result.changes;
  }

  /**
   * Export audit logs to JSON
   */
  exportToJson(filters?: AuditFilters): string {
    const logs = this.query(filters);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Export audit logs to CSV
   */
  exportToCsv(filters?: AuditFilters): string {
    const logs = this.query(filters);
    if (logs.length === 0) return '';

    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'Username',
      'Action',
      'Category',
      'Severity',
      'Entity Type',
      'Entity ID',
      'Entity Name',
      'Description',
      'Success',
      'IP Address',
    ];

    const rows = logs.map((log) => [
      log.id,
      log.timestamp,
      log.userId || '',
      log.username || '',
      log.action,
      log.category,
      log.severity,
      log.entityType || '',
      log.entityId || '',
      log.entityName || '',
      `"${log.description.replace(/"/g, '""')}"`,
      log.success ? 'Yes' : 'No',
      log.ipAddress,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private mapRowToAuditLog(row: any): AuditLog {
    return {
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      username: row.username,
      action: row.action as AuditAction,
      category: row.category as AuditCategory,
      severity: row.severity as AuditSeverity,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      description: row.description,
      changes: row.changes ? JSON.parse(row.changes) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      sessionId: row.session_id,
      success: row.success === 1,
      errorMessage: row.error_message,
    };
  }

  private buildDateWhere(filters?: { startDate?: string; endDate?: string }): string {
    let where = 'WHERE 1=1';
    if (filters?.startDate) where += ' AND timestamp >= ?';
    if (filters?.endDate) where += ' AND timestamp <= ?';
    return where;
  }

  private buildDateParams(filters?: { startDate?: string; endDate?: string }): any[] {
    const params: any[] = [];
    if (filters?.startDate) params.push(filters.startDate);
    if (filters?.endDate) params.push(filters.endDate);
    return params;
  }
}
