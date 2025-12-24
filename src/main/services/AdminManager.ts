/**
 * AdminManager.ts
 * 
 * Service for administrative controls and system management.
 * Handles user provisioning, bulk operations, license management,
 * workspace quotas, system health monitoring, and admin dashboard.
 */

import Database from 'better-sqlite3';
import {
  UserProvisioningRequest,
  CreateUserProvisioningData,
  UserProvisioningStatus,
  BulkOperation,
  CreateBulkOperationData,
  BulkOperationType,
  BulkOperationStatus,
  License,
  CreateLicenseData,
  UpdateLicenseData,
  LicenseType,
  LicenseStatus,
  WorkspaceQuota,
  WorkspaceQuotaType,
  QuotaUsage,
  SystemHealthMetric,
  SystemHealth,
  SystemHealthStatus,
  AdminDashboardStats,
  AdminUserFilters,
  SystemSettings,
  UpdateSystemSettingData,
  AdminActivityLog,
  DEFAULT_QUOTA_LIMITS,
  DEFAULT_SYSTEM_SETTINGS
} from '../models/Admin';

export class AdminManager {
  constructor(private db: Database.Database) {
    this.initializeTables();
  }

  // ==================== Database Initialization ====================

  private initializeTables(): void {
    // User provisioning table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_provisioning (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        first_name TEXT,
        last_name TEXT,
        role_id INTEGER,
        department_id INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        invitation_sent INTEGER NOT NULL DEFAULT 0,
        invitation_sent_at TEXT,
        activated_at TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        metadata TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_provisioning_status ON user_provisioning(status);
      CREATE INDEX IF NOT EXISTS idx_user_provisioning_created_by ON user_provisioning(created_by);
    `);

    // Bulk operations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bulk_operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        total_items INTEGER NOT NULL,
        processed_items INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        errors TEXT,
        data TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status);
      CREATE INDEX IF NOT EXISTS idx_bulk_operations_created_by ON bulk_operations(created_by);
    `);

