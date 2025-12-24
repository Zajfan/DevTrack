/**
 * Integration.ts
 * 
 * Data models for enterprise integrations including LDAP/AD sync,
 * SSO provider connectors, webhooks, and external service integrations.
 */

// ==================== Enums ====================

export enum IntegrationType {
  LDAP = 'ldap',
  ActiveDirectory = 'active_directory',
  Okta = 'okta',
  AzureAD = 'azure_ad',
  GoogleWorkspace = 'google_workspace',
  SAML = 'saml',
  OAuth2 = 'oauth2',
  Webhook = 'webhook',
  Slack = 'slack',
  MicrosoftTeams = 'microsoft_teams',
  Jira = 'jira',
  GitHub = 'github',
  GitLab = 'gitlab',
  Custom = 'custom'
}

export enum IntegrationStatus {
  Active = 'active',
  Inactive = 'inactive',
  Error = 'error',
  Syncing = 'syncing',
  Paused = 'paused'
}

export enum WebhookEvent {
  ProjectCreated = 'project.created',
  ProjectUpdated = 'project.updated',
  ProjectDeleted = 'project.deleted',
  TaskCreated = 'task.created',
  TaskUpdated = 'task.updated',
  TaskDeleted = 'task.deleted',
  TaskCompleted = 'task.completed',
  CommentCreated = 'comment.created',
  UserCreated = 'user.created',
  UserUpdated = 'user.updated',
  UserDeleted = 'user.deleted',
  All = '*'
}

export enum SyncDirection {
  Import = 'import',
  Export = 'export',
  Bidirectional = 'bidirectional'
}

export enum SyncStatus {
  Idle = 'idle',
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  PartialSuccess = 'partial_success'
}

export enum RateLimitStrategy {
  FixedWindow = 'fixed_window',
  SlidingWindow = 'sliding_window',
  TokenBucket = 'token_bucket',
  LeakyBucket = 'leaky_bucket'
}

// ==================== Interfaces ====================

/**
 * Integration Configuration
 * Base configuration for all integration types
 */
export interface Integration {
  id: number;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  config: Record<string, any>;
  credentials: Record<string, any> | null;
  syncEnabled: boolean;
  syncDirection: SyncDirection | null;
  syncFrequency: number | null; // in minutes
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any> | null;
}

export interface CreateIntegrationData {
  name: string;
  type: IntegrationType;
  config: Record<string, any>;
  credentials?: Record<string, any> | null;
  syncEnabled?: boolean;
  syncDirection?: SyncDirection | null;
  syncFrequency?: number | null;
}

export interface UpdateIntegrationData {
  name?: string;
  status?: IntegrationStatus;
  config?: Record<string, any>;
  credentials?: Record<string, any> | null;
  syncEnabled?: boolean;
  syncDirection?: SyncDirection | null;
  syncFrequency?: number | null;
}

/**
 * LDAP/Active Directory Configuration
 */
export interface LDAPConfig {
  host: string;
  port: number;
  baseDN: string;
  bindDN: string;
  bindPassword: string;
  userSearchBase: string;
  userSearchFilter: string;
  groupSearchBase: string;
  groupSearchFilter: string;
  useTLS: boolean;
  tlsCertificate?: string;
  attributes: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    memberOf: string;
  };
}

/**
 * SSO Provider Configuration
 */
export interface SSOProviderConfig {
  providerId: string;
  providerName: string;
  clientId: string;
  clientSecret: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  callbackUrl: string;
  scopes?: string[];
  customParams?: Record<string, any>;
}

/**
 * Webhook Configuration
 */
