/**
 * WhiteLabel.ts
 * 
 * Data models for white labeling and multi-tenant support.
 * Enables custom branding, domain configuration, email templates,
 * and tenant-specific settings isolation.
 */

// ==================== Enums ====================

export enum TenantStatus {
  Active = 'active',
  Suspended = 'suspended',
  Trial = 'trial',
  Expired = 'expired'
}

export enum DomainStatus {
  Pending = 'pending',
  Verified = 'verified',
  Failed = 'failed',
  Expired = 'expired'
}

export enum EmailTemplateType {
  Welcome = 'welcome',
  Invitation = 'invitation',
  PasswordReset = 'password_reset',
  PasswordChanged = 'password_changed',
  TaskAssigned = 'task_assigned',
  TaskCompleted = 'task_completed',
  TaskOverdue = 'task_overdue',
  ProjectInvitation = 'project_invitation',
  CommentMention = 'comment_mention',
  WeeklyDigest = 'weekly_digest',
  MonthlyReport = 'monthly_report',
  Custom = 'custom'
}

export enum ThemeMode {
  Light = 'light',
  Dark = 'dark',
  Auto = 'auto'
}

// ==================== Interfaces ====================

/**
 * Tenant
 * Represents an isolated organization/workspace in multi-tenant setup
 */
export interface Tenant {
  id: number;
  name: string;
  slug: string; // URL-friendly identifier
  status: TenantStatus;
  primaryDomain: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  brandingConfig: BrandingConfig;
  features: string[]; // Enabled features for this tenant
  settings: Record<string, any>;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantData {
  name: string;
  slug: string;
  primaryDomain?: string | null;
  brandingConfig?: Partial<BrandingConfig>;
  features?: string[];
  settings?: Record<string, any>;
  trialEndsAt?: Date | null;
}

export interface UpdateTenantData {
  name?: string;
  slug?: string;
  status?: TenantStatus;
  primaryDomain?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  brandingConfig?: Partial<BrandingConfig>;
  features?: string[];
  settings?: Record<string, any>;
  trialEndsAt?: Date | null;
}

/**
 * Branding Configuration
 * Visual customization settings
 */
export interface BrandingConfig {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  
  // Typography
  fontFamily: string;
  headingFontFamily: string;
  fontSize: string;
  
  // Layout
  borderRadius: string;
  spacing: string;
  
  // Theme
  themeMode: ThemeMode;
  
