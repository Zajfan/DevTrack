import Database from 'better-sqlite3';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import {
  UserCredentials,
  MFAConfig,
  UserSession,
  SecurityEvent,
  SSOConfig,
  PasswordPolicy,
  IPWhitelist,
  APIKey,
  AuthProvider,
  MFAMethod,
  SecurityEventType,
  DEFAULT_PASSWORD_POLICY,
} from '../models/Security';

/**
 * SecurityManager - Comprehensive security and authentication service
 */
export class SecurityManager {
  constructor(private db: Database.Database) {
    this.initializeTables();
  }

  private initializeTables(): void {
    // User credentials table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        auth_provider TEXT NOT NULL DEFAULT 'local',
        password_hash TEXT,
        password_salt TEXT,
        last_password_change TEXT,
        password_expires_at TEXT,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        account_locked_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS mfa_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        method TEXT NOT NULL,
        is_enabled INTEGER NOT NULL DEFAULT 0,
        secret TEXT,
        backup_codes TEXT,
        phone_number TEXT,
        email_address TEXT,
        verified_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        auth_provider TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        access_token TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS security_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        event_type TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT,
        severity TEXT NOT NULL DEFAULT 'low',
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS sso_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        name TEXT NOT NULL,
        is_enabled INTEGER NOT NULL DEFAULT 0,
        saml_entry_point TEXT,
        saml_issuer TEXT,
        saml_cert TEXT,
        saml_signature_algorithm TEXT,
        oauth2_client_id TEXT,
        oauth2_client_secret TEXT,
        oauth2_auth_url TEXT,
        oauth2_token_url TEXT,
        oauth2_scope TEXT,
        ldap_url TEXT,
        ldap_bind_dn TEXT,
        ldap_bind_password TEXT,
        ldap_base_dn TEXT,
        ldap_user_filter TEXT,
        ldap_group_filter TEXT,
        auto_provision_users INTEGER NOT NULL DEFAULT 1,
        default_role TEXT,
        attribute_mapping TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        min_length INTEGER NOT NULL DEFAULT 12,
        require_uppercase INTEGER NOT NULL DEFAULT 1,
        require_lowercase INTEGER NOT NULL DEFAULT 1,
        require_numbers INTEGER NOT NULL DEFAULT 1,
        require_special_chars INTEGER NOT NULL DEFAULT 1,
        prevent_reuse INTEGER NOT NULL DEFAULT 5,
        expiry_days INTEGER NOT NULL DEFAULT 90,
        max_failed_attempts INTEGER NOT NULL DEFAULT 5,
        lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,
        require_mfa INTEGER NOT NULL DEFAULT 0,
        allowed_domains TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ip_whitelist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL UNIQUE,
        description TEXT,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        scopes TEXT NOT NULL,
        rate_limit INTEGER,
        expires_at TEXT,
        last_used_at TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        revoked_at TEXT,
        revoked_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (revoked_by) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON user_credentials(user_id);
      CREATE INDEX IF NOT EXISTS idx_mfa_configs_user_id ON mfa_configs(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
    `);

    // Insert default password policy if not exists
    const existingPolicy = this.db
      .prepare('SELECT COUNT(*) as count FROM password_policies WHERE is_default = 1')
      .get() as { count: number };

    if (existingPolicy.count === 0) {
      this.db
        .prepare(
          `INSERT INTO password_policies (
          min_length, require_uppercase, require_lowercase, require_numbers,
          require_special_chars, prevent_reuse, expiry_days, max_failed_attempts,
          lockout_duration_minutes, require_mfa, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          DEFAULT_PASSWORD_POLICY.minLength,
          DEFAULT_PASSWORD_POLICY.requireUppercase ? 1 : 0,
          DEFAULT_PASSWORD_POLICY.requireLowercase ? 1 : 0,
          DEFAULT_PASSWORD_POLICY.requireNumbers ? 1 : 0,
          DEFAULT_PASSWORD_POLICY.requireSpecialChars ? 1 : 0,
          DEFAULT_PASSWORD_POLICY.preventReuse,
          DEFAULT_PASSWORD_POLICY.expiryDays,
          DEFAULT_PASSWORD_POLICY.maxFailedAttempts,
          DEFAULT_PASSWORD_POLICY.lockoutDurationMinutes,
          DEFAULT_PASSWORD_POLICY.requireMFA ? 1 : 0,
          1,
          DEFAULT_PASSWORD_POLICY.createdAt,
          DEFAULT_PASSWORD_POLICY.updatedAt
        );
    }
  }

