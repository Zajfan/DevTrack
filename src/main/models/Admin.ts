/**
 * Admin.ts
 * 
 * Data models for administrative controls and system management.
 * Supports admin dashboard, user management, workspace controls, license management,
 * and system monitoring.
 */

// ==================== Enums ====================

export enum UserProvisioningStatus {
  Pending = 'pending',
  Active = 'active',
  Suspended = 'suspended',
  Deactivated = 'deactivated'
}

export enum LicenseType {
  Free = 'free',
  Professional = 'professional',
  Team = 'team',
  Enterprise = 'enterprise'
}

export enum LicenseStatus {
  Active = 'active',
  Expired = 'expired',
  Suspended = 'suspended',
  Cancelled = 'cancelled'
}

export enum SystemHealthStatus {
  Healthy = 'healthy',
  Warning = 'warning',
  Critical = 'critical',
  Degraded = 'degraded'
}

export enum WorkspaceQuotaType {
  Projects = 'projects',
  Users = 'users',
  Storage = 'storage',
  APIRequests = 'api_requests',
  Integrations = 'integrations'
}

export enum BulkOperationType {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Suspend = 'suspend',
  Activate = 'activate',
  AssignRole = 'assign_role',
  RemoveRole = 'remove_role'
}

export enum BulkOperationStatus {
  Pending = 'pending',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  PartialSuccess = 'partial_success'
}

// ==================== Interfaces ====================

/**
 * User Provisioning
 * Manages bulk user creation and onboarding
 */
export interface UserProvisioningRequest {
  id: number;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  roleId: number | null;
  departmentId: number | null;
  status: UserProvisioningStatus;
  invitationSent: boolean;
  invitationSentAt: Date | null;
  activatedAt: Date | null;
  createdBy: number;
  createdAt: Date;
  metadata: Record<string, any> | null;
}

export interface CreateUserProvisioningData {
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  roleId?: number | null;
  departmentId?: number | null;
  sendInvitation?: boolean;
  metadata?: Record<string, any> | null;
}

/**
 * Bulk Operations
 * Manages batch operations on multiple entities
 */
export interface BulkOperation {
  id: number;
  type: BulkOperationType;
  entityType: string;
  status: BulkOperationStatus;
  totalItems: number;
  processedItems: number;
  successCount: number;
  failureCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdBy: number;
  createdAt: Date;
  errors: Array<{ index: number; error: string }> | null;
  data: Record<string, any> | null;
}

export interface CreateBulkOperationData {
  type: BulkOperationType;
  entityType: string;
  items: any[];
  data?: Record<string, any> | null;
}

/**
 * License Management
 * Tracks organization licenses and quotas
 */
