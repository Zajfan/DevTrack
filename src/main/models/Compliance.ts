/**
 * Compliance.ts
 * 
 * Data models for advanced compliance features including GDPR tools,
 * data retention policies, consent management, legal holds, and
 * SOC2/ISO27001 compliance controls.
 */

// ==================== Enums ====================

export enum DataSubjectRightType {
  AccessRequest = 'access_request',
  DeletionRequest = 'deletion_request',
  PortabilityRequest = 'portability_request',
  RectificationRequest = 'rectification_request',
  RestrictionRequest = 'restriction_request',
  ObjectionRequest = 'objection_request'
}

export enum DataSubjectRequestStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Rejected = 'rejected',
  Expired = 'expired'
}

export enum RetentionPolicyStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended'
}

export enum RetentionAction {
  Delete = 'delete',
  Archive = 'archive',
  Anonymize = 'anonymize',
  Review = 'review'
}

export enum ConsentType {
  Marketing = 'marketing',
  Analytics = 'analytics',
  Personalization = 'personalization',
  ThirdParty = 'third_party',
  DataProcessing = 'data_processing',
  Cookies = 'cookies',
  Custom = 'custom'
}

export enum ConsentStatus {
  Given = 'given',
  Withdrawn = 'withdrawn',
  Expired = 'expired'
}

export enum LegalHoldStatus {
  Active = 'active',
  Released = 'released',
  Pending = 'pending'
}

export enum ComplianceFramework {
  GDPR = 'gdpr',
  SOC2 = 'soc2',
  ISO27001 = 'iso27001',
  HIPAA = 'hipaa',
  CCPA = 'ccpa',
  PCI_DSS = 'pci_dss',
  Custom = 'custom'
}

export enum ControlStatus {
  Implemented = 'implemented',
  PartiallyImplemented = 'partially_implemented',
  NotImplemented = 'not_implemented',
  NotApplicable = 'not_applicable'
}

export enum AssessmentStatus {
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed'
}

// ==================== Interfaces ====================

/**
 * Data Subject Request (GDPR)
 * Manages user rights requests under GDPR/CCPA
 */
export interface DataSubjectRequest {
  id: number;
  userId: number;
  requestType: DataSubjectRightType;
  status: DataSubjectRequestStatus;
  description: string | null;
  requestedAt: Date;
  completedAt: Date | null;
  dueDate: Date; // Typically 30 days from request
  assignedTo: number | null;
  response: string | null;
  exportFilePath: string | null; // For portability requests
  verificationToken: string;
  verifiedAt: Date | null;
  metadata: Record<string, any> | null;
}

export interface CreateDataSubjectRequestData {
  userId: number;
  requestType: DataSubjectRightType;
  description?: string | null;
  metadata?: Record<string, any> | null;
}

export interface UpdateDataSubjectRequestData {
  status?: DataSubjectRequestStatus;
  assignedTo?: number | null;
  response?: string | null;
  exportFilePath?: string | null;
}

/**
 * Data Retention Policy
 * Defines how long data should be retained
 */
