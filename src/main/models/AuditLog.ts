/**
 * Audit Log Models - Comprehensive audit trail system
 */

export enum AuditAction {
  // User actions
  UserCreated = 'user_created',
  UserUpdated = 'user_updated',
  UserDeleted = 'user_deleted',
  UserLoggedIn = 'user_logged_in',
  UserLoggedOut = 'user_logged_out',
  UserPasswordChanged = 'user_password_changed',
  UserRoleChanged = 'user_role_changed',
  
  // Project actions
  ProjectCreated = 'project_created',
  ProjectUpdated = 'project_updated',
  ProjectDeleted = 'project_deleted',
  ProjectArchived = 'project_archived',
  ProjectRestored = 'project_restored',
  ProjectMemberAdded = 'project_member_added',
  ProjectMemberRemoved = 'project_member_removed',
  ProjectMemberRoleChanged = 'project_member_role_changed',
  
  // Task actions
  TaskCreated = 'task_created',
  TaskUpdated = 'task_updated',
  TaskDeleted = 'task_deleted',
  TaskAssigned = 'task_assigned',
  TaskStatusChanged = 'task_status_changed',
  TaskPriorityChanged = 'task_priority_changed',
  TaskMoved = 'task_moved',
  
  // Comment actions
  CommentCreated = 'comment_created',
  CommentUpdated = 'comment_updated',
  CommentDeleted = 'comment_deleted',
  
  // Attachment actions
  AttachmentUploaded = 'attachment_uploaded',
  AttachmentDeleted = 'attachment_deleted',
  AttachmentDownloaded = 'attachment_downloaded',
  
  // Permission actions
  PermissionGranted = 'permission_granted',
  PermissionRevoked = 'permission_revoked',
  RoleCreated = 'role_created',
  RoleUpdated = 'role_updated',
  RoleDeleted = 'role_deleted',
  
  // Security actions
  SecurityPolicyUpdated = 'security_policy_updated',
  MFAEnabled = 'mfa_enabled',
  MFADisabled = 'mfa_disabled',
  APIKeyCreated = 'api_key_created',
  APIKeyRevoked = 'api_key_revoked',
  SSOConfigured = 'sso_configured',
  
  // Data actions
  DataExported = 'data_exported',
  DataImported = 'data_imported',
  DataDeleted = 'data_deleted',
  DataRestored = 'data_restored',
  
  // Settings actions
  SettingsUpdated = 'settings_updated',
  SettingsExported = 'settings_exported',
  SettingsImported = 'settings_imported',
  SettingsReset = 'settings_reset',
  
  // Automation actions
  AutomationRuleCreated = 'automation_rule_created',
  AutomationRuleUpdated = 'automation_rule_updated',
  AutomationRuleDeleted = 'automation_rule_deleted',
  AutomationRuleExecuted = 'automation_rule_executed',
  
  // Template actions
  TemplateCreated = 'template_created',
  TemplateUpdated = 'template_updated',
  TemplateDeleted = 'template_deleted',
  TemplateUsed = 'template_used',
  
  // System actions
  SystemConfigUpdated = 'system_config_updated',
  SystemBackupCreated = 'system_backup_created',
  SystemRestored = 'system_restored',
  SystemMaintenanceStarted = 'system_maintenance_started',
  SystemMaintenanceEnded = 'system_maintenance_ended',
}

export enum AuditCategory {
  User = 'user',
  Project = 'project',
  Task = 'task',
  Security = 'security',
  Data = 'data',
  Settings = 'settings',
  System = 'system',
  Automation = 'automation',
  Template = 'template',
}

export enum AuditSeverity {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
  Critical = 'critical',
}

export interface AuditLog {
  id: number;
  timestamp: string;
  userId?: number; // Null for system actions
  username?: string;
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  entityType?: string; // 'project', 'task', 'user', etc.
  entityId?: number;
  entityName?: string;
  description: string;
  changes?: AuditChange[]; // Detailed field changes
  metadata?: Record<string, any>; // Additional context
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  displayName?: string;
}

export interface AuditFilters {
  userId?: number;
  action?: AuditAction;
  category?: AuditCategory;
  severity?: AuditSeverity;
  entityType?: string;
  entityId?: number;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  totalEntries: number;
  dateRange: { start: string; end: string };
  byCategory: Record<AuditCategory, number>;
  byAction: Record<string, number>;
  bySeverity: Record<AuditSeverity, number>;
  byUser: Array<{ userId: number; username: string; count: number }>;
  topActions: Array<{ action: AuditAction; count: number }>;
  failureRate: number;
  mostActiveUsers: Array<{ userId: number; username: string; actionCount: number }>;
  mostActiveHours: Array<{ hour: number; count: number }>;
}

export interface ComplianceReport {
  reportDate: string;
  period: { start: string; end: string };
  totalAuditEntries: number;
  securityEvents: number;
  dataAccessEvents: number;
  dataModificationEvents: number;
  userLoginEvents: number;
  failedLoginAttempts: number;
  permissionChanges: number;
  dataExports: number;
  criticalEvents: number;
  complianceScore: number; // 0-100
  recommendations: string[];
}

// Helper function to categorize actions
export function getActionCategory(action: AuditAction): AuditCategory {
  if (action.startsWith('user_')) return AuditCategory.User;
  if (action.startsWith('project_')) return AuditCategory.Project;
  if (action.startsWith('task_')) return AuditCategory.Task;
  if (action.startsWith('security_') || action.startsWith('mfa_') || action.startsWith('sso_') || action.startsWith('api_key_')) 
    return AuditCategory.Security;
  if (action.startsWith('data_')) return AuditCategory.Data;
  if (action.startsWith('settings_')) return AuditCategory.Settings;
  if (action.startsWith('system_')) return AuditCategory.System;
  if (action.startsWith('automation_')) return AuditCategory.Automation;
  if (action.startsWith('template_')) return AuditCategory.Template;
  return AuditCategory.System;
}

// Helper function to determine severity
export function getActionSeverity(action: AuditAction): AuditSeverity {
  const criticalActions = [
    AuditAction.UserDeleted,
    AuditAction.ProjectDeleted,
    AuditAction.DataDeleted,
    AuditAction.SecurityPolicyUpdated,
    AuditAction.PermissionGranted,
    AuditAction.PermissionRevoked,
    AuditAction.SystemConfigUpdated,
  ];
  
  const warningActions = [
    AuditAction.UserPasswordChanged,
    AuditAction.UserRoleChanged,
    AuditAction.ProjectMemberRoleChanged,
    AuditAction.MFADisabled,
    AuditAction.APIKeyRevoked,
    AuditAction.DataExported,
  ];
  
  if (criticalActions.includes(action)) return AuditSeverity.Critical;
  if (warningActions.includes(action)) return AuditSeverity.Warning;
  return AuditSeverity.Info;
}
