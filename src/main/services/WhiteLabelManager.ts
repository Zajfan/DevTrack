/**
 * WhiteLabelManager.ts
 * 
 * Service for managing white labeling and multi-tenant features.
 * Handles tenant management, custom domains, email templates,
 * login page customization, and tenant-specific settings.
 */

import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import {
  Tenant,
  CreateTenantData,
  UpdateTenantData,
  TenantStatus,
  BrandingConfig,
  CustomDomain,
  CreateCustomDomainData,
  UpdateCustomDomainData,
  DomainStatus,
  EmailTemplate,
  CreateEmailTemplateData,
  UpdateEmailTemplateData,
  EmailTemplateType,
  LoginPageConfig,
  CreateLoginPageConfigData,
  UpdateLoginPageConfigData,
  TenantSetting,
  CreateTenantSettingData,
  UpdateTenantSettingData,
  TenantAsset,
  CreateTenantAssetData,
  DEFAULT_BRANDING_CONFIG,
  DEFAULT_LOGIN_PAGE_CONFIG,
  EMAIL_TEMPLATE_VARIABLES,
  DEFAULT_EMAIL_TEMPLATES
} from '../models/WhiteLabel';

export class WhiteLabelManager {
  constructor(private db: Database.Database) {
    this.initializeTables();
  }

  // ==================== Database Initialization ====================

  private initializeTables(): void {
    // Tenants table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active',
        primary_domain TEXT,
        logo_url TEXT,
        favicon_url TEXT,
        branding_config TEXT NOT NULL,
        features TEXT NOT NULL,
        settings TEXT,
        trial_ends_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
      CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
      CREATE INDEX IF NOT EXISTS idx_tenants_primary_domain ON tenants(primary_domain);
    `);

    // Custom domains table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS custom_domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        domain TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        is_primary INTEGER NOT NULL DEFAULT 0,
        verification_token TEXT NOT NULL,
        verification_method TEXT NOT NULL DEFAULT 'dns',
        verified_at TEXT,
        ssl_enabled INTEGER NOT NULL DEFAULT 0,
        ssl_certificate TEXT,
        ssl_expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_custom_domains_tenant ON custom_domains(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_custom_domains_domain ON custom_domains(domain);
      CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON custom_domains(status);
    `);