  // Custom CSS
  customCss?: string;
}

/**
 * Custom Domain
 * Maps custom domains to tenants
 */
export interface CustomDomain {
  id: number;
  tenantId: number;
  domain: string;
  status: DomainStatus;
  isPrimary: boolean;
  verificationToken: string;
  verificationMethod: 'dns' | 'file';
  verifiedAt: Date | null;
  sslEnabled: boolean;
  sslCertificate: string | null;
  sslExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomDomainData {
  tenantId: number;
  domain: string;
  isPrimary?: boolean;
  verificationMethod?: 'dns' | 'file';
}

export interface UpdateCustomDomainData {
  status?: DomainStatus;
  isPrimary?: boolean;
  verifiedAt?: Date | null;
  sslEnabled?: boolean;
  sslCertificate?: string | null;
  sslExpiresAt?: Date | null;
}

/**
 * Email Template
 * Customizable email templates per tenant
 */
export interface EmailTemplate {
  id: number;
  tenantId: number | null; // null = global/default template
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[]; // Available template variables
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmailTemplateData {
  tenantId?: number | null;
  type: EmailTemplateType;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables?: string[];
}

export interface UpdateEmailTemplateData {
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: string[];
  isActive?: boolean;
}

/**
 * Login Page Configuration
 * Customizable login/authentication pages
 */
export interface LoginPageConfig {
  id: number;
  tenantId: number;
  logoUrl: string | null;
  backgroundImageUrl: string | null;
  backgroundColor: string;
  headerText: string | null;
  subheaderText: string | null;
  footerText: string | null;
  showSignupLink: boolean;
  showForgotPasswordLink: boolean;
  showSocialLogins: boolean;
  customHtml: string | null;
  customCss: string | null;
  redirectUrl: string | null; // Post-login redirect
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLoginPageConfigData {
  tenantId: number;
  logoUrl?: string | null;
  backgroundImageUrl?: string | null;
  backgroundColor?: string;
  headerText?: string | null;
  subheaderText?: string | null;
  footerText?: string | null;
  showSignupLink?: boolean;
  showForgotPasswordLink?: boolean;
  showSocialLogins?: boolean;
  customHtml?: string | null;
  customCss?: string | null;
  redirectUrl?: string | null;
}

export interface UpdateLoginPageConfigData {
  logoUrl?: string | null;
  backgroundImageUrl?: string | null;
  backgroundColor?: string;
  headerText?: string | null;
  subheaderText?: string | null;
  footerText?: string | null;
  showSignupLink?: boolean;
  showForgotPasswordLink?: boolean;
  showSocialLogins?: boolean;
  customHtml?: string | null;
  customCss?: string | null;
  redirectUrl?: string | null;
}

/**
 * Tenant Settings
 * Per-tenant configuration overrides
 */
export interface TenantSetting {
  id: number;
  tenantId: number;
  category: string;
  key: string;
  value: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  isOverride: boolean; // true if overriding global setting
  updatedBy: number | null;
  updatedAt: Date;
}

export interface CreateTenantSettingData {
  tenantId: number;
  category: string;
  key: string;
  value: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  isOverride?: boolean;
}

export interface UpdateTenantSettingData {
  value: string;
  updatedBy: number;
}

/**
 * Asset Storage
 * Tenant-specific file storage tracking
 */
export interface TenantAsset {
  id: number;
  tenantId: number;
  assetType: 'logo' | 'favicon' | 'background' | 'email_image' | 'custom';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: number;
  uploadedAt: Date;
}

export interface CreateTenantAssetData {
  tenantId: number;
  assetType: 'logo' | 'favicon' | 'background' | 'email_image' | 'custom';
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

// ==================== Default Values ====================

export const DEFAULT_BRANDING_CONFIG: BrandingConfig = {
  // Material Design Blue/Indigo palette
  primaryColor: '#1976d2',
  secondaryColor: '#424242',
  accentColor: '#ff4081',
  successColor: '#4caf50',
  warningColor: '#ff9800',
  errorColor: '#f44336',
  backgroundColor: '#fafafa',
  surfaceColor: '#ffffff',
  textColor: '#212121',
  textSecondaryColor: '#757575',
  
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headingFontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: '14px',
  
  borderRadius: '4px',
  spacing: '8px',
  
  themeMode: ThemeMode.Auto,
  
  customCss: undefined
};

export const DEFAULT_LOGIN_PAGE_CONFIG: Partial<CreateLoginPageConfigData> = {
  backgroundColor: '#1976d2',
  headerText: 'Welcome to DevTrack',
  subheaderText: 'Manage your projects efficiently',
  footerText: '© 2025 DevTrack. All rights reserved.',
  showSignupLink: true,
  showForgotPasswordLink: true,
  showSocialLogins: false
};

/**
 * Default Email Template Variables
 */
export const EMAIL_TEMPLATE_VARIABLES: Record<EmailTemplateType, string[]> = {
  [EmailTemplateType.Welcome]: [
    'user_name',
    'user_email',
    'tenant_name',
    'login_url',
    'support_email'
  ],
  [EmailTemplateType.Invitation]: [
    'user_name',
    'inviter_name',
    'tenant_name',
    'invitation_url',
    'expiry_date'
  ],
  [EmailTemplateType.PasswordReset]: [
    'user_name',
    'reset_url',
    'expiry_hours',
    'support_email'
  ],
  [EmailTemplateType.PasswordChanged]: [
    'user_name',
    'change_time',
    'ip_address',
    'support_email'
  ],
  [EmailTemplateType.TaskAssigned]: [
    'user_name',
    'task_title',
    'task_url',
    'project_name',
    'assigned_by',
    'due_date'
  ],
  [EmailTemplateType.TaskCompleted]: [
    'user_name',
    'task_title',
    'task_url',
    'project_name',
    'completed_by',
    'completion_date'
  ],
  [EmailTemplateType.TaskOverdue]: [
    'user_name',
    'task_title',
    'task_url',
    'project_name',
    'due_date',
    'days_overdue'
  ],
  [EmailTemplateType.ProjectInvitation]: [
    'user_name',
    'project_name',
    'project_url',
    'inviter_name',
    'role'
  ],
  [EmailTemplateType.CommentMention]: [
    'user_name',
    'commenter_name',
    'comment_text',
    'task_title',
    'task_url'
  ],
  [EmailTemplateType.WeeklyDigest]: [
    'user_name',
    'week_start',
    'week_end',
    'tasks_completed',
    'tasks_assigned',
    'projects_active'
  ],
  [EmailTemplateType.MonthlyReport]: [
    'user_name',
    'month',
    'year',
    'total_tasks',
    'completed_tasks',
    'productivity_score'
  ],
  [EmailTemplateType.Custom]: []
};

/**
 * Default Email Templates (HTML)
 */
export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, { subject: string; html: string; text: string }> = {
  [EmailTemplateType.Welcome]: {
    subject: 'Welcome to {{tenant_name}}!',
    html: `
      <h1>Welcome to {{tenant_name}}, {{user_name}}!</h1>
      <p>We're excited to have you on board. Your account has been successfully created.</p>
      <p><a href="{{login_url}}">Log in to get started</a></p>
      <p>If you have any questions, please contact us at {{support_email}}.</p>
    `,
    text: 'Welcome to {{tenant_name}}, {{user_name}}! Log in at {{login_url}}'
  },
  [EmailTemplateType.Invitation]: {
    subject: 'You\'re invited to join {{tenant_name}}',
    html: `
      <h1>Hi {{user_name}},</h1>
      <p>{{inviter_name}} has invited you to join {{tenant_name}}.</p>
      <p><a href="{{invitation_url}}">Accept Invitation</a></p>
      <p>This invitation expires on {{expiry_date}}.</p>
    `,
    text: '{{inviter_name}} invited you to {{tenant_name}}. Accept at {{invitation_url}}'
  },
  [EmailTemplateType.PasswordReset]: {
    subject: 'Reset your password',
    html: `
      <h1>Password Reset Request</h1>
      <p>Hi {{user_name}},</p>
      <p>We received a request to reset your password.</p>
      <p><a href="{{reset_url}}">Reset Password</a></p>
      <p>This link expires in {{expiry_hours}} hours.</p>
      <p>If you didn't request this, contact {{support_email}}.</p>
    `,
    text: 'Reset your password at {{reset_url}} (expires in {{expiry_hours}} hours)'
  },
  [EmailTemplateType.PasswordChanged]: {
    subject: 'Your password was changed',
    html: `
      <h1>Password Changed</h1>
      <p>Hi {{user_name}},</p>
      <p>Your password was changed on {{change_time}} from IP {{ip_address}}.</p>
      <p>If you didn't make this change, contact {{support_email}} immediately.</p>
    `,
    text: 'Your password was changed on {{change_time}}. Contact {{support_email}} if this wasn\'t you.'
  },
  [EmailTemplateType.TaskAssigned]: {
    subject: 'New task assigned: {{task_title}}',
    html: `
      <h1>Task Assigned</h1>
      <p>Hi {{user_name}},</p>
      <p>{{assigned_by}} assigned you a task in {{project_name}}:</p>
      <h2>{{task_title}}</h2>
      <p>Due: {{due_date}}</p>
      <p><a href="{{task_url}}">View Task</a></p>
    `,
    text: '{{assigned_by}} assigned you "{{task_title}}" in {{project_name}}. Due {{due_date}}. View at {{task_url}}'
  },
  [EmailTemplateType.TaskCompleted]: {
    subject: 'Task completed: {{task_title}}',
    html: `
      <h1>Task Completed</h1>
      <p>Hi {{user_name}},</p>
      <p>{{completed_by}} completed a task in {{project_name}}:</p>
      <h2>{{task_title}}</h2>
      <p>Completed on {{completion_date}}</p>
      <p><a href="{{task_url}}">View Task</a></p>
    `,
    text: '{{completed_by}} completed "{{task_title}}" on {{completion_date}}. View at {{task_url}}'
  },
  [EmailTemplateType.TaskOverdue]: {
    subject: 'Overdue task: {{task_title}}',
    html: `
      <h1>Task Overdue</h1>
      <p>Hi {{user_name}},</p>
      <p>The following task in {{project_name}} is overdue:</p>
      <h2>{{task_title}}</h2>
      <p>Was due: {{due_date}} ({{days_overdue}} days ago)</p>
      <p><a href="{{task_url}}">View Task</a></p>
    `,
    text: '"{{task_title}}" is {{days_overdue}} days overdue. View at {{task_url}}'
  },
  [EmailTemplateType.ProjectInvitation]: {
    subject: 'Invitation to join {{project_name}}',
    html: `
      <h1>Project Invitation</h1>
      <p>Hi {{user_name}},</p>
      <p>{{inviter_name}} invited you to join the project "{{project_name}}" as {{role}}.</p>
      <p><a href="{{project_url}}">View Project</a></p>
    `,
    text: '{{inviter_name}} invited you to "{{project_name}}" as {{role}}. View at {{project_url}}'
  },
  [EmailTemplateType.CommentMention]: {
    subject: '{{commenter_name}} mentioned you in a comment',
    html: `
      <h1>You were mentioned</h1>
      <p>Hi {{user_name}},</p>
      <p>{{commenter_name}} mentioned you in a comment on "{{task_title}}":</p>
      <blockquote>{{comment_text}}</blockquote>
      <p><a href="{{task_url}}">View Task</a></p>
    `,
    text: '{{commenter_name}} mentioned you: "{{comment_text}}". View at {{task_url}}'
  },
  [EmailTemplateType.WeeklyDigest]: {
    subject: 'Your weekly summary ({{week_start}} - {{week_end}})',
    html: `
      <h1>Weekly Summary</h1>
      <p>Hi {{user_name}},</p>
      <p>Here's your activity from {{week_start}} to {{week_end}}:</p>
      <ul>
        <li>Tasks completed: {{tasks_completed}}</li>
        <li>New tasks assigned: {{tasks_assigned}}</li>
        <li>Active projects: {{projects_active}}</li>
      </ul>
    `,
    text: 'Weekly summary: {{tasks_completed}} completed, {{tasks_assigned}} assigned, {{projects_active}} active projects'
  },
  [EmailTemplateType.MonthlyReport]: {
    subject: 'Your {{month}} {{year}} report',
    html: `
      <h1>Monthly Report - {{month}} {{year}}</h1>
      <p>Hi {{user_name}},</p>
      <p>Your productivity stats for {{month}}:</p>
      <ul>
        <li>Total tasks: {{total_tasks}}</li>
        <li>Completed: {{completed_tasks}}</li>
        <li>Productivity score: {{productivity_score}}</li>
      </ul>
    `,
    text: '{{month}} {{year}}: {{completed_tasks}}/{{total_tasks}} tasks completed. Score: {{productivity_score}}'
  },
  [EmailTemplateType.Custom]: {
    subject: 'Custom Email',
    html: '<p>Custom email content</p>',
    text: 'Custom email content'
  }
};
