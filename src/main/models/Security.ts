/**
 * Security and Authentication Models
 */

export enum AuthProvider {
  Local = 'local',
  SAML = 'saml',
  OAuth2 = 'oauth2',
  LDAP = 'ldap',
  ActiveDirectory = 'ad',
}

export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  Email = 'email',
  Backup = 'backup',
}

export enum SecurityEventType {
  Login = 'login',
  LoginFailed = 'login_failed',
  Logout = 'logout',
  PasswordChange = 'password_change',
  MFAEnabled = 'mfa_enabled',
  MFADisabled = 'mfa_disabled',
  PasswordReset = 'password_reset',
  AccountLocked = 'account_locked',
  AccountUnlocked = 'account_unlocked',
  SuspiciousActivity = 'suspicious_activity',
  APIKeyCreated = 'api_key_created',
  APIKeyRevoked = 'api_key_revoked',
  PermissionChanged = 'permission_changed',
  RoleChanged = 'role_changed',
}

export interface UserCredentials {
  id: number;
  userId: number;
  authProvider: AuthProvider;
  passwordHash?: string; // bcrypt hash for local auth
  passwordSalt?: string;
  lastPasswordChange?: string;
  passwordExpiresAt?: string;
  failedLoginAttempts: number;
  accountLockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MFAConfig {
  id: number;
  userId: number;
  method: MFAMethod;
  isEnabled: boolean;
  secret?: string; // TOTP secret
  backupCodes?: string[]; // Encrypted backup codes
  phoneNumber?: string; // For SMS
  emailAddress?: string; // For email
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSession {
  id: string; // UUID
  userId: number;
  authProvider: AuthProvider;
  ipAddress: string;
  userAgent: string;
  refreshToken: string;
  accessToken: string;
  expiresAt: string;
  createdAt: string;
  lastActivityAt: string;
  isActive: boolean;
}

export interface SecurityEvent {
  id: number;
  userId?: number;
  eventType: SecurityEventType;
  ipAddress: string;
  userAgent: string;
  description: string;
  metadata?: string; // JSON metadata
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
}

export interface SSOConfig {
  id: number;
  provider: AuthProvider;
  name: string;
  isEnabled: boolean;
  // SAML
  samlEntryPoint?: string;
  samlIssuer?: string;
  samlCert?: string;
  samlSignatureAlgorithm?: string;
  // OAuth2
  oauth2ClientId?: string;
  oauth2ClientSecret?: string;
  oauth2AuthUrl?: string;
  oauth2TokenUrl?: string;
  oauth2Scope?: string;
  // LDAP/AD
  ldapUrl?: string;
  ldapBindDn?: string;
  ldapBindPassword?: string;
  ldapBaseDn?: string;
  ldapUserFilter?: string;
  ldapGroupFilter?: string;
  // Common
  autoProvisionUsers: boolean;
  defaultRole?: string;
  attributeMapping?: string; // JSON mapping
  createdAt: string;
  updatedAt: string;
}

export interface PasswordPolicy {
  id: number;
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventReuse: number; // Last N passwords
  expiryDays: number; // 0 = never expires
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  requireMFA: boolean;
  allowedDomains?: string[]; // Email domain restrictions
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IPWhitelist {
  id: number;
  ipAddress: string; // Single IP or CIDR notation
  description?: string;
  isEnabled: boolean;
  createdBy: number;
  createdAt: string;
  expiresAt?: string;
}

export interface APIKey {
  id: number;
  userId: number;
  name: string;
  keyHash: string; // Hashed API key
  keyPrefix: string; // First 8 chars for identification
  scopes: string[]; // Permissions
  rateLimit?: number; // Requests per hour
  expiresAt?: string;
  lastUsedAt?: string;
  isActive: boolean;
  createdAt: string;
  revokedAt?: string;
  revokedBy?: number;
}

export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number; // Minutes
  inactiveSessionTimeout: number; // Minutes
  enableIPWhitelist: boolean;
  enableMFA: boolean;
  forceMFAForAdmins: boolean;
  allowPasswordLogin: boolean;
  allowSSOLogin: boolean;
  enableAPIKeys: boolean;
  maxActiveSessions: number;
  enableSecurityEvents: boolean;
  securityEventRetentionDays: number;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  id: 1,
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventReuse: 5,
  expiryDays: 90,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  requireMFA: false,
  allowedDomains: [],
  isDefault: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  passwordPolicy: DEFAULT_PASSWORD_POLICY,
  sessionTimeout: 480, // 8 hours
  inactiveSessionTimeout: 60, // 1 hour
  enableIPWhitelist: false,
  enableMFA: true,
  forceMFAForAdmins: true,
  allowPasswordLogin: true,
  allowSSOLogin: true,
  enableAPIKeys: true,
  maxActiveSessions: 5,
  enableSecurityEvents: true,
  securityEventRetentionDays: 365,
};
