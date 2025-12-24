/**
 * IntegrationManager.ts
 * 
 * Service for managing enterprise integrations including LDAP/AD sync,
 * SSO providers, webhooks, rate limiting, and data import/export.
 */

import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import {
  Integration,
  CreateIntegrationData,
  UpdateIntegrationData,
  IntegrationType,
  IntegrationStatus,
  SyncDirection,
  Webhook,
  CreateWebhookData,
  UpdateWebhookData,
  WebhookEvent,
  WebhookDelivery,
  SyncJob,
  SyncJobFilters,
  SyncStatus,
  RateLimitConfig,
  CreateRateLimitData,
  RateLimitState,
  RateLimitStrategy,
  ImportExportJob,
  CreateImportExportJobData,
  ImportExportStatus,
  ImportExportFormat,
  ExternalService,
  IntegrationEvent,
  DEFAULT_WEBHOOK_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG
} from '../models/Integration';

export class IntegrationManager {
  constructor(private db: Database.Database) {
    this.initializeTables();
  }

  // ==================== Database Initialization ====================

  private initializeTables(): void {
    // Integrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS integrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'inactive',
        config TEXT NOT NULL,
        credentials TEXT,
        sync_enabled INTEGER NOT NULL DEFAULT 0,
        sync_direction TEXT,
        sync_frequency INTEGER,
        last_sync_at TEXT,
        next_sync_at TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        metadata TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
      CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
    `);

    // Webhooks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        secret TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        headers TEXT,
        retry_attempts INTEGER NOT NULL DEFAULT 3,
        retry_delay INTEGER NOT NULL DEFAULT 60,
        timeout INTEGER NOT NULL DEFAULT 30,
        last_triggered_at TEXT,
        last_status INTEGER,
        last_error TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);
    `);