  // ==================== Password Management ====================

  async setPassword(userId: number, password: string): Promise<void> {
    const policy = this.getPasswordPolicy();
    this.validatePassword(password, policy);

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    const now = new Date().toISOString();

    const existing = this.db
      .prepare('SELECT id FROM user_credentials WHERE user_id = ?')
      .get(userId);

    if (existing) {
      this.db
        .prepare(
          `UPDATE user_credentials 
         SET password_hash = ?, password_salt = ?, last_password_change = ?, 
             failed_login_attempts = 0, account_locked_until = NULL, updated_at = ?
         WHERE user_id = ?`
        )
        .run(hash, salt, now, now, userId);
    } else {
      this.db
        .prepare(
          `INSERT INTO user_credentials (
          user_id, auth_provider, password_hash, password_salt, 
          last_password_change, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(userId, AuthProvider.Local, hash, salt, now, now, now);
    }

    this.logSecurityEvent({
      userId,
      eventType: SecurityEventType.PasswordChange,
      ipAddress: '127.0.0.1',
      userAgent: 'System',
      description: 'Password changed',
      severity: 'low',
    });
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const creds = this.db
      .prepare(
        'SELECT password_hash, failed_login_attempts, account_locked_until FROM user_credentials WHERE user_id = ?'
      )
      .get(userId) as any;

    if (!creds || !creds.password_hash) {
      return false;
    }

    // Check if account is locked
    if (creds.account_locked_until) {
      const lockedUntil = new Date(creds.account_locked_until);
      if (lockedUntil > new Date()) {
        throw new Error(`Account locked until ${lockedUntil.toLocaleString()}`);
      }
    }

    const isValid = await bcrypt.compare(password, creds.password_hash);

    if (!isValid) {
      this.handleFailedLogin(userId);
      return false;
    }

    // Reset failed attempts on successful login
    this.db
      .prepare('UPDATE user_credentials SET failed_login_attempts = 0 WHERE user_id = ?')
      .run(userId);

    return true;
  }

  private handleFailedLogin(userId: number): void {
    const policy = this.getPasswordPolicy();
    const creds = this.db
      .prepare('SELECT failed_login_attempts FROM user_credentials WHERE user_id = ?')
      .get(userId) as any;

    const attempts = (creds?.failed_login_attempts || 0) + 1;

    if (attempts >= policy.maxFailedAttempts) {
      const lockoutUntil = new Date();
      lockoutUntil.setMinutes(lockoutUntil.getMinutes() + policy.lockoutDurationMinutes);

      this.db
        .prepare(
          `UPDATE user_credentials 
         SET failed_login_attempts = ?, account_locked_until = ?
         WHERE user_id = ?`
        )
        .run(attempts, lockoutUntil.toISOString(), userId);

      this.logSecurityEvent({
        userId,
        eventType: SecurityEventType.AccountLocked,
        ipAddress: '127.0.0.1',
        userAgent: 'System',
        description: `Account locked after ${attempts} failed login attempts`,
        severity: 'high',
      });
    } else {
      this.db
        .prepare('UPDATE user_credentials SET failed_login_attempts = ? WHERE user_id = ?')
        .run(attempts, userId);

      this.logSecurityEvent({
        userId,
        eventType: SecurityEventType.LoginFailed,
        ipAddress: '127.0.0.1',
        userAgent: 'System',
        description: `Failed login attempt (${attempts}/${policy.maxFailedAttempts})`,
        severity: 'medium',
      });
    }
  }

  private validatePassword(password: string, policy: PasswordPolicy): void {
    if (password.length < policy.minLength) {
      throw new Error(`Password must be at least ${policy.minLength} characters`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    if (policy.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
  }

  getPasswordPolicy(): PasswordPolicy {
    const row = this.db
      .prepare('SELECT * FROM password_policies WHERE is_default = 1')
      .get() as any;

    if (!row) {
      return DEFAULT_PASSWORD_POLICY;
    }

    return {
      id: row.id,
      minLength: row.min_length,
      requireUppercase: row.require_uppercase === 1,
      requireLowercase: row.require_lowercase === 1,
      requireNumbers: row.require_numbers === 1,
      requireSpecialChars: row.require_special_chars === 1,
      preventReuse: row.prevent_reuse,
      expiryDays: row.expiry_days,
      maxFailedAttempts: row.max_failed_attempts,
      lockoutDurationMinutes: row.lockout_duration_minutes,
      requireMFA: row.require_mfa === 1,
      allowedDomains: row.allowed_domains ? JSON.parse(row.allowed_domains) : [],
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ==================== Security Events ====================

  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'createdAt'>): void {
    this.db
      .prepare(
        `INSERT INTO security_events (
        user_id, event_type, ip_address, user_agent, description, metadata, severity, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.userId || null,
        event.eventType,
        event.ipAddress,
        event.userAgent,
        event.description,
        event.metadata || null,
        event.severity,
        new Date().toISOString()
      );
  }

  getSecurityEvents(filters?: {
    userId?: number;
    eventType?: SecurityEventType;
    severity?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): SecurityEvent[] {
    let query = 'SELECT * FROM security_events WHERE 1=1';
    const params: any[] = [];

    if (filters?.userId) {
      query += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.eventType) {
      query += ' AND event_type = ?';
      params.push(filters.eventType);
    }
    if (filters?.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters?.startDate) {
      query += ' AND created_at >= ?';
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      query += ' AND created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      eventType: row.event_type as SecurityEventType,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      description: row.description,
      metadata: row.metadata,
      severity: row.severity as any,
      createdAt: row.created_at,
    }));
  }

  // ==================== API Keys ====================

  generateAPIKey(userId: number, name: string, scopes: string[]): { key: string; apiKey: APIKey } {
    const key = `devtrack_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.substring(0, 16);
    const now = new Date().toISOString();

    const result = this.db
      .prepare(
        `INSERT INTO api_keys (
        user_id, name, key_hash, key_prefix, scopes, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(userId, name, keyHash, keyPrefix, JSON.stringify(scopes), 1, now);

    const apiKey: APIKey = {
      id: result.lastInsertRowid as number,
      userId,
      name,
      keyHash,
      keyPrefix,
      scopes,
      isActive: true,
      createdAt: now,
    };

    this.logSecurityEvent({
      userId,
      eventType: SecurityEventType.APIKeyCreated,
      ipAddress: '127.0.0.1',
      userAgent: 'System',
      description: `API key created: ${name}`,
      severity: 'medium',
    });

    return { key, apiKey };
  }

  verifyAPIKey(key: string): APIKey | null {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const row = this.db
      .prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1')
      .get(keyHash) as any;

    if (!row) {
      return null;
    }

    // Update last used
    this.db
      .prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?')
      .run(new Date().toISOString(), row.id);

    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      keyHash: row.key_hash,
      keyPrefix: row.key_prefix,
      scopes: JSON.parse(row.scopes),
      rateLimit: row.rate_limit,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
    };
  }

  revokeAPIKey(keyId: number, revokedBy: number): void {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE api_keys SET is_active = 0, revoked_at = ?, revoked_by = ? WHERE id = ?')
      .run(now, revokedBy, keyId);

    this.logSecurityEvent({
      userId: revokedBy,
      eventType: SecurityEventType.APIKeyRevoked,
      ipAddress: '127.0.0.1',
      userAgent: 'System',
      description: `API key revoked: ID ${keyId}`,
      severity: 'medium',
    });
  }

  // ==================== Utility Methods ====================

  cleanupExpiredSessions(): number {
    const result = this.db
      .prepare('DELETE FROM user_sessions WHERE expires_at < ?')
      .run(new Date().toISOString());

    return result.changes;
  }

  cleanupOldSecurityEvents(retentionDays: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = this.db
      .prepare('DELETE FROM security_events WHERE created_at < ?')
      .run(cutoffDate.toISOString());

    return result.changes;
  }
}