    // Licenses table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        max_users INTEGER NOT NULL,
        max_projects INTEGER NOT NULL,
        max_storage INTEGER NOT NULL,
        features TEXT NOT NULL,
        valid_from TEXT NOT NULL,
        valid_until TEXT NOT NULL,
        auto_renew INTEGER NOT NULL DEFAULT 1,
        billing_email TEXT NOT NULL,
        payment_method TEXT,
        last_billing_date TEXT,
        next_billing_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_licenses_organization ON licenses(organization_id);
      CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
    `);

    // Workspace quotas table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspace_quotas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organization_id INTEGER NOT NULL,
        quota_type TEXT NOT NULL,
        limit_value INTEGER NOT NULL,
        used_value INTEGER NOT NULL DEFAULT 0,
        warning_threshold INTEGER NOT NULL DEFAULT 80,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(organization_id, quota_type)
      );
      CREATE INDEX IF NOT EXISTS idx_workspace_quotas_organization ON workspace_quotas(organization_id);
    `);

    // System health metrics table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_health_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        unit TEXT NOT NULL,
        status TEXT NOT NULL,
        threshold REAL NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        details TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_system_health_metric_name ON system_health_metrics(metric_name);
    `);

    // System settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        data_type TEXT NOT NULL DEFAULT 'string',
        description TEXT,
        is_public INTEGER NOT NULL DEFAULT 0,
        updated_by INTEGER,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
    `);

    // Admin activity log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS admin_activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        affected_users TEXT,
        affected_entities TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        metadata TEXT,
        FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_admin_activity_user ON admin_activity_log(admin_user_id);
      CREATE INDEX IF NOT EXISTS idx_admin_activity_timestamp ON admin_activity_log(timestamp);
    `);

    // Initialize default system settings
    this.initializeDefaultSettings();
  }

  private initializeDefaultSettings(): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO system_settings (category, key, value, data_type, description, is_public)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const [key, value] of Object.entries(DEFAULT_SYSTEM_SETTINGS)) {
      const [category, settingKey] = key.split('.');
      const dataType = this.inferDataType(value);
      stmt.run(category, key, value, dataType, null, 0);
    }
  }

  private inferDataType(value: string): string {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!isNaN(Number(value))) return 'number';
    if (value.startsWith('{') || value.startsWith('[')) return 'json';
    return 'string';
  }

  // ==================== User Provisioning ====================

  createProvisioningRequest(data: CreateUserProvisioningData, createdBy: number): UserProvisioningRequest {
    const stmt = this.db.prepare(`
      INSERT INTO user_provisioning (
        email, username, first_name, last_name, role_id, department_id,
        status, invitation_sent, created_by, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.email,
      data.username,
      data.firstName || null,
      data.lastName || null,
      data.roleId || null,
      data.departmentId || null,
      UserProvisioningStatus.Pending,
      data.sendInvitation ? 1 : 0,
      createdBy,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return this.getProvisioningRequest(result.lastInsertRowid as number)!;
  }

  getProvisioningRequest(id: number): UserProvisioningRequest | null {
    const stmt = this.db.prepare('SELECT * FROM user_provisioning WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToProvisioningRequest(row) : null;
  }

  getAllProvisioningRequests(status?: UserProvisioningStatus): UserProvisioningRequest[] {
    let query = 'SELECT * FROM user_provisioning';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToProvisioningRequest(row));
  }

  updateProvisioningStatus(id: number, status: UserProvisioningStatus): void {
    const stmt = this.db.prepare('UPDATE user_provisioning SET status = ? WHERE id = ?');
    stmt.run(status, id);

    if (status === UserProvisioningStatus.Active) {
      const activateStmt = this.db.prepare('UPDATE user_provisioning SET activated_at = datetime(\'now\') WHERE id = ?');
      activateStmt.run(id);
    }
  }

  sendInvitation(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE user_provisioning 
      SET invitation_sent = 1, invitation_sent_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(id);
  }

  deleteProvisioningRequest(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM user_provisioning WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Bulk Operations ====================

  createBulkOperation(data: CreateBulkOperationData, createdBy: number): BulkOperation {
    const stmt = this.db.prepare(`
      INSERT INTO bulk_operations (
        type, entity_type, total_items, created_by, data
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.type,
      data.entityType,
      data.items.length,
      createdBy,
      data.data ? JSON.stringify(data.data) : null
    );

    return this.getBulkOperation(result.lastInsertRowid as number)!;
  }

  getBulkOperation(id: number): BulkOperation | null {
    const stmt = this.db.prepare('SELECT * FROM bulk_operations WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToBulkOperation(row) : null;
  }

  updateBulkOperationProgress(id: number, processed: number, succeeded: number, failed: number): void {
    const stmt = this.db.prepare(`
      UPDATE bulk_operations 
      SET processed_items = ?, success_count = ?, failure_count = ?
      WHERE id = ?
    `);
    stmt.run(processed, succeeded, failed, id);
  }

  startBulkOperation(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE bulk_operations 
      SET status = ?, started_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(BulkOperationStatus.Running, id);
  }

  completeBulkOperation(id: number, errors?: Array<{ index: number; error: string }>): void {
    const operation = this.getBulkOperation(id);
    if (!operation) return;

    const status = errors && errors.length > 0
      ? (operation.successCount > 0 ? BulkOperationStatus.PartialSuccess : BulkOperationStatus.Failed)
      : BulkOperationStatus.Completed;

    const stmt = this.db.prepare(`
      UPDATE bulk_operations 
      SET status = ?, completed_at = datetime('now'), errors = ?
      WHERE id = ?
    `);
    stmt.run(status, errors ? JSON.stringify(errors) : null, id);
  }

  // ==================== License Management ====================

  createLicense(data: CreateLicenseData): License {
    const stmt = this.db.prepare(`
      INSERT INTO licenses (
        organization_id, type, max_users, max_projects, max_storage,
        features, valid_from, valid_until, auto_renew, billing_email, payment_method
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.organizationId,
      data.type,
      data.maxUsers,
      data.maxProjects,
      data.maxStorage,
      JSON.stringify(data.features),
      data.validFrom.toISOString(),
      data.validUntil.toISOString(),
      data.autoRenew ? 1 : 0,
      data.billingEmail,
      data.paymentMethod || null
    );

    return this.getLicense(result.lastInsertRowid as number)!;
  }

  getLicense(id: number): License | null {
    const stmt = this.db.prepare('SELECT * FROM licenses WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToLicense(row) : null;
  }

  getActiveLicenseByOrganization(organizationId: number): License | null {
    const stmt = this.db.prepare(`
      SELECT * FROM licenses 
      WHERE organization_id = ? AND status = ? 
      ORDER BY valid_until DESC 
      LIMIT 1
    `);
    const row = stmt.get(organizationId, LicenseStatus.Active);
    return row ? this.mapRowToLicense(row) : null;
  }

  updateLicense(id: number, data: UpdateLicenseData): License | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.type !== undefined) {
      updates.push('type = ?');
      values.push(data.type);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.maxUsers !== undefined) {
      updates.push('max_users = ?');
      values.push(data.maxUsers);
    }
    if (data.maxProjects !== undefined) {
      updates.push('max_projects = ?');
      values.push(data.maxProjects);
    }
    if (data.maxStorage !== undefined) {
      updates.push('max_storage = ?');
      values.push(data.maxStorage);
    }
    if (data.features !== undefined) {
      updates.push('features = ?');
      values.push(JSON.stringify(data.features));
    }
    if (data.validUntil !== undefined) {
      updates.push('valid_until = ?');
      values.push(data.validUntil.toISOString());
    }
    if (data.autoRenew !== undefined) {
      updates.push('auto_renew = ?');
      values.push(data.autoRenew ? 1 : 0);
    }
    if (data.billingEmail !== undefined) {
      updates.push('billing_email = ?');
      values.push(data.billingEmail);
    }
    if (data.paymentMethod !== undefined) {
      updates.push('payment_method = ?');
      values.push(data.paymentMethod);
    }

    if (updates.length === 0) return this.getLicense(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE licenses SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getLicense(id);
  }

  checkExpiringLicenses(daysThreshold: number): License[] {
    const stmt = this.db.prepare(`
      SELECT * FROM licenses 
      WHERE status = ? 
      AND julianday(valid_until) - julianday('now') <= ? 
      AND julianday(valid_until) - julianday('now') > 0
    `);
    const rows = stmt.all(LicenseStatus.Active, daysThreshold);
    return rows.map(row => this.mapRowToLicense(row));
  }

  // ==================== Workspace Quotas ====================

  initializeQuotasForOrganization(organizationId: number, licenseType: LicenseType): void {
    const quotaLimits = DEFAULT_QUOTA_LIMITS[licenseType];

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workspace_quotas (organization_id, quota_type, limit_value, used_value, warning_threshold)
      VALUES (?, ?, ?, 0, 80)
    `);

    for (const [quotaType, limit] of Object.entries(quotaLimits)) {
      stmt.run(organizationId, quotaType, limit);
    }
  }

  getQuotaUsage(organizationId: number, quotaType: WorkspaceQuotaType): QuotaUsage | null {
    const stmt = this.db.prepare(`
      SELECT * FROM workspace_quotas 
      WHERE organization_id = ? AND quota_type = ?
    `);
    const row = stmt.get(organizationId, quotaType) as any;
    if (!row) return null;

    const limit = row.limit_value;
    const used = row.used_value;
    const percentage = limit > 0 ? (used / limit) * 100 : 0;
    const warningThreshold = row.warning_threshold;

    return {
      quotaType,
      limit,
      used,
      percentage,
      isWarning: percentage >= warningThreshold,
      isExceeded: limit > 0 && used >= limit
    };
  }

  getAllQuotaUsages(organizationId: number): QuotaUsage[] {
    const quotaTypes = Object.values(WorkspaceQuotaType);
    return quotaTypes
      .map(type => this.getQuotaUsage(organizationId, type))
      .filter((quota): quota is QuotaUsage => quota !== null);
  }

  updateQuotaUsage(organizationId: number, quotaType: WorkspaceQuotaType, used: number): void {
    const stmt = this.db.prepare(`
      UPDATE workspace_quotas 
      SET used_value = ?, updated_at = datetime('now')
      WHERE organization_id = ? AND quota_type = ?
    `);
    stmt.run(used, organizationId, quotaType);
  }

  incrementQuotaUsage(organizationId: number, quotaType: WorkspaceQuotaType, increment: number = 1): void {
    const stmt = this.db.prepare(`
      UPDATE workspace_quotas 
      SET used_value = used_value + ?, updated_at = datetime('now')
      WHERE organization_id = ? AND quota_type = ?
    `);
    stmt.run(increment, organizationId, quotaType);
  }

  decrementQuotaUsage(organizationId: number, quotaType: WorkspaceQuotaType, decrement: number = 1): void {
    const stmt = this.db.prepare(`
      UPDATE workspace_quotas 
      SET used_value = MAX(0, used_value - ?), updated_at = datetime('now')
      WHERE organization_id = ? AND quota_type = ?
    `);
    stmt.run(decrement, organizationId, quotaType);
  }

  // ==================== System Health Monitoring ====================

  recordHealthMetric(metric: Omit<SystemHealthMetric, 'id' | 'timestamp'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO system_health_metrics (metric_name, metric_value, unit, status, threshold, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      metric.metricName,
      metric.metricValue,
      metric.unit,
      metric.status,
      metric.threshold,
      metric.details ? JSON.stringify(metric.details) : null
    );
  }

  getSystemHealth(): SystemHealth {
    // This is a simplified implementation - in production, you'd gather real metrics
    const dbSize = this.getDatabaseSize();
    
    return {
      status: SystemHealthStatus.Healthy,
      uptime: process.uptime(),
      cpu: {
        usage: 0, // Would use os.loadavg() in production
        status: SystemHealthStatus.Healthy
      },
      memory: {
        total: 0, // Would use os.totalmem() in production
        used: 0, // Would use process.memoryUsage() in production
        percentage: 0,
        status: SystemHealthStatus.Healthy
      },
      disk: {
        total: 0, // Would use disk space check in production
        used: 0,
        percentage: 0,
        status: SystemHealthStatus.Healthy
      },
      database: {
        size: dbSize,
        connections: 1, // SQLite has single connection
        status: SystemHealthStatus.Healthy
      },
      apiServer: {
        requestsPerMinute: 0,
        averageResponseTime: 0,
        errorRate: 0,
        status: SystemHealthStatus.Healthy
      },
      timestamp: new Date()
    };
  }

  private getDatabaseSize(): number {
    const stmt = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");
    const result = stmt.get() as any;
    return Math.round((result?.size || 0) / (1024 * 1024)); // Convert to MB
  }

  getHealthMetricHistory(metricName: string, hours: number = 24): SystemHealthMetric[] {
    const stmt = this.db.prepare(`
      SELECT * FROM system_health_metrics 
      WHERE metric_name = ? 
      AND timestamp >= datetime('now', '-' || ? || ' hours')
      ORDER BY timestamp DESC
    `);
    const rows = stmt.all(metricName, hours);
    return rows.map(row => this.mapRowToHealthMetric(row));
  }

  cleanupOldHealthMetrics(retentionDays: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM system_health_metrics 
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `);
    const result = stmt.run(retentionDays);
    return result.changes;
  }

  // ==================== Admin Dashboard ====================

  getDashboardStats(organizationId: number = 1): AdminDashboardStats {
    // Users stats
    const userStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
        SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as new_week,
        SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) as new_month
      FROM users
    `).get() as any;

    // Projects stats
    const projectStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
      FROM projects
    `).get() as any;

    // Tasks stats
    const taskStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN due_date < datetime('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
      FROM tasks
    `).get() as any;

    // Storage stats
    const storageStats = this.db.prepare(`
      SELECT 
        COUNT(*) as attachment_count,
        COALESCE(SUM(file_size), 0) as total_size
      FROM attachments
    `).get() as any;

    const dbSize = this.getDatabaseSize();
    const license = this.getActiveLicenseByOrganization(organizationId);

    // Activity stats
    const activityStats = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT CASE WHEN timestamp >= datetime('now', 'start of day') THEN user_id END) as today_logins,
        COUNT(CASE WHEN timestamp >= datetime('now', 'start of day') THEN 1 END) as today_actions,
        COUNT(DISTINCT CASE WHEN timestamp >= datetime('now', '-7 days') THEN user_id END) as weekly_active,
        COUNT(DISTINCT CASE WHEN timestamp >= datetime('now', '-30 days') THEN user_id END) as monthly_active
      FROM audit_logs
    `).get() as any;

    const systemHealth = this.getSystemHealth();

    return {
      users: {
        total: userStats.total || 0,
        active: userStats.active || 0,
        suspended: userStats.suspended || 0,
        newThisWeek: userStats.new_week || 0,
        newThisMonth: userStats.new_month || 0
      },
      projects: {
        total: projectStats.total || 0,
        active: projectStats.active || 0,
        completed: projectStats.completed || 0,
        archived: projectStats.archived || 0
      },
      tasks: {
        total: taskStats.total || 0,
        open: taskStats.open || 0,
        inProgress: taskStats.in_progress || 0,
        completed: taskStats.completed || 0,
        overdue: taskStats.overdue || 0
      },
      storage: {
        total: license?.maxStorage || 0,
        used: Math.round((storageStats.total_size || 0) / (1024 * 1024)) + dbSize,
        percentage: license?.maxStorage ? ((storageStats.total_size || 0) / (1024 * 1024) + dbSize) / license.maxStorage * 100 : 0,
        attachments: storageStats.attachment_count || 0
      },
      license: license ? {
        type: license.type,
        status: license.status,
        usersUsed: userStats.total || 0,
        usersLimit: license.maxUsers,
        projectsUsed: projectStats.total || 0,
        projectsLimit: license.maxProjects,
        daysUntilExpiry: Math.ceil((new Date(license.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      } : {
        type: LicenseType.Free,
        status: LicenseStatus.Active,
        usersUsed: 0,
        usersLimit: 5,
        projectsUsed: 0,
        projectsLimit: 3,
        daysUntilExpiry: 0
      },
      activity: {
        todayLogins: activityStats.today_logins || 0,
        todayActions: activityStats.today_actions || 0,
        weeklyActiveUsers: activityStats.weekly_active || 0,
        monthlyActiveUsers: activityStats.monthly_active || 0
      },
      systemHealth: systemHealth.status
    };
  }

  // ==================== System Settings ====================

  getSystemSetting(key: string): SystemSettings | null {
    const stmt = this.db.prepare('SELECT * FROM system_settings WHERE key = ?');
    const row = stmt.get(key);
    return row ? this.mapRowToSystemSetting(row) : null;
  }

  getAllSystemSettings(category?: string, publicOnly: boolean = false): SystemSettings[] {
    let query = 'SELECT * FROM system_settings';
    const params: any[] = [];

    const conditions: string[] = [];
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (publicOnly) {
      conditions.push('is_public = 1');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY category, key';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToSystemSetting(row));
  }

  updateSystemSetting(key: string, data: UpdateSystemSettingData): SystemSettings | null {
    const stmt = this.db.prepare(`
      UPDATE system_settings 
      SET value = ?, updated_by = ?, updated_at = datetime('now')
      WHERE key = ?
    `);
    stmt.run(data.value, data.updatedBy, key);

    return this.getSystemSetting(key);
  }

  // ==================== Admin Activity Logging ====================

  logAdminActivity(
    adminUserId: number,
    action: string,
    description: string,
    options?: {
      affectedUsers?: number[];
      affectedEntities?: Array<{ type: string; id: number }>;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO admin_activity_log (
        admin_user_id, action, description, affected_users, affected_entities,
        ip_address, user_agent, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      adminUserId,
      action,
      description,
      options?.affectedUsers ? JSON.stringify(options.affectedUsers) : null,
      options?.affectedEntities ? JSON.stringify(options.affectedEntities) : null,
      options?.ipAddress || null,
      options?.userAgent || null,
      options?.metadata ? JSON.stringify(options.metadata) : null
    );
  }

  getAdminActivityLog(adminUserId?: number, limit: number = 100): AdminActivityLog[] {
    let query = 'SELECT * FROM admin_activity_log';
    const params: any[] = [];

    if (adminUserId) {
      query += ' WHERE admin_user_id = ?';
      params.push(adminUserId);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToAdminActivityLog(row));
  }

  // ==================== Helper Methods ====================

  private mapRowToProvisioningRequest(row: any): UserProvisioningRequest {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      roleId: row.role_id,
      departmentId: row.department_id,
      status: row.status as UserProvisioningStatus,
      invitationSent: row.invitation_sent === 1,
      invitationSentAt: row.invitation_sent_at ? new Date(row.invitation_sent_at) : null,
      activatedAt: row.activated_at ? new Date(row.activated_at) : null,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  private mapRowToBulkOperation(row: any): BulkOperation {
    return {
      id: row.id,
      type: row.type as BulkOperationType,
      entityType: row.entity_type,
      status: row.status as BulkOperationStatus,
      totalItems: row.total_items,
      processedItems: row.processed_items,
      successCount: row.success_count,
      failureCount: row.failure_count,
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      errors: row.errors ? JSON.parse(row.errors) : null,
      data: row.data ? JSON.parse(row.data) : null
    };
  }

  private mapRowToLicense(row: any): License {
    return {
      id: row.id,
      organizationId: row.organization_id,
      type: row.type as LicenseType,
      status: row.status as LicenseStatus,
      maxUsers: row.max_users,
      maxProjects: row.max_projects,
      maxStorage: row.max_storage,
      features: JSON.parse(row.features),
      validFrom: new Date(row.valid_from),
      validUntil: new Date(row.valid_until),
      autoRenew: row.auto_renew === 1,
      billingEmail: row.billing_email,
      paymentMethod: row.payment_method,
      lastBillingDate: row.last_billing_date ? new Date(row.last_billing_date) : null,
      nextBillingDate: row.next_billing_date ? new Date(row.next_billing_date) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToHealthMetric(row: any): SystemHealthMetric {
    return {
      id: row.id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      unit: row.unit,
      status: row.status as SystemHealthStatus,
      threshold: row.threshold,
      timestamp: new Date(row.timestamp),
      details: row.details ? JSON.parse(row.details) : null
    };
  }

  private mapRowToSystemSetting(row: any): SystemSettings {
    return {
      id: row.id,
      category: row.category,
      key: row.key,
      value: row.value,
      dataType: row.data_type as 'string' | 'number' | 'boolean' | 'json',
      description: row.description,
      isPublic: row.is_public === 1,
      updatedBy: row.updated_by,
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToAdminActivityLog(row: any): AdminActivityLog {
    return {
      id: row.id,
      adminUserId: row.admin_user_id,
      action: row.action,
      description: row.description,
      affectedUsers: row.affected_users ? JSON.parse(row.affected_users) : [],
      affectedEntities: row.affected_entities ? JSON.parse(row.affected_entities) : [],
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }
}