    // Email templates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        html_content TEXT NOT NULL,
        text_content TEXT NOT NULL,
        variables TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_by INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(tenant_id, type)
      );
      CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(type);
    `);

    // Login page configs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS login_page_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL UNIQUE,
        logo_url TEXT,
        background_image_url TEXT,
        background_color TEXT NOT NULL DEFAULT '#1976d2',
        header_text TEXT,
        subheader_text TEXT,
        footer_text TEXT,
        show_signup_link INTEGER NOT NULL DEFAULT 1,
        show_forgot_password_link INTEGER NOT NULL DEFAULT 1,
        show_social_logins INTEGER NOT NULL DEFAULT 0,
        custom_html TEXT,
        custom_css TEXT,
        redirect_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_login_page_configs_tenant ON login_page_configs(tenant_id);
    `);

    // Tenant settings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        data_type TEXT NOT NULL DEFAULT 'string',
        is_override INTEGER NOT NULL DEFAULT 0,
        updated_by INTEGER,
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(tenant_id, key)
      );
      CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_settings_category ON tenant_settings(category);
    `);

    // Tenant assets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tenant_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        asset_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        url TEXT NOT NULL,
        uploaded_by INTEGER NOT NULL,
        uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_tenant_assets_tenant ON tenant_assets(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_tenant_assets_type ON tenant_assets(asset_type);
    `);

    // Initialize default email templates
    // TODO: Re-enable when user system is initialized
    // this.initializeDefaultEmailTemplates();
  }

  private initializeDefaultEmailTemplates(): void {
    // Check if global templates exist
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM email_templates WHERE tenant_id IS NULL');
    const result = stmt.get() as { count: number };

    if (result.count === 0) {
      // Create default templates
      const insertStmt = this.db.prepare(`
        INSERT INTO email_templates (tenant_id, type, name, subject, html_content, text_content, variables, created_by)
        VALUES (NULL, ?, ?, ?, ?, ?, ?, NULL)
      `);

      for (const [type, template] of Object.entries(DEFAULT_EMAIL_TEMPLATES)) {
        const variables = EMAIL_TEMPLATE_VARIABLES[type as EmailTemplateType];
        insertStmt.run(
          type,
          `Default ${type} Template`,
          template.subject,
          template.html,
          template.text,
          JSON.stringify(variables)
        );
      }
    }
  }

  // ==================== Tenant Management ====================

  createTenant(data: CreateTenantData): Tenant {
    const brandingConfig = {
      ...DEFAULT_BRANDING_CONFIG,
      ...data.brandingConfig
    };

    const stmt = this.db.prepare(`
      INSERT INTO tenants (
        name, slug, primary_domain, branding_config, features, settings, trial_ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.slug,
      data.primaryDomain || null,
      JSON.stringify(brandingConfig),
      JSON.stringify(data.features || []),
      data.settings ? JSON.stringify(data.settings) : null,
      data.trialEndsAt ? data.trialEndsAt.toISOString() : null
    );

    return this.getTenant(result.lastInsertRowid as number)!;
  }

  getTenant(id: number): Tenant | null {
    const stmt = this.db.prepare('SELECT * FROM tenants WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToTenant(row) : null;
  }

  getTenantBySlug(slug: string): Tenant | null {
    const stmt = this.db.prepare('SELECT * FROM tenants WHERE slug = ?');
    const row = stmt.get(slug);
    return row ? this.mapRowToTenant(row) : null;
  }

  getTenantByDomain(domain: string): Tenant | null {
    // Check primary domain
    let stmt = this.db.prepare('SELECT * FROM tenants WHERE primary_domain = ?');
    let row = stmt.get(domain);
    
    if (row) return this.mapRowToTenant(row);

    // Check custom domains
    stmt = this.db.prepare(`
      SELECT t.* FROM tenants t
      JOIN custom_domains cd ON t.id = cd.tenant_id
      WHERE cd.domain = ? AND cd.status = 'verified'
    `);
    row = stmt.get(domain);
    
    return row ? this.mapRowToTenant(row) : null;
  }

  getAllTenants(status?: TenantStatus): Tenant[] {
    let query = 'SELECT * FROM tenants';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToTenant(row));
  }

  updateTenant(id: number, data: UpdateTenantData): Tenant | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.slug !== undefined) {
      updates.push('slug = ?');
      values.push(data.slug);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.primaryDomain !== undefined) {
      updates.push('primary_domain = ?');
      values.push(data.primaryDomain);
    }
    if (data.logoUrl !== undefined) {
      updates.push('logo_url = ?');
      values.push(data.logoUrl);
    }
    if (data.faviconUrl !== undefined) {
      updates.push('favicon_url = ?');
      values.push(data.faviconUrl);
    }
    if (data.brandingConfig !== undefined) {
      const currentTenant = this.getTenant(id);
      const mergedConfig = {
        ...(currentTenant?.brandingConfig || DEFAULT_BRANDING_CONFIG),
        ...data.brandingConfig
      };
      updates.push('branding_config = ?');
      values.push(JSON.stringify(mergedConfig));
    }
    if (data.features !== undefined) {
      updates.push('features = ?');
      values.push(JSON.stringify(data.features));
    }
    if (data.settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(data.settings));
    }
    if (data.trialEndsAt !== undefined) {
      updates.push('trial_ends_at = ?');
      values.push(data.trialEndsAt ? data.trialEndsAt.toISOString() : null);
    }

    if (updates.length === 0) return this.getTenant(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getTenant(id);
  }

  deleteTenant(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM tenants WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Custom Domains ====================

  createCustomDomain(data: CreateCustomDomainData): CustomDomain {
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const stmt = this.db.prepare(`
      INSERT INTO custom_domains (
        tenant_id, domain, is_primary, verification_token, verification_method
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.tenantId,
      data.domain,
      data.isPrimary ? 1 : 0,
      verificationToken,
      data.verificationMethod || 'dns'
    );

    return this.getCustomDomain(result.lastInsertRowid as number)!;
  }

  getCustomDomain(id: number): CustomDomain | null {
    const stmt = this.db.prepare('SELECT * FROM custom_domains WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToCustomDomain(row) : null;
  }

  getCustomDomainByDomain(domain: string): CustomDomain | null {
    const stmt = this.db.prepare('SELECT * FROM custom_domains WHERE domain = ?');
    const row = stmt.get(domain);
    return row ? this.mapRowToCustomDomain(row) : null;
  }

  getTenantCustomDomains(tenantId: number): CustomDomain[] {
    const stmt = this.db.prepare('SELECT * FROM custom_domains WHERE tenant_id = ? ORDER BY is_primary DESC, created_at ASC');
    const rows = stmt.all(tenantId);
    return rows.map(row => this.mapRowToCustomDomain(row));
  }

  updateCustomDomain(id: number, data: UpdateCustomDomainData): CustomDomain | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.isPrimary !== undefined) {
      updates.push('is_primary = ?');
      values.push(data.isPrimary ? 1 : 0);
    }
    if (data.verifiedAt !== undefined) {
      updates.push('verified_at = ?');
      values.push(data.verifiedAt ? data.verifiedAt.toISOString() : null);
    }
    if (data.sslEnabled !== undefined) {
      updates.push('ssl_enabled = ?');
      values.push(data.sslEnabled ? 1 : 0);
    }
    if (data.sslCertificate !== undefined) {
      updates.push('ssl_certificate = ?');
      values.push(data.sslCertificate);
    }
    if (data.sslExpiresAt !== undefined) {
      updates.push('ssl_expires_at = ?');
      values.push(data.sslExpiresAt ? data.sslExpiresAt.toISOString() : null);
    }

    if (updates.length === 0) return this.getCustomDomain(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE custom_domains SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getCustomDomain(id);
  }

  verifyCustomDomain(id: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE custom_domains 
      SET status = ?, verified_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `);
    const result = stmt.run(DomainStatus.Verified, id);
    return result.changes > 0;
  }

  deleteCustomDomain(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM custom_domains WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Email Templates ====================

  createEmailTemplate(data: CreateEmailTemplateData, createdBy: number): EmailTemplate {
    const variables = data.variables || EMAIL_TEMPLATE_VARIABLES[data.type] || [];

    const stmt = this.db.prepare(`
      INSERT INTO email_templates (
        tenant_id, type, name, subject, html_content, text_content, variables, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.tenantId || null,
      data.type,
      data.name,
      data.subject,
      data.htmlContent,
      data.textContent,
      JSON.stringify(variables),
      createdBy
    );

    return this.getEmailTemplate(result.lastInsertRowid as number)!;
  }

  getEmailTemplate(id: number): EmailTemplate | null {
    const stmt = this.db.prepare('SELECT * FROM email_templates WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToEmailTemplate(row) : null;
  }

  getEmailTemplateByType(tenantId: number | null, type: EmailTemplateType): EmailTemplate | null {
    // Try tenant-specific template first
    if (tenantId) {
      const stmt = this.db.prepare('SELECT * FROM email_templates WHERE tenant_id = ? AND type = ? AND is_active = 1');
      const row = stmt.get(tenantId, type);
      if (row) return this.mapRowToEmailTemplate(row);
    }

    // Fall back to global template
    const stmt = this.db.prepare('SELECT * FROM email_templates WHERE tenant_id IS NULL AND type = ? AND is_active = 1');
    const row = stmt.get(type);
    return row ? this.mapRowToEmailTemplate(row) : null;
  }

  getTenantEmailTemplates(tenantId: number | null): EmailTemplate[] {
    const stmt = this.db.prepare('SELECT * FROM email_templates WHERE tenant_id IS ? ORDER BY type ASC');
    const rows = stmt.all(tenantId);
    return rows.map(row => this.mapRowToEmailTemplate(row));
  }

  updateEmailTemplate(id: number, data: UpdateEmailTemplateData): EmailTemplate | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.subject !== undefined) {
      updates.push('subject = ?');
      values.push(data.subject);
    }
    if (data.htmlContent !== undefined) {
      updates.push('html_content = ?');
      values.push(data.htmlContent);
    }
    if (data.textContent !== undefined) {
      updates.push('text_content = ?');
      values.push(data.textContent);
    }
    if (data.variables !== undefined) {
      updates.push('variables = ?');
      values.push(JSON.stringify(data.variables));
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) return this.getEmailTemplate(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE email_templates SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getEmailTemplate(id);
  }

  deleteEmailTemplate(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM email_templates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Login Page Configuration ====================

  createLoginPageConfig(data: CreateLoginPageConfigData): LoginPageConfig {
    const defaults = DEFAULT_LOGIN_PAGE_CONFIG;

    const stmt = this.db.prepare(`
      INSERT INTO login_page_configs (
        tenant_id, logo_url, background_image_url, background_color,
        header_text, subheader_text, footer_text,
        show_signup_link, show_forgot_password_link, show_social_logins,
        custom_html, custom_css, redirect_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.tenantId,
      data.logoUrl || null,
      data.backgroundImageUrl || null,
      data.backgroundColor || defaults.backgroundColor,
      data.headerText || defaults.headerText || null,
      data.subheaderText || defaults.subheaderText || null,
      data.footerText || defaults.footerText || null,
      data.showSignupLink !== undefined ? (data.showSignupLink ? 1 : 0) : 1,
      data.showForgotPasswordLink !== undefined ? (data.showForgotPasswordLink ? 1 : 0) : 1,
      data.showSocialLogins !== undefined ? (data.showSocialLogins ? 1 : 0) : 0,
      data.customHtml || null,
      data.customCss || null,
      data.redirectUrl || null
    );

    return this.getLoginPageConfig(result.lastInsertRowid as number)!;
  }

  getLoginPageConfig(id: number): LoginPageConfig | null {
    const stmt = this.db.prepare('SELECT * FROM login_page_configs WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToLoginPageConfig(row) : null;
  }

  getLoginPageConfigByTenant(tenantId: number): LoginPageConfig | null {
    const stmt = this.db.prepare('SELECT * FROM login_page_configs WHERE tenant_id = ?');
    const row = stmt.get(tenantId);
    return row ? this.mapRowToLoginPageConfig(row) : null;
  }

  updateLoginPageConfig(id: number, data: UpdateLoginPageConfigData): LoginPageConfig | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.logoUrl !== undefined) {
      updates.push('logo_url = ?');
      values.push(data.logoUrl);
    }
    if (data.backgroundImageUrl !== undefined) {
      updates.push('background_image_url = ?');
      values.push(data.backgroundImageUrl);
    }
    if (data.backgroundColor !== undefined) {
      updates.push('background_color = ?');
      values.push(data.backgroundColor);
    }
    if (data.headerText !== undefined) {
      updates.push('header_text = ?');
      values.push(data.headerText);
    }
    if (data.subheaderText !== undefined) {
      updates.push('subheader_text = ?');
      values.push(data.subheaderText);
    }
    if (data.footerText !== undefined) {
      updates.push('footer_text = ?');
      values.push(data.footerText);
    }
    if (data.showSignupLink !== undefined) {
      updates.push('show_signup_link = ?');
      values.push(data.showSignupLink ? 1 : 0);
    }
    if (data.showForgotPasswordLink !== undefined) {
      updates.push('show_forgot_password_link = ?');
      values.push(data.showForgotPasswordLink ? 1 : 0);
    }
    if (data.showSocialLogins !== undefined) {
      updates.push('show_social_logins = ?');
      values.push(data.showSocialLogins ? 1 : 0);
    }
    if (data.customHtml !== undefined) {
      updates.push('custom_html = ?');
      values.push(data.customHtml);
    }
    if (data.customCss !== undefined) {
      updates.push('custom_css = ?');
      values.push(data.customCss);
    }
    if (data.redirectUrl !== undefined) {
      updates.push('redirect_url = ?');
      values.push(data.redirectUrl);
    }

    if (updates.length === 0) return this.getLoginPageConfig(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE login_page_configs SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getLoginPageConfig(id);
  }

  deleteLoginPageConfig(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM login_page_configs WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Tenant Settings ====================

  createTenantSetting(data: CreateTenantSettingData): TenantSetting {
    const stmt = this.db.prepare(`
      INSERT INTO tenant_settings (tenant_id, category, key, value, data_type, is_override)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.tenantId,
      data.category,
      data.key,
      data.value,
      data.dataType,
      data.isOverride ? 1 : 0
    );

    return this.getTenantSetting(result.lastInsertRowid as number)!;
  }

  getTenantSetting(id: number): TenantSetting | null {
    const stmt = this.db.prepare('SELECT * FROM tenant_settings WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToTenantSetting(row) : null;
  }

  getTenantSettingByKey(tenantId: number, key: string): TenantSetting | null {
    const stmt = this.db.prepare('SELECT * FROM tenant_settings WHERE tenant_id = ? AND key = ?');
    const row = stmt.get(tenantId, key);
    return row ? this.mapRowToTenantSetting(row) : null;
  }

  getAllTenantSettings(tenantId: number, category?: string): TenantSetting[] {
    let query = 'SELECT * FROM tenant_settings WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, key';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToTenantSetting(row));
  }

  updateTenantSetting(id: number, data: UpdateTenantSettingData): TenantSetting | null {
    const stmt = this.db.prepare(`
      UPDATE tenant_settings 
      SET value = ?, updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(data.value, data.updatedBy, id);

    return this.getTenantSetting(id);
  }

  deleteTenantSetting(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM tenant_settings WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Tenant Assets ====================

  createTenantAsset(data: CreateTenantAssetData, uploadedBy: number): TenantAsset {
    const stmt = this.db.prepare(`
      INSERT INTO tenant_assets (
        tenant_id, asset_type, file_name, file_path, file_size, mime_type, url, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.tenantId,
      data.assetType,
      data.fileName,
      data.filePath,
      data.fileSize,
      data.mimeType,
      data.url,
      uploadedBy
    );

    return this.getTenantAsset(result.lastInsertRowid as number)!;
  }

  getTenantAsset(id: number): TenantAsset | null {
    const stmt = this.db.prepare('SELECT * FROM tenant_assets WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToTenantAsset(row) : null;
  }

  getTenantAssets(tenantId: number, assetType?: string): TenantAsset[] {
    let query = 'SELECT * FROM tenant_assets WHERE tenant_id = ?';
    const params: any[] = [tenantId];

    if (assetType) {
      query += ' AND asset_type = ?';
      params.push(assetType);
    }

    query += ' ORDER BY uploaded_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToTenantAsset(row));
  }

  deleteTenantAsset(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM tenant_assets WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Helper Methods ====================

  private mapRowToTenant(row: any): Tenant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status as TenantStatus,
      primaryDomain: row.primary_domain,
      logoUrl: row.logo_url,
      faviconUrl: row.favicon_url,
      brandingConfig: JSON.parse(row.branding_config),
      features: JSON.parse(row.features),
      settings: row.settings ? JSON.parse(row.settings) : {},
      trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToCustomDomain(row: any): CustomDomain {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      domain: row.domain,
      status: row.status as DomainStatus,
      isPrimary: row.is_primary === 1,
      verificationToken: row.verification_token,
      verificationMethod: row.verification_method as 'dns' | 'file',
      verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
      sslEnabled: row.ssl_enabled === 1,
      sslCertificate: row.ssl_certificate,
      sslExpiresAt: row.ssl_expires_at ? new Date(row.ssl_expires_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToEmailTemplate(row: any): EmailTemplate {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type as EmailTemplateType,
      name: row.name,
      subject: row.subject,
      htmlContent: row.html_content,
      textContent: row.text_content,
      variables: JSON.parse(row.variables),
      isActive: row.is_active === 1,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToLoginPageConfig(row: any): LoginPageConfig {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      logoUrl: row.logo_url,
      backgroundImageUrl: row.background_image_url,
      backgroundColor: row.background_color,
      headerText: row.header_text,
      subheaderText: row.subheader_text,
      footerText: row.footer_text,
      showSignupLink: row.show_signup_link === 1,
      showForgotPasswordLink: row.show_forgot_password_link === 1,
      showSocialLogins: row.show_social_logins === 1,
      customHtml: row.custom_html,
      customCss: row.custom_css,
      redirectUrl: row.redirect_url,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToTenantSetting(row: any): TenantSetting {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      category: row.category,
      key: row.key,
      value: row.value,
      dataType: row.data_type as 'string' | 'number' | 'boolean' | 'json',
      isOverride: row.is_override === 1,
      updatedBy: row.updated_by,
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToTenantAsset(row: any): TenantAsset {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      assetType: row.asset_type as 'logo' | 'favicon' | 'background' | 'email_image' | 'custom',
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      url: row.url,
      uploadedBy: row.uploaded_by,
      uploadedAt: new Date(row.uploaded_at)
    };
  }
}