export interface DataRetentionPolicy {
  id: number;
  name: string;
  description: string | null;
  entityType: string; // 'users', 'projects', 'tasks', 'audit_logs', etc.
  retentionPeriod: number; // in days
  retentionAction: RetentionAction;
  status: RetentionPolicyStatus;
  conditions: Record<string, any> | null; // Custom conditions for retention
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDataRetentionPolicyData {
  name: string;
  description?: string | null;
  entityType: string;
  retentionPeriod: number;
  retentionAction: RetentionAction;
  conditions?: Record<string, any> | null;
}

export interface UpdateDataRetentionPolicyData {
  name?: string;
  description?: string | null;
  retentionPeriod?: number;
  retentionAction?: RetentionAction;
  status?: RetentionPolicyStatus;
  conditions?: Record<string, any> | null;
}

/**
 * Retention Execution Log
 * Tracks retention policy executions
 */
export interface RetentionExecutionLog {
  id: number;
  policyId: number;
  executedAt: Date;
  itemsProcessed: number;
  itemsDeleted: number;
  itemsArchived: number;
  itemsAnonymized: number;
  errors: Array<{ item: string; error: string }> | null;
  summary: Record<string, any> | null;
}

/**
 * User Consent
 * Tracks user consents for various purposes
 */
export interface UserConsent {
  id: number;
  userId: number;
  consentType: ConsentType;
  status: ConsentStatus;
  givenAt: Date | null;
  withdrawnAt: Date | null;
  expiresAt: Date | null;
  consentText: string;
  consentVersion: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, any> | null;
}

export interface CreateUserConsentData {
  userId: number;
  consentType: ConsentType;
  consentText: string;
  consentVersion: string;
  expiresAt?: Date | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
}

export interface UpdateUserConsentData {
  status?: ConsentStatus;
  expiresAt?: Date | null;
}

/**
 * Legal Hold
 * Prevents data deletion for legal/compliance reasons
 */
export interface LegalHold {
  id: number;
  name: string;
  description: string;
  status: LegalHoldStatus;
  entityType: string;
  entityIds: number[]; // IDs of entities under hold
  reason: string;
  startDate: Date;
  endDate: Date | null;
  createdBy: number;
  createdAt: Date;
  releasedBy: number | null;
  releasedAt: Date | null;
  metadata: Record<string, any> | null;
}

export interface CreateLegalHoldData {
  name: string;
  description: string;
  entityType: string;
  entityIds: number[];
  reason: string;
  startDate: Date;
  endDate?: Date | null;
  metadata?: Record<string, any> | null;
}

export interface UpdateLegalHoldData {
  name?: string;
  description?: string;
  status?: LegalHoldStatus;
  entityIds?: number[];
  endDate?: Date | null;
}

/**
 * Compliance Control
 * Represents a control for SOC2/ISO27001/etc.
 */
export interface ComplianceControl {
  id: number;
  framework: ComplianceFramework;
  controlId: string; // e.g., "CC6.1" for SOC2, "A.5.1" for ISO27001
  controlName: string;
  controlDescription: string;
  category: string;
  status: ControlStatus;
  implementation: string | null;
  evidence: string | null; // Documentation/proof of implementation
  assessmentDate: Date | null;
  nextAssessmentDate: Date | null;
  owner: number | null; // User responsible for this control
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComplianceControlData {
  framework: ComplianceFramework;
  controlId: string;
  controlName: string;
  controlDescription: string;
  category: string;
  status?: ControlStatus;
  implementation?: string | null;
  evidence?: string | null;
  owner?: number | null;
  notes?: string | null;
}

export interface UpdateComplianceControlData {
  controlName?: string;
  controlDescription?: string;
  category?: string;
  status?: ControlStatus;
  implementation?: string | null;
  evidence?: string | null;
  assessmentDate?: Date | null;
  nextAssessmentDate?: Date | null;
  owner?: number | null;
  notes?: string | null;
}

/**
 * Compliance Assessment
 * Periodic compliance audits/assessments
 */
export interface ComplianceAssessment {
  id: number;
  framework: ComplianceFramework;
  name: string;
  description: string | null;
  status: AssessmentStatus;
  scheduledDate: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  assessor: number | null;
  scope: string | null;
  findings: Array<{
    controlId: string;
    finding: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }> | null;
  overallScore: number | null; // 0-100
  passed: boolean | null;
  reportPath: string | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateComplianceAssessmentData {
  framework: ComplianceFramework;
  name: string;
  description?: string | null;
  scheduledDate: Date;
  assessor?: number | null;
  scope?: string | null;
}

export interface UpdateComplianceAssessmentData {
  name?: string;
  description?: string | null;
  status?: AssessmentStatus;
  scheduledDate?: Date;
  assessor?: number | null;
  scope?: string | null;
  findings?: Array<{
    controlId: string;
    finding: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }>;
  overallScore?: number | null;
  passed?: boolean | null;
  reportPath?: string | null;
}

/**
 * Data Processing Activity (GDPR Article 30)
 * Record of processing activities
 */
export interface DataProcessingActivity {
  id: number;
  name: string;
  purpose: string;
  dataCategories: string[]; // Types of data processed
  dataSubjects: string[]; // Categories of data subjects
  recipients: string[]; // Who receives the data
  transfers: string | null; // International transfers
  retentionPeriod: string;
  securityMeasures: string;
  legalBasis: string; // GDPR legal basis
  controller: string; // Data controller details
  processor: string | null; // Data processor details (if applicable)
  dpoContact: string | null; // Data Protection Officer contact
  lastReviewed: Date | null;
  nextReviewDate: Date | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDataProcessingActivityData {
  name: string;
  purpose: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  transfers?: string | null;
  retentionPeriod: string;
  securityMeasures: string;
  legalBasis: string;
  controller: string;
  processor?: string | null;
  dpoContact?: string | null;
}

export interface UpdateDataProcessingActivityData {
  name?: string;
  purpose?: string;
  dataCategories?: string[];
  dataSubjects?: string[];
  recipients?: string[];
  transfers?: string | null;
  retentionPeriod?: string;
  securityMeasures?: string;
  legalBasis?: string;
  controller?: string;
  processor?: string | null;
  dpoContact?: string | null;
  lastReviewed?: Date | null;
  nextReviewDate?: Date | null;
}

/**
 * Compliance Dashboard Statistics
 */
export interface ComplianceDashboardStats {
  gdpr: {
    pendingRequests: number;
    completedRequests: number;
    averageResponseTime: number; // in days
    consentRate: number; // percentage
    activeConsents: number;
  };
  retention: {
    activePolicies: number;
    itemsDueForDeletion: number;
    lastExecutionDate: Date | null;
  };
  legalHolds: {
    activeHolds: number;
    itemsUnderHold: number;
  };
  controls: {
    totalControls: number;
    implemented: number;
    partiallyImplemented: number;
    notImplemented: number;
    complianceScore: number; // percentage
  };
  assessments: {
    scheduled: number;
    inProgress: number;
    completed: number;
    lastAssessmentDate: Date | null;
    nextAssessmentDate: Date | null;
  };
}

// ==================== Default Values ====================

/**
 * Default SOC2 Controls (Trust Services Criteria)
 */
export const DEFAULT_SOC2_CONTROLS: Array<Omit<CreateComplianceControlData, 'framework'>> = [
  {
    controlId: 'CC1.1',
    controlName: 'Organization demonstrates commitment to integrity and ethical values',
    controlDescription: 'The entity demonstrates a commitment to integrity and ethical values.',
    category: 'Control Environment',
    status: ControlStatus.NotImplemented
  },
  {
    controlId: 'CC2.1',
    controlName: 'Management establishes organizational structure',
    controlDescription: 'The entity establishes organizational structures, reporting lines, and authorities.',
    category: 'Communication and Information',
    status: ControlStatus.NotImplemented
  },
  {
    controlId: 'CC6.1',
    controlName: 'Logical and physical access controls',
    controlDescription: 'The entity implements logical and physical access controls to protect against unauthorized access.',
    category: 'Logical and Physical Access Controls',
    status: ControlStatus.NotImplemented
  },
  {
    controlId: 'CC7.2',
    controlName: 'System monitoring',
    controlDescription: 'The entity monitors system components and the operation of those components.',
    category: 'System Operations',
    status: ControlStatus.NotImplemented
  },
  {
    controlId: 'CC8.1',
    controlName: 'Change management',
    controlDescription: 'The entity authorizes, designs, develops, tests, and implements changes to infrastructure and software.',
    category: 'Change Management',
    status: ControlStatus.NotImplemented
  }
];

/**
 * Default ISO 27001 Controls
 */
export const DEFAULT_ISO27001_CONTROLS: Array<Omit<CreateComplianceControlData, 'framework'>> = [
  {
    controlId: 'A.5.1',
    controlName: 'Information security policies',
    controlDescription: 'Management direction for information security in accordance with business requirements.',
    category: 'Organizational Controls',
    status: ControlStatus.NotImplemented
  },
  {
    controlId: 'A.6.1',
    controlName: 'Screening',
    controlDescription: 'Background verification checks on all candidates for employment.',
    category: 'People Controls',
    status: ControlStatus.NotImplemented
  },
  {
    controlId: 'A.8.1',
    controlName: 'User endpoint devices',
    controlDescription: 'Information stored on, processed by or accessible via user endpoint devices shall be protected.',
    category: 'Technological Controls',
    status: ControlStatus.NotImplemented
  },
  {
    controlId: 'A.8.2',
    controlName: 'Privileged access rights',
    controlDescription: 'The allocation and use of privileged access rights shall be restricted and managed.',
    category: 'Technological Controls',
    status: ControlStatus.NotImplemented
  },
  {
    controlId: 'A.8.10',
    controlName: 'Information deletion',
    controlDescription: 'Information stored in information systems, devices or in any other storage media shall be deleted when no longer required.',
    category: 'Technological Controls',
    status: ControlStatus.NotImplemented
  }
];

/**
 * Default GDPR Legal Bases
 */
export const GDPR_LEGAL_BASES = [
  'Consent',
  'Contract',
  'Legal obligation',
  'Vital interests',
  'Public task',
  'Legitimate interests'
];

/**
 * Default Data Subject Request Response Time (days)
 */
export const DEFAULT_DSR_RESPONSE_TIME = 30; // GDPR requires 30 days