export interface Webhook {
  id: number;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string | null;
  active: boolean;
  headers: Record<string, string> | null;
  retryAttempts: number;
  retryDelay: number; // seconds
  timeout: number; // seconds
  lastTriggeredAt: Date | null;
  lastStatus: number | null;
  lastError: string | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebhookData {
  name: string;
  url: string;
  events: WebhookEvent[];
  secret?: string | null;
  headers?: Record<string, string> | null;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface UpdateWebhookData {
  name?: string;
  url?: string;
  events?: WebhookEvent[];
  secret?: string | null;
  active?: boolean;
  headers?: Record<string, string> | null;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Webhook Delivery Log
 */
export interface WebhookDelivery {
  id: number;
  webhookId: number;
  event: WebhookEvent;
  payload: Record<string, any>;
  status: number;
  duration: number; // milliseconds
  attempt: number;
  response: string | null;
  error: string | null;
  deliveredAt: Date;
}

/**
 * Sync Job
 * Tracks synchronization operations with external systems
 */
export interface SyncJob {
  id: number;
  integrationId: number;
  status: SyncStatus;
  direction: SyncDirection;
  startedAt: Date;
  completedAt: Date | null;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  errors: Array<{ item: string; error: string }> | null;
  summary: Record<string, any> | null;
}

export interface SyncJobFilters {
  integrationId?: number;
  status?: SyncStatus;
  startedAfter?: Date;
  startedBefore?: Date;
  limit?: number;
}

/**
 * API Rate Limiting
 */
export interface RateLimitConfig {
  id: number;
  apiKeyId: number | null;
  userId: number | null;
  organizationId: number | null;
  strategy: RateLimitStrategy;
  maxRequests: number;
  windowSize: number; // seconds
  burstSize: number | null; // for token bucket
  refillRate: number | null; // tokens per second for token bucket
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRateLimitData {
  apiKeyId?: number | null;
  userId?: number | null;
  organizationId?: number | null;
  strategy: RateLimitStrategy;
  maxRequests: number;
  windowSize: number;
  burstSize?: number | null;
  refillRate?: number | null;
}

export interface RateLimitState {
  requests: number;
  resetAt: Date;
  tokens: number | null; // for token bucket
  lastRefill: Date | null; // for token bucket
}

/**
 * Data Import/Export
 */
export enum ImportExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  Excel = 'excel'
}

export enum ImportExportStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed'
}

export interface ImportExportJob {
  id: number;
  type: 'import' | 'export';
  format: ImportExportFormat;
  entityType: string; // 'projects', 'tasks', 'users', etc.
  status: ImportExportStatus;
  filePath: string;
  totalRecords: number | null;
  processedRecords: number;
  successCount: number;
  failureCount: number;
  errors: Array<{ row: number; error: string }> | null;
  mapping: Record<string, string> | null; // Column mapping
  options: Record<string, any> | null;
  createdBy: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface CreateImportExportJobData {
  type: 'import' | 'export';
  format: ImportExportFormat;
  entityType: string;
  filePath: string;
  mapping?: Record<string, string> | null;
  options?: Record<string, any> | null;
}

/**
 * External Service Integration
 * For integrating with third-party services like Slack, Jira, etc.
 */
export interface ExternalService {
  id: number;
  integrationId: number;
  serviceType: IntegrationType;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  scopes: string[];
  features: string[]; // Enabled features for this service
  config: Record<string, any>;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Integration Event Log
 * Tracks all integration-related events
 */
export interface IntegrationEvent {
  id: number;
  integrationId: number;
  eventType: string;
  eventData: Record<string, any>;
  status: 'success' | 'error' | 'warning';
  message: string;
  timestamp: Date;
}

// ==================== Default Configurations ====================

export const DEFAULT_LDAP_CONFIG: Partial<LDAPConfig> = {
  port: 389,
  useTLS: true,
  attributes: {
    username: 'uid',
    email: 'mail',
    firstName: 'givenName',
    lastName: 'sn',
    memberOf: 'memberOf'
  }
};

export const DEFAULT_WEBHOOK_CONFIG = {
  retryAttempts: 3,
  retryDelay: 60, // seconds
  timeout: 30 // seconds
};

export const DEFAULT_RATE_LIMIT_CONFIG = {
  strategy: RateLimitStrategy.FixedWindow,
  maxRequests: 1000,
  windowSize: 3600, // 1 hour in seconds
  burstSize: null,
  refillRate: null
};

export const DEFAULT_SYNC_FREQUENCY = 60; // minutes

/**
 * Integration Templates
 * Pre-configured integration settings for popular services
 */
export const INTEGRATION_TEMPLATES: Record<string, Partial<CreateIntegrationData>> = {
  okta: {
    type: IntegrationType.Okta,
    config: {
      authorizationUrl: 'https://{domain}/oauth2/v1/authorize',
      tokenUrl: 'https://{domain}/oauth2/v1/token',
      userInfoUrl: 'https://{domain}/oauth2/v1/userinfo',
      scopes: ['openid', 'profile', 'email', 'groups']
    }
  },
  azure_ad: {
    type: IntegrationType.AzureAD,
    config: {
      authorizationUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['openid', 'profile', 'email', 'User.Read']
    }
  },
  google_workspace: {
    type: IntegrationType.GoogleWorkspace,
    config: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
      scopes: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/admin.directory.user.readonly']
    }
  },
  slack: {
    type: IntegrationType.Slack,
    config: {
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      scopes: ['channels:read', 'chat:write', 'users:read', 'team:read']
    }
  },
  jira: {
    type: IntegrationType.Jira,
    config: {
      authorizationUrl: 'https://auth.atlassian.com/authorize',
      tokenUrl: 'https://auth.atlassian.com/oauth/token',
      scopes: ['read:jira-user', 'read:jira-work', 'write:jira-work']
    }
  },
  github: {
    type: IntegrationType.GitHub,
    config: {
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      userInfoUrl: 'https://api.github.com/user',
      scopes: ['user', 'repo', 'read:org']
    }
  }
};