export interface License {
  id: number;
  organizationId: number;
  type: LicenseType;
  status: LicenseStatus;
  maxUsers: number;
  maxProjects: number;
  maxStorage: number; // in MB
  features: string[]; // JSON array of enabled features
  validFrom: Date;
  validUntil: Date;
  autoRenew: boolean;
  billingEmail: string;
  paymentMethod: string | null;
  lastBillingDate: Date | null;
  nextBillingDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLicenseData {
  organizationId: number;
  type: LicenseType;
  maxUsers: number;
  maxProjects: number;
  maxStorage: number;
  features: string[];
  validFrom: Date;
  validUntil: Date;
  autoRenew?: boolean;
  billingEmail: string;
  paymentMethod?: string | null;
}

export interface UpdateLicenseData {
  type?: LicenseType;
  status?: LicenseStatus;
  maxUsers?: number;
  maxProjects?: number;
  maxStorage?: number;
  features?: string[];
  validUntil?: Date;
  autoRenew?: boolean;
  billingEmail?: string;
  paymentMethod?: string | null;
}

/**
 * Workspace Quotas
 * Tracks usage against license limits
 */
export interface WorkspaceQuota {
  id: number;
  organizationId: number;
  quotaType: WorkspaceQuotaType;
  limit: number;
  used: number;
  warningThreshold: number; // Percentage (e.g., 80 = 80%)
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotaUsage {
  quotaType: WorkspaceQuotaType;
  limit: number;
  used: number;
  percentage: number;
  isWarning: boolean;
  isExceeded: boolean;
}

/**
 * System Health Monitoring
 * Tracks system performance and health metrics
 */
export interface SystemHealthMetric {
  id: number;
  metricName: string;
  metricValue: number;
  unit: string;
  status: SystemHealthStatus;
  threshold: number;
  timestamp: Date;
  details: Record<string, any> | null;
}

export interface SystemHealth {
  status: SystemHealthStatus;
  uptime: number; // seconds
  cpu: {
    usage: number; // percentage
    status: SystemHealthStatus;
  };
  memory: {
    total: number; // MB
    used: number; // MB
    percentage: number;
    status: SystemHealthStatus;
  };
  disk: {
    total: number; // MB
    used: number; // MB
    percentage: number;
    status: SystemHealthStatus;
  };
  database: {
    size: number; // MB
    connections: number;
    status: SystemHealthStatus;
  };
  apiServer: {
    requestsPerMinute: number;
    averageResponseTime: number; // ms
    errorRate: number; // percentage
    status: SystemHealthStatus;
  };
  timestamp: Date;
}

/**
 * Admin Dashboard Statistics
 * Aggregated metrics for admin overview
 */
export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    archived: number;
  };
  tasks: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  storage: {
    total: number; // MB
    used: number; // MB
    percentage: number;
    attachments: number;
  };
  license: {
    type: LicenseType;
    status: LicenseStatus;
    usersUsed: number;
    usersLimit: number;
    projectsUsed: number;
    projectsLimit: number;
    daysUntilExpiry: number;
  };
  activity: {
    todayLogins: number;
    todayActions: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  systemHealth: SystemHealthStatus;
}

/**
 * User Management Filters
 * Advanced filtering for admin user management
 */
export interface AdminUserFilters {
  search?: string;
  status?: UserProvisioningStatus[];
  roleIds?: number[];
  departmentIds?: number[];
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  hasNoActivity?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * System Settings
 * Global system configuration
 */
export interface SystemSettings {
  id: number;
  category: string;
  key: string;
  value: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  isPublic: boolean; // Can be accessed by non-admin users
  updatedBy: number | null;
  updatedAt: Date;
}

export interface UpdateSystemSettingData {
  value: string;
  updatedBy: number;
}

/**
 * Activity Log (Admin-specific high-level actions)
 * Complements the detailed audit log
 */
export interface AdminActivityLog {
  id: number;
  adminUserId: number;
  action: string;
  description: string;
  affectedUsers: number[]; // User IDs
  affectedEntities: Array<{ type: string; id: number }>;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date;
  metadata: Record<string, any> | null;
}

// ==================== Default Values ====================

export const DEFAULT_LICENSE_FEATURES: Record<LicenseType, string[]> = {
  [LicenseType.Free]: [
    'basic_project_management',
    'task_management',
    'basic_reporting'
  ],
  [LicenseType.Professional]: [
    'basic_project_management',
    'task_management',
    'basic_reporting',
    'time_tracking',
    'custom_fields',
    'advanced_search',
    'file_attachments'
  ],
  [LicenseType.Team]: [
    'basic_project_management',
    'task_management',
    'basic_reporting',
    'time_tracking',
    'custom_fields',
    'advanced_search',
    'file_attachments',
    'team_collaboration',
    'automation',
    'templates',
    'advanced_reporting',
    'api_access'
  ],
  [LicenseType.Enterprise]: [
    'basic_project_management',
    'task_management',
    'basic_reporting',
    'time_tracking',
    'custom_fields',
    'advanced_search',
    'file_attachments',
    'team_collaboration',
    'automation',
    'templates',
    'advanced_reporting',
    'api_access',
    'sso',
    'advanced_security',
    'audit_logs',
    'admin_controls',
    'integrations',
    'white_labeling',
    'compliance_tools',
    'priority_support'
  ]
};

export const DEFAULT_QUOTA_LIMITS: Record<LicenseType, Record<WorkspaceQuotaType, number>> = {
  [LicenseType.Free]: {
    [WorkspaceQuotaType.Projects]: 3,
    [WorkspaceQuotaType.Users]: 5,
    [WorkspaceQuotaType.Storage]: 500, // MB
    [WorkspaceQuotaType.APIRequests]: 1000, // per day
    [WorkspaceQuotaType.Integrations]: 0
  },
  [LicenseType.Professional]: {
    [WorkspaceQuotaType.Projects]: 25,
    [WorkspaceQuotaType.Users]: 10,
    [WorkspaceQuotaType.Storage]: 5000, // MB
    [WorkspaceQuotaType.APIRequests]: 10000, // per day
    [WorkspaceQuotaType.Integrations]: 3
  },
  [LicenseType.Team]: {
    [WorkspaceQuotaType.Projects]: 100,
    [WorkspaceQuotaType.Users]: 50,
    [WorkspaceQuotaType.Storage]: 25000, // MB
    [WorkspaceQuotaType.APIRequests]: 50000, // per day
    [WorkspaceQuotaType.Integrations]: 10
  },
  [LicenseType.Enterprise]: {
    [WorkspaceQuotaType.Projects]: -1, // unlimited
    [WorkspaceQuotaType.Users]: -1, // unlimited
    [WorkspaceQuotaType.Storage]: 100000, // MB
    [WorkspaceQuotaType.APIRequests]: -1, // unlimited
    [WorkspaceQuotaType.Integrations]: -1 // unlimited
  }
};

export const DEFAULT_SYSTEM_SETTINGS = {
  'general.app_name': 'DevTrack',
  'general.timezone': 'UTC',
  'general.date_format': 'YYYY-MM-DD',
  'general.time_format': '24h',
  'security.session_timeout': '28800', // 8 hours in seconds
  'security.password_expiry_days': '90',
  'security.max_login_attempts': '5',
  'security.lockout_duration': '1800', // 30 minutes in seconds
  'security.mfa_required': 'false',
  'email.smtp_host': '',
  'email.smtp_port': '587',
  'email.smtp_secure': 'true',
  'email.from_address': 'noreply@devtrack.local',
  'email.from_name': 'DevTrack',
  'notifications.email_enabled': 'true',
  'notifications.digest_frequency': 'daily',
  'storage.max_attachment_size': '10485760', // 10MB in bytes
  'storage.allowed_file_types': 'pdf,doc,docx,xls,xlsx,txt,jpg,jpeg,png,gif,zip',
  'api.rate_limit_enabled': 'true',
  'api.rate_limit_requests': '100',
  'api.rate_limit_window': '60', // seconds
  'backup.enabled': 'true',
  'backup.frequency': 'daily',
  'backup.retention_days': '30',
  'audit.retention_days': '365',
  'audit.log_detail_level': 'standard' // minimal, standard, detailed
};