    // Webhook deliveries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webhook_id INTEGER NOT NULL,
        event TEXT NOT NULL,
        payload TEXT NOT NULL,
        status INTEGER NOT NULL,
        duration INTEGER NOT NULL,
        attempt INTEGER NOT NULL,
        response TEXT,
        error TEXT,
        delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at);
    `);

    // Sync jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        integration_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'idle',
        direction TEXT NOT NULL,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        items_processed INTEGER NOT NULL DEFAULT 0,
        items_created INTEGER NOT NULL DEFAULT 0,
        items_updated INTEGER NOT NULL DEFAULT 0,
        items_failed INTEGER NOT NULL DEFAULT 0,
        errors TEXT,
        summary TEXT,
        FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration ON sync_jobs(integration_id);
      CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_sync_jobs_started_at ON sync_jobs(started_at);
    `);

    // Rate limit configs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limit_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_key_id INTEGER,
        user_id INTEGER,
        organization_id INTEGER,
        strategy TEXT NOT NULL,
        max_requests INTEGER NOT NULL,
        window_size INTEGER NOT NULL,
        burst_size INTEGER,
        refill_rate REAL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limit_api_key ON rate_limit_configs(api_key_id);
      CREATE INDEX IF NOT EXISTS idx_rate_limit_user ON rate_limit_configs(user_id);
      CREATE INDEX IF NOT EXISTS idx_rate_limit_org ON rate_limit_configs(organization_id);
    `);

    // Rate limit state table (in-memory tracking)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limit_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_id INTEGER NOT NULL UNIQUE,
        requests INTEGER NOT NULL DEFAULT 0,
        reset_at TEXT NOT NULL,
        tokens REAL,
        last_refill TEXT,
        FOREIGN KEY (config_id) REFERENCES rate_limit_configs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rate_limit_state_config ON rate_limit_state(config_id);
    `);

    // Import/Export jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS import_export_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        format TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        file_path TEXT NOT NULL,
        total_records INTEGER,
        processed_records INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        errors TEXT,
        mapping TEXT,
        options TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        started_at TEXT,
        completed_at TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_import_export_status ON import_export_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_import_export_type ON import_export_jobs(type);
    `);

    // External services table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS external_services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        integration_id INTEGER NOT NULL,
        service_type TEXT NOT NULL,
        account_id TEXT NOT NULL,
        account_name TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TEXT,
        scopes TEXT NOT NULL,
        features TEXT NOT NULL,
        config TEXT NOT NULL,
        last_sync_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_external_services_integration ON external_services(integration_id);
    `);

    // Integration events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS integration_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        integration_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_data TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_integration_events_integration ON integration_events(integration_id);
      CREATE INDEX IF NOT EXISTS idx_integration_events_timestamp ON integration_events(timestamp);
    `);
  }

  // ==================== Integrations ====================

  createIntegration(data: CreateIntegrationData, createdBy: number): Integration {
    const stmt = this.db.prepare(`
      INSERT INTO integrations (
        name, type, config, credentials, sync_enabled, sync_direction, 
        sync_frequency, created_by, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.type,
      JSON.stringify(data.config),
      data.credentials ? JSON.stringify(data.credentials) : null,
      data.syncEnabled ? 1 : 0,
      data.syncDirection || null,
      data.syncFrequency || null,
      createdBy,
      null
    );

    return this.getIntegration(result.lastInsertRowid as number)!;
  }

  getIntegration(id: number): Integration | null {
    const stmt = this.db.prepare('SELECT * FROM integrations WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToIntegration(row) : null;
  }

  getAllIntegrations(type?: IntegrationType, status?: IntegrationStatus): Integration[] {
    let query = 'SELECT * FROM integrations WHERE 1=1';
    const params: any[] = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToIntegration(row));
  }

  updateIntegration(id: number, data: UpdateIntegrationData): Integration | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(data.config));
    }
    if (data.credentials !== undefined) {
      updates.push('credentials = ?');
      values.push(data.credentials ? JSON.stringify(data.credentials) : null);
    }
    if (data.syncEnabled !== undefined) {
      updates.push('sync_enabled = ?');
      values.push(data.syncEnabled ? 1 : 0);
    }
    if (data.syncDirection !== undefined) {
      updates.push('sync_direction = ?');
      values.push(data.syncDirection);
    }
    if (data.syncFrequency !== undefined) {
      updates.push('sync_frequency = ?');
      values.push(data.syncFrequency);
    }

    if (updates.length === 0) return this.getIntegration(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE integrations SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getIntegration(id);
  }

  deleteIntegration(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM integrations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  updateLastSync(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE integrations 
      SET last_sync_at = datetime('now'),
          next_sync_at = datetime('now', '+' || sync_frequency || ' minutes')
      WHERE id = ?
    `);
    stmt.run(id);
  }

  // ==================== Webhooks ====================

  createWebhook(data: CreateWebhookData, createdBy: number): Webhook {
    const stmt = this.db.prepare(`
      INSERT INTO webhooks (
        name, url, events, secret, headers, retry_attempts, retry_delay, timeout, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.url,
      JSON.stringify(data.events),
      data.secret || crypto.randomBytes(32).toString('hex'),
      data.headers ? JSON.stringify(data.headers) : null,
      data.retryAttempts ?? DEFAULT_WEBHOOK_CONFIG.retryAttempts,
      data.retryDelay ?? DEFAULT_WEBHOOK_CONFIG.retryDelay,
      data.timeout ?? DEFAULT_WEBHOOK_CONFIG.timeout,
      createdBy
    );

    return this.getWebhook(result.lastInsertRowid as number)!;
  }

  getWebhook(id: number): Webhook | null {
    const stmt = this.db.prepare('SELECT * FROM webhooks WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToWebhook(row) : null;
  }

  getAllWebhooks(activeOnly: boolean = false): Webhook[] {
    let query = 'SELECT * FROM webhooks';
    if (activeOnly) {
      query += ' WHERE active = 1';
    }
    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all();
    return rows.map(row => this.mapRowToWebhook(row));
  }

  getWebhooksByEvent(event: WebhookEvent): Webhook[] {
    const stmt = this.db.prepare(`
      SELECT * FROM webhooks 
      WHERE active = 1 
      AND (events LIKE ? OR events LIKE ?)
    `);
    const rows = stmt.all(`%"${event}"%`, `%"*"%`);
    return rows.map(row => this.mapRowToWebhook(row));
  }

  updateWebhook(id: number, data: UpdateWebhookData): Webhook | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.url !== undefined) {
      updates.push('url = ?');
      values.push(data.url);
    }
    if (data.events !== undefined) {
      updates.push('events = ?');
      values.push(JSON.stringify(data.events));
    }
    if (data.secret !== undefined) {
      updates.push('secret = ?');
      values.push(data.secret);
    }
    if (data.active !== undefined) {
      updates.push('active = ?');
      values.push(data.active ? 1 : 0);
    }
    if (data.headers !== undefined) {
      updates.push('headers = ?');
      values.push(data.headers ? JSON.stringify(data.headers) : null);
    }
    if (data.retryAttempts !== undefined) {
      updates.push('retry_attempts = ?');
      values.push(data.retryAttempts);
    }
    if (data.retryDelay !== undefined) {
      updates.push('retry_delay = ?');
      values.push(data.retryDelay);
    }
    if (data.timeout !== undefined) {
      updates.push('timeout = ?');
      values.push(data.timeout);
    }

    if (updates.length === 0) return this.getWebhook(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE webhooks SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getWebhook(id);
  }

  deleteWebhook(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM webhooks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  recordWebhookDelivery(delivery: Omit<WebhookDelivery, 'id' | 'deliveredAt'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO webhook_deliveries (
        webhook_id, event, payload, status, duration, attempt, response, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      delivery.webhookId,
      delivery.event,
      JSON.stringify(delivery.payload),
      delivery.status,
      delivery.duration,
      delivery.attempt,
      delivery.response,
      delivery.error
    );

    // Update webhook last triggered info
    const updateStmt = this.db.prepare(`
      UPDATE webhooks 
      SET last_triggered_at = datetime('now'), last_status = ?, last_error = ?
      WHERE id = ?
    `);
    updateStmt.run(delivery.status, delivery.error, delivery.webhookId);
  }

  getWebhookDeliveries(webhookId: number, limit: number = 100): WebhookDelivery[] {
    const stmt = this.db.prepare(`
      SELECT * FROM webhook_deliveries 
      WHERE webhook_id = ? 
      ORDER BY delivered_at DESC 
      LIMIT ?
    `);
    const rows = stmt.all(webhookId, limit);
    return rows.map(row => this.mapRowToWebhookDelivery(row));
  }

  // ==================== Sync Jobs ====================

  createSyncJob(integrationId: number, direction: SyncDirection): SyncJob {
    const stmt = this.db.prepare(`
      INSERT INTO sync_jobs (integration_id, direction, status)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(integrationId, direction, SyncStatus.Running);
    return this.getSyncJob(result.lastInsertRowid as number)!;
  }

  getSyncJob(id: number): SyncJob | null {
    const stmt = this.db.prepare('SELECT * FROM sync_jobs WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToSyncJob(row) : null;
  }

  querySyncJobs(filters: SyncJobFilters): SyncJob[] {
    let query = 'SELECT * FROM sync_jobs WHERE 1=1';
    const params: any[] = [];

    if (filters.integrationId) {
      query += ' AND integration_id = ?';
      params.push(filters.integrationId);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.startedAfter) {
      query += ' AND started_at >= ?';
      params.push(filters.startedAfter.toISOString());
    }
    if (filters.startedBefore) {
      query += ' AND started_at <= ?';
      params.push(filters.startedBefore.toISOString());
    }

    query += ' ORDER BY started_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToSyncJob(row));
  }

  updateSyncJobProgress(
    id: number,
    processed: number,
    created: number,
    updated: number,
    failed: number
  ): void {
    const stmt = this.db.prepare(`
      UPDATE sync_jobs 
      SET items_processed = ?, items_created = ?, items_updated = ?, items_failed = ?
      WHERE id = ?
    `);
    stmt.run(processed, created, updated, failed, id);
  }

  completeSyncJob(
    id: number,
    status: SyncStatus,
    errors?: Array<{ item: string; error: string }>,
    summary?: Record<string, any>
  ): void {
    const stmt = this.db.prepare(`
      UPDATE sync_jobs 
      SET status = ?, completed_at = datetime('now'), errors = ?, summary = ?
      WHERE id = ?
    `);
    stmt.run(
      status,
      errors ? JSON.stringify(errors) : null,
      summary ? JSON.stringify(summary) : null,
      id
    );
  }

  // ==================== Rate Limiting ====================

  createRateLimitConfig(data: CreateRateLimitData): RateLimitConfig {
    const stmt = this.db.prepare(`
      INSERT INTO rate_limit_configs (
        api_key_id, user_id, organization_id, strategy, max_requests, window_size,
        burst_size, refill_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.apiKeyId || null,
      data.userId || null,
      data.organizationId || null,
      data.strategy,
      data.maxRequests,
      data.windowSize,
      data.burstSize || null,
      data.refillRate || null
    );

    return this.getRateLimitConfig(result.lastInsertRowid as number)!;
  }

  getRateLimitConfig(id: number): RateLimitConfig | null {
    const stmt = this.db.prepare('SELECT * FROM rate_limit_configs WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToRateLimitConfig(row) : null;
  }

  getRateLimitByApiKey(apiKeyId: number): RateLimitConfig | null {
    const stmt = this.db.prepare('SELECT * FROM rate_limit_configs WHERE api_key_id = ? AND enabled = 1');
    const row = stmt.get(apiKeyId);
    return row ? this.mapRowToRateLimitConfig(row) : null;
  }

  checkRateLimit(configId: number): { allowed: boolean; resetAt: Date; remaining: number } {
    const config = this.getRateLimitConfig(configId);
    if (!config || !config.enabled) {
      return { allowed: true, resetAt: new Date(), remaining: -1 };
    }

    const state = this.getRateLimitState(configId);
    const now = new Date();

    if (config.strategy === RateLimitStrategy.FixedWindow) {
      if (now >= state.resetAt) {
        // Window expired, reset
        this.resetRateLimitState(configId, config.windowSize);
        return { allowed: true, resetAt: new Date(now.getTime() + config.windowSize * 1000), remaining: config.maxRequests - 1 };
      }

      if (state.requests >= config.maxRequests) {
        return { allowed: false, resetAt: state.resetAt, remaining: 0 };
      }

      this.incrementRateLimitState(configId);
      return { allowed: true, resetAt: state.resetAt, remaining: config.maxRequests - state.requests - 1 };
    }

    // Simplified - other strategies would be implemented similarly
    return { allowed: true, resetAt: new Date(), remaining: -1 };
  }

  private getRateLimitState(configId: number): RateLimitState {
    const stmt = this.db.prepare('SELECT * FROM rate_limit_state WHERE config_id = ?');
    let row = stmt.get(configId) as any;

    if (!row) {
      // Initialize state
      const insertStmt = this.db.prepare(`
        INSERT INTO rate_limit_state (config_id, requests, reset_at)
        VALUES (?, 0, datetime('now', '+1 hour'))
      `);
      insertStmt.run(configId);
      row = stmt.get(configId) as any;
    }

    return {
      requests: row.requests,
      resetAt: new Date(row.reset_at),
      tokens: row.tokens,
      lastRefill: row.last_refill ? new Date(row.last_refill) : null
    };
  }

  private resetRateLimitState(configId: number, windowSize: number): void {
    const stmt = this.db.prepare(`
      UPDATE rate_limit_state 
      SET requests = 0, reset_at = datetime('now', '+' || ? || ' seconds')
      WHERE config_id = ?
    `);
    stmt.run(windowSize, configId);
  }

  private incrementRateLimitState(configId: number): void {
    const stmt = this.db.prepare(`
      UPDATE rate_limit_state 
      SET requests = requests + 1
      WHERE config_id = ?
    `);
    stmt.run(configId);
  }

  // ==================== Import/Export ====================

  createImportExportJob(data: CreateImportExportJobData, createdBy: number): ImportExportJob {
    const stmt = this.db.prepare(`
      INSERT INTO import_export_jobs (
        type, format, entity_type, file_path, mapping, options, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.type,
      data.format,
      data.entityType,
      data.filePath,
      data.mapping ? JSON.stringify(data.mapping) : null,
      data.options ? JSON.stringify(data.options) : null,
      createdBy
    );

    return this.getImportExportJob(result.lastInsertRowid as number)!;
  }

  getImportExportJob(id: number): ImportExportJob | null {
    const stmt = this.db.prepare('SELECT * FROM import_export_jobs WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToImportExportJob(row) : null;
  }

  startImportExportJob(id: number, totalRecords?: number): void {
    const stmt = this.db.prepare(`
      UPDATE import_export_jobs 
      SET status = ?, started_at = datetime('now'), total_records = ?
      WHERE id = ?
    `);
    stmt.run(ImportExportStatus.Processing, totalRecords || null, id);
  }

  updateImportExportProgress(id: number, processed: number, succeeded: number, failed: number): void {
    const stmt = this.db.prepare(`
      UPDATE import_export_jobs 
      SET processed_records = ?, success_count = ?, failure_count = ?
      WHERE id = ?
    `);
    stmt.run(processed, succeeded, failed, id);
  }

  completeImportExportJob(id: number, errors?: Array<{ row: number; error: string }>): void {
    const job = this.getImportExportJob(id);
    if (!job) return;

    const status = errors && errors.length > 0 && job.successCount === 0
      ? ImportExportStatus.Failed
      : ImportExportStatus.Completed;

    const stmt = this.db.prepare(`
      UPDATE import_export_jobs 
      SET status = ?, completed_at = datetime('now'), errors = ?
      WHERE id = ?
    `);
    stmt.run(status, errors ? JSON.stringify(errors) : null, id);
  }

  // ==================== Integration Events ====================

  logIntegrationEvent(
    integrationId: number,
    eventType: string,
    eventData: Record<string, any>,
    status: 'success' | 'error' | 'warning',
    message: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO integration_events (integration_id, event_type, event_data, status, message)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(integrationId, eventType, JSON.stringify(eventData), status, message);
  }

  getIntegrationEvents(integrationId: number, limit: number = 100): IntegrationEvent[] {
    const stmt = this.db.prepare(`
      SELECT * FROM integration_events 
      WHERE integration_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const rows = stmt.all(integrationId, limit);
    return rows.map(row => this.mapRowToIntegrationEvent(row));
  }

  // ==================== Helper Methods ====================

  private mapRowToIntegration(row: any): Integration {
    return {
      id: row.id,
      name: row.name,
      type: row.type as IntegrationType,
      status: row.status as IntegrationStatus,
      config: JSON.parse(row.config),
      credentials: row.credentials ? JSON.parse(row.credentials) : null,
      syncEnabled: row.sync_enabled === 1,
      syncDirection: row.sync_direction as SyncDirection | null,
      syncFrequency: row.sync_frequency,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : null,
      nextSyncAt: row.next_sync_at ? new Date(row.next_sync_at) : null,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  private mapRowToWebhook(row: any): Webhook {
    return {
      id: row.id,
      name: row.name,
      url: row.url,
      events: JSON.parse(row.events),
      secret: row.secret,
      active: row.active === 1,
      headers: row.headers ? JSON.parse(row.headers) : null,
      retryAttempts: row.retry_attempts,
      retryDelay: row.retry_delay,
      timeout: row.timeout,
      lastTriggeredAt: row.last_triggered_at ? new Date(row.last_triggered_at) : null,
      lastStatus: row.last_status,
      lastError: row.last_error,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToWebhookDelivery(row: any): WebhookDelivery {
    return {
      id: row.id,
      webhookId: row.webhook_id,
      event: row.event as WebhookEvent,
      payload: JSON.parse(row.payload),
      status: row.status,
      duration: row.duration,
      attempt: row.attempt,
      response: row.response,
      error: row.error,
      deliveredAt: new Date(row.delivered_at)
    };
  }

  private mapRowToSyncJob(row: any): SyncJob {
    return {
      id: row.id,
      integrationId: row.integration_id,
      status: row.status as SyncStatus,
      direction: row.direction as SyncDirection,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      itemsProcessed: row.items_processed,
      itemsCreated: row.items_created,
      itemsUpdated: row.items_updated,
      itemsFailed: row.items_failed,
      errors: row.errors ? JSON.parse(row.errors) : null,
      summary: row.summary ? JSON.parse(row.summary) : null
    };
  }

  private mapRowToRateLimitConfig(row: any): RateLimitConfig {
    return {
      id: row.id,
      apiKeyId: row.api_key_id,
      userId: row.user_id,
      organizationId: row.organization_id,
      strategy: row.strategy as RateLimitStrategy,
      maxRequests: row.max_requests,
      windowSize: row.window_size,
      burstSize: row.burst_size,
      refillRate: row.refill_rate,
      enabled: row.enabled === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToImportExportJob(row: any): ImportExportJob {
    return {
      id: row.id,
      type: row.type as 'import' | 'export',
      format: row.format as ImportExportFormat,
      entityType: row.entity_type,
      status: row.status as ImportExportStatus,
      filePath: row.file_path,
      totalRecords: row.total_records,
      processedRecords: row.processed_records,
      successCount: row.success_count,
      failureCount: row.failure_count,
      errors: row.errors ? JSON.parse(row.errors) : null,
      mapping: row.mapping ? JSON.parse(row.mapping) : null,
      options: row.options ? JSON.parse(row.options) : null,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null
    };
  }

  private mapRowToIntegrationEvent(row: any): IntegrationEvent {
    return {
      id: row.id,
      integrationId: row.integration_id,
      eventType: row.event_type,
      eventData: JSON.parse(row.event_data),
      status: row.status as 'success' | 'error' | 'warning',
      message: row.message,
      timestamp: new Date(row.timestamp)
    };
  }
}
