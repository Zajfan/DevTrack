/**
 * ComplianceManager.ts
 * 
 * Service for managing compliance features including GDPR data subject rights,
 * data retention policies, consent management, legal holds, and SOC2/ISO27001 controls.
 */

import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import {
  DataSubjectRequest,
  CreateDataSubjectRequestData,
  UpdateDataSubjectRequestData,
  DataSubjectRightType,
  DataSubjectRequestStatus,
  DataRetentionPolicy,
  CreateDataRetentionPolicyData,
  UpdateDataRetentionPolicyData,
  RetentionPolicyStatus,
  RetentionAction,
  RetentionExecutionLog,
  UserConsent,
  CreateUserConsentData,
  UpdateUserConsentData,
  ConsentType,
  ConsentStatus,
  LegalHold,
  CreateLegalHoldData,
  UpdateLegalHoldData,
  LegalHoldStatus,
  ComplianceControl,
  CreateComplianceControlData,
  UpdateComplianceControlData,
  ComplianceFramework,
  ControlStatus,
  ComplianceAssessment,
  CreateComplianceAssessmentData,
  UpdateComplianceAssessmentData,
  AssessmentStatus,
  DataProcessingActivity,
  CreateDataProcessingActivityData,
  UpdateDataProcessingActivityData,
  ComplianceDashboardStats,
  DEFAULT_DSR_RESPONSE_TIME
} from '../models/Compliance';

export class ComplianceManager {
  constructor(private db: Database.Database) {
    this.initializeTables();
  }

  // ==================== Database Initialization ====================

  private initializeTables(): void {
    // Data subject requests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data_subject_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        request_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        description TEXT,
        requested_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        due_date TEXT NOT NULL,
        assigned_to INTEGER,
        response TEXT,
        export_file_path TEXT,
        verification_token TEXT NOT NULL,
        verified_at TEXT,
        metadata TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_dsr_user ON data_subject_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status);
      CREATE INDEX IF NOT EXISTS idx_dsr_type ON data_subject_requests(request_type);
    `);

    // Data retention policies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data_retention_policies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        entity_type TEXT NOT NULL,
        retention_period INTEGER NOT NULL,
        retention_action TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        conditions TEXT,
        last_run_at TEXT,
        next_run_at TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_retention_entity_type ON data_retention_policies(entity_type);
      CREATE INDEX IF NOT EXISTS idx_retention_status ON data_retention_policies(status);
    `);

    // Retention execution logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS retention_execution_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        policy_id INTEGER NOT NULL,
        executed_at TEXT NOT NULL DEFAULT (datetime('now')),
        items_processed INTEGER NOT NULL,
        items_deleted INTEGER NOT NULL DEFAULT 0,
        items_archived INTEGER NOT NULL DEFAULT 0,
        items_anonymized INTEGER NOT NULL DEFAULT 0,
        errors TEXT,
        summary TEXT,
        FOREIGN KEY (policy_id) REFERENCES data_retention_policies(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_retention_logs_policy ON retention_execution_logs(policy_id);
      CREATE INDEX IF NOT EXISTS idx_retention_logs_executed ON retention_execution_logs(executed_at);
    `);

    // User consents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_consents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        consent_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'given',
        given_at TEXT,
        withdrawn_at TEXT,
        expires_at TEXT,
        consent_text TEXT NOT NULL,
        consent_version TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        metadata TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_consents_user ON user_consents(user_id);
      CREATE INDEX IF NOT EXISTS idx_consents_type ON user_consents(consent_type);
      CREATE INDEX IF NOT EXISTS idx_consents_status ON user_consents(status);
    `);

    // Legal holds table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS legal_holds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        entity_type TEXT NOT NULL,
        entity_ids TEXT NOT NULL,
        reason TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        released_by INTEGER,
        released_at TEXT,
        metadata TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (released_by) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_legal_holds_status ON legal_holds(status);
      CREATE INDEX IF NOT EXISTS idx_legal_holds_entity_type ON legal_holds(entity_type);
    `);

    // Compliance controls table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS compliance_controls (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        framework TEXT NOT NULL,
        control_id TEXT NOT NULL,
        control_name TEXT NOT NULL,
        control_description TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'not_implemented',
        implementation TEXT,
        evidence TEXT,
        assessment_date TEXT,
        next_assessment_date TEXT,
        owner INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (owner) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(framework, control_id)
      );
      CREATE INDEX IF NOT EXISTS idx_controls_framework ON compliance_controls(framework);
      CREATE INDEX IF NOT EXISTS idx_controls_status ON compliance_controls(status);
    `);

    // Compliance assessments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS compliance_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        framework TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled',
        scheduled_date TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        assessor INTEGER,
        scope TEXT,
        findings TEXT,
        overall_score INTEGER,
        passed INTEGER,
        report_path TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (assessor) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_assessments_framework ON compliance_assessments(framework);
      CREATE INDEX IF NOT EXISTS idx_assessments_status ON compliance_assessments(status);
      CREATE INDEX IF NOT EXISTS idx_assessments_scheduled ON compliance_assessments(scheduled_date);
    `);

    // Data processing activities table (GDPR Article 30)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS data_processing_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        purpose TEXT NOT NULL,
        data_categories TEXT NOT NULL,
        data_subjects TEXT NOT NULL,
        recipients TEXT NOT NULL,
        transfers TEXT,
        retention_period TEXT NOT NULL,
        security_measures TEXT NOT NULL,
        legal_basis TEXT NOT NULL,
        controller TEXT NOT NULL,
        processor TEXT,
        dpo_contact TEXT,
        last_reviewed TEXT,
        next_review_date TEXT,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dpa_created_by ON data_processing_activities(created_by);
    `);
  }

  // ==================== Data Subject Requests (GDPR) ====================

  createDataSubjectRequest(data: CreateDataSubjectRequestData): DataSubjectRequest {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + DEFAULT_DSR_RESPONSE_TIME);

    const stmt = this.db.prepare(`
      INSERT INTO data_subject_requests (
        user_id, request_type, description, due_date, verification_token, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.userId,
      data.requestType,
      data.description || null,
      dueDate.toISOString(),
      verificationToken,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return this.getDataSubjectRequest(result.lastInsertRowid as number)!;
  }

  getDataSubjectRequest(id: number): DataSubjectRequest | null {
    const stmt = this.db.prepare('SELECT * FROM data_subject_requests WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToDataSubjectRequest(row) : null;
  }

  getUserDataSubjectRequests(userId: number): DataSubjectRequest[] {
    const stmt = this.db.prepare('SELECT * FROM data_subject_requests WHERE user_id = ? ORDER BY requested_at DESC');
    const rows = stmt.all(userId);
    return rows.map(row => this.mapRowToDataSubjectRequest(row));
  }

  getAllDataSubjectRequests(status?: DataSubjectRequestStatus): DataSubjectRequest[] {
    let query = 'SELECT * FROM data_subject_requests';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY requested_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToDataSubjectRequest(row));
  }

  updateDataSubjectRequest(id: number, data: UpdateDataSubjectRequestData): DataSubjectRequest | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);

      if (data.status === DataSubjectRequestStatus.Completed) {
        updates.push('completed_at = datetime(\'now\')');
      }
    }
    if (data.assignedTo !== undefined) {
      updates.push('assigned_to = ?');
      values.push(data.assignedTo);
    }
    if (data.response !== undefined) {
      updates.push('response = ?');
      values.push(data.response);
    }
    if (data.exportFilePath !== undefined) {
      updates.push('export_file_path = ?');
      values.push(data.exportFilePath);
    }

    if (updates.length === 0) return this.getDataSubjectRequest(id);

    values.push(id);

    const stmt = this.db.prepare(`UPDATE data_subject_requests SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getDataSubjectRequest(id);
  }

  verifyDataSubjectRequest(id: number, token: string): boolean {
    const request = this.getDataSubjectRequest(id);
    if (!request || request.verificationToken !== token) return false;

    const stmt = this.db.prepare('UPDATE data_subject_requests SET verified_at = datetime(\'now\') WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Data Retention Policies ====================

  createDataRetentionPolicy(data: CreateDataRetentionPolicyData, createdBy: number): DataRetentionPolicy {
    const stmt = this.db.prepare(`
      INSERT INTO data_retention_policies (
        name, description, entity_type, retention_period, retention_action, conditions, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.description || null,
      data.entityType,
      data.retentionPeriod,
      data.retentionAction,
      data.conditions ? JSON.stringify(data.conditions) : null,
      createdBy
    );

    return this.getDataRetentionPolicy(result.lastInsertRowid as number)!;
  }

  getDataRetentionPolicy(id: number): DataRetentionPolicy | null {
    const stmt = this.db.prepare('SELECT * FROM data_retention_policies WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToDataRetentionPolicy(row) : null;
  }

  getAllDataRetentionPolicies(status?: RetentionPolicyStatus): DataRetentionPolicy[] {
    let query = 'SELECT * FROM data_retention_policies';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY entity_type, created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToDataRetentionPolicy(row));
  }

  updateDataRetentionPolicy(id: number, data: UpdateDataRetentionPolicyData): DataRetentionPolicy | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.retentionPeriod !== undefined) {
      updates.push('retention_period = ?');
      values.push(data.retentionPeriod);
    }
    if (data.retentionAction !== undefined) {
      updates.push('retention_action = ?');
      values.push(data.retentionAction);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.conditions !== undefined) {
      updates.push('conditions = ?');
      values.push(data.conditions ? JSON.stringify(data.conditions) : null);
    }

    if (updates.length === 0) return this.getDataRetentionPolicy(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE data_retention_policies SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getDataRetentionPolicy(id);
  }

  deleteDataRetentionPolicy(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM data_retention_policies WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  logRetentionExecution(
    policyId: number,
    itemsProcessed: number,
    itemsDeleted: number,
    itemsArchived: number,
    itemsAnonymized: number,
    errors?: Array<{ item: string; error: string }>,
    summary?: Record<string, any>
  ): RetentionExecutionLog {
    const stmt = this.db.prepare(`
      INSERT INTO retention_execution_logs (
        policy_id, items_processed, items_deleted, items_archived, items_anonymized, errors, summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      policyId,
      itemsProcessed,
      itemsDeleted,
      itemsArchived,
      itemsAnonymized,
      errors ? JSON.stringify(errors) : null,
      summary ? JSON.stringify(summary) : null
    );

    // Update policy last run time
    const updateStmt = this.db.prepare('UPDATE data_retention_policies SET last_run_at = datetime(\'now\') WHERE id = ?');
    updateStmt.run(policyId);

    return this.getRetentionExecutionLog(result.lastInsertRowid as number)!;
  }

  getRetentionExecutionLog(id: number): RetentionExecutionLog | null {
    const stmt = this.db.prepare('SELECT * FROM retention_execution_logs WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToRetentionExecutionLog(row) : null;
  }

  getRetentionExecutionLogs(policyId: number, limit: number = 100): RetentionExecutionLog[] {
    const stmt = this.db.prepare('SELECT * FROM retention_execution_logs WHERE policy_id = ? ORDER BY executed_at DESC LIMIT ?');
    const rows = stmt.all(policyId, limit);
    return rows.map(row => this.mapRowToRetentionExecutionLog(row));
  }

  // ==================== User Consents ====================

  createUserConsent(data: CreateUserConsentData): UserConsent {
    const stmt = this.db.prepare(`
      INSERT INTO user_consents (
        user_id, consent_type, given_at, expires_at, consent_text, consent_version,
        ip_address, user_agent, metadata
      ) VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.userId,
      data.consentType,
      data.expiresAt ? data.expiresAt.toISOString() : null,
      data.consentText,
      data.consentVersion,
      data.ipAddress || null,
      data.userAgent || null,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return this.getUserConsent(result.lastInsertRowid as number)!;
  }

  getUserConsent(id: number): UserConsent | null {
    const stmt = this.db.prepare('SELECT * FROM user_consents WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToUserConsent(row) : null;
  }

  getUserConsents(userId: number, consentType?: ConsentType): UserConsent[] {
    let query = 'SELECT * FROM user_consents WHERE user_id = ?';
    const params: any[] = [userId];

    if (consentType) {
      query += ' AND consent_type = ?';
      params.push(consentType);
    }

    query += ' ORDER BY given_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToUserConsent(row));
  }

  updateUserConsent(id: number, data: UpdateUserConsentData): UserConsent | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);

      if (data.status === ConsentStatus.Withdrawn) {
        updates.push('withdrawn_at = datetime(\'now\')');
      }
    }
    if (data.expiresAt !== undefined) {
      updates.push('expires_at = ?');
      values.push(data.expiresAt ? data.expiresAt.toISOString() : null);
    }

    if (updates.length === 0) return this.getUserConsent(id);

    values.push(id);

    const stmt = this.db.prepare(`UPDATE user_consents SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getUserConsent(id);
  }

  withdrawUserConsent(userId: number, consentType: ConsentType): boolean {
    const stmt = this.db.prepare(`
      UPDATE user_consents 
      SET status = ?, withdrawn_at = datetime('now')
      WHERE user_id = ? AND consent_type = ? AND status = ?
    `);
    const result = stmt.run(ConsentStatus.Withdrawn, userId, consentType, ConsentStatus.Given);
    return result.changes > 0;
  }

  // ==================== Legal Holds ====================

  createLegalHold(data: CreateLegalHoldData, createdBy: number): LegalHold {
    const stmt = this.db.prepare(`
      INSERT INTO legal_holds (
        name, description, entity_type, entity_ids, reason, start_date, end_date, created_by, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.description,
      data.entityType,
      JSON.stringify(data.entityIds),
      data.reason,
      data.startDate.toISOString(),
      data.endDate ? data.endDate.toISOString() : null,
      createdBy,
      data.metadata ? JSON.stringify(data.metadata) : null
    );

    return this.getLegalHold(result.lastInsertRowid as number)!;
  }

  getLegalHold(id: number): LegalHold | null {
    const stmt = this.db.prepare('SELECT * FROM legal_holds WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToLegalHold(row) : null;
  }

  getAllLegalHolds(status?: LegalHoldStatus): LegalHold[] {
    let query = 'SELECT * FROM legal_holds';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY start_date DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToLegalHold(row));
  }

  updateLegalHold(id: number, data: UpdateLegalHoldData): LegalHold | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.entityIds !== undefined) {
      updates.push('entity_ids = ?');
      values.push(JSON.stringify(data.entityIds));
    }
    if (data.endDate !== undefined) {
      updates.push('end_date = ?');
      values.push(data.endDate ? data.endDate.toISOString() : null);
    }

    if (updates.length === 0) return this.getLegalHold(id);

    values.push(id);

    const stmt = this.db.prepare(`UPDATE legal_holds SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getLegalHold(id);
  }

  releaseLegalHold(id: number, releasedBy: number): boolean {
    const stmt = this.db.prepare(`
      UPDATE legal_holds 
      SET status = ?, released_by = ?, released_at = datetime('now')
      WHERE id = ?
    `);
    const result = stmt.run(LegalHoldStatus.Released, releasedBy, id);
    return result.changes > 0;
  }

  isEntityUnderHold(entityType: string, entityId: number): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM legal_holds 
      WHERE status = ? AND entity_type = ? AND entity_ids LIKE ?
    `);
    const result = stmt.get(LegalHoldStatus.Active, entityType, `%${entityId}%`) as { count: number };
    return result.count > 0;
  }

  // ==================== Compliance Controls ====================

  createComplianceControl(data: CreateComplianceControlData): ComplianceControl {
    const stmt = this.db.prepare(`
      INSERT INTO compliance_controls (
        framework, control_id, control_name, control_description, category,
        status, implementation, evidence, owner, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.framework,
      data.controlId,
      data.controlName,
      data.controlDescription,
      data.category,
      data.status || ControlStatus.NotImplemented,
      data.implementation || null,
      data.evidence || null,
      data.owner || null,
      data.notes || null
    );

    return this.getComplianceControl(result.lastInsertRowid as number)!;
  }

  getComplianceControl(id: number): ComplianceControl | null {
    const stmt = this.db.prepare('SELECT * FROM compliance_controls WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToComplianceControl(row) : null;
  }

  getComplianceControlsByFramework(framework: ComplianceFramework): ComplianceControl[] {
    const stmt = this.db.prepare('SELECT * FROM compliance_controls WHERE framework = ? ORDER BY control_id');
    const rows = stmt.all(framework);
    return rows.map(row => this.mapRowToComplianceControl(row));
  }

  getAllComplianceControls(): ComplianceControl[] {
    const stmt = this.db.prepare('SELECT * FROM compliance_controls ORDER BY framework, control_id');
    const rows = stmt.all();
    return rows.map(row => this.mapRowToComplianceControl(row));
  }

  updateComplianceControl(id: number, data: UpdateComplianceControlData): ComplianceControl | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.controlName !== undefined) {
      updates.push('control_name = ?');
      values.push(data.controlName);
    }
    if (data.controlDescription !== undefined) {
      updates.push('control_description = ?');
      values.push(data.controlDescription);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.implementation !== undefined) {
      updates.push('implementation = ?');
      values.push(data.implementation);
    }
    if (data.evidence !== undefined) {
      updates.push('evidence = ?');
      values.push(data.evidence);
    }
    if (data.assessmentDate !== undefined) {
      updates.push('assessment_date = ?');
      values.push(data.assessmentDate ? data.assessmentDate.toISOString() : null);
    }
    if (data.nextAssessmentDate !== undefined) {
      updates.push('next_assessment_date = ?');
      values.push(data.nextAssessmentDate ? data.nextAssessmentDate.toISOString() : null);
    }
    if (data.owner !== undefined) {
      updates.push('owner = ?');
      values.push(data.owner);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }

    if (updates.length === 0) return this.getComplianceControl(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE compliance_controls SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getComplianceControl(id);
  }

  deleteComplianceControl(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM compliance_controls WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Compliance Assessments ====================

  createComplianceAssessment(data: CreateComplianceAssessmentData, createdBy: number): ComplianceAssessment {
    const stmt = this.db.prepare(`
      INSERT INTO compliance_assessments (
        framework, name, description, scheduled_date, assessor, scope, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.framework,
      data.name,
      data.description || null,
      data.scheduledDate.toISOString(),
      data.assessor || null,
      data.scope || null,
      createdBy
    );

    return this.getComplianceAssessment(result.lastInsertRowid as number)!;
  }

  getComplianceAssessment(id: number): ComplianceAssessment | null {
    const stmt = this.db.prepare('SELECT * FROM compliance_assessments WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToComplianceAssessment(row) : null;
  }

  getAllComplianceAssessments(framework?: ComplianceFramework): ComplianceAssessment[] {
    let query = 'SELECT * FROM compliance_assessments';
    const params: any[] = [];

    if (framework) {
      query += ' WHERE framework = ?';
      params.push(framework);
    }

    query += ' ORDER BY scheduled_date DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(row => this.mapRowToComplianceAssessment(row));
  }

  updateComplianceAssessment(id: number, data: UpdateComplianceAssessmentData): ComplianceAssessment | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);

      if (data.status === AssessmentStatus.InProgress && !updates.includes('started_at')) {
        updates.push('started_at = datetime(\'now\')');
      } else if (data.status === AssessmentStatus.Completed && !updates.includes('completed_at')) {
        updates.push('completed_at = datetime(\'now\')');
      }
    }
    if (data.scheduledDate !== undefined) {
      updates.push('scheduled_date = ?');
      values.push(data.scheduledDate.toISOString());
    }
    if (data.assessor !== undefined) {
      updates.push('assessor = ?');
      values.push(data.assessor);
    }
    if (data.scope !== undefined) {
      updates.push('scope = ?');
      values.push(data.scope);
    }
    if (data.findings !== undefined) {
      updates.push('findings = ?');
      values.push(JSON.stringify(data.findings));
    }
    if (data.overallScore !== undefined) {
      updates.push('overall_score = ?');
      values.push(data.overallScore);
    }
    if (data.passed !== undefined) {
      updates.push('passed = ?');
      values.push(data.passed ? 1 : 0);
    }
    if (data.reportPath !== undefined) {
      updates.push('report_path = ?');
      values.push(data.reportPath);
    }

    if (updates.length === 0) return this.getComplianceAssessment(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE compliance_assessments SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getComplianceAssessment(id);
  }

  deleteComplianceAssessment(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM compliance_assessments WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Data Processing Activities ====================

  createDataProcessingActivity(data: CreateDataProcessingActivityData, createdBy: number): DataProcessingActivity {
    const stmt = this.db.prepare(`
      INSERT INTO data_processing_activities (
        name, purpose, data_categories, data_subjects, recipients, transfers,
        retention_period, security_measures, legal_basis, controller, processor,
        dpo_contact, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.name,
      data.purpose,
      JSON.stringify(data.dataCategories),
      JSON.stringify(data.dataSubjects),
      JSON.stringify(data.recipients),
      data.transfers || null,
      data.retentionPeriod,
      data.securityMeasures,
      data.legalBasis,
      data.controller,
      data.processor || null,
      data.dpoContact || null,
      createdBy
    );

    return this.getDataProcessingActivity(result.lastInsertRowid as number)!;
  }

  getDataProcessingActivity(id: number): DataProcessingActivity | null {
    const stmt = this.db.prepare('SELECT * FROM data_processing_activities WHERE id = ?');
    const row = stmt.get(id);
    return row ? this.mapRowToDataProcessingActivity(row) : null;
  }

  getAllDataProcessingActivities(): DataProcessingActivity[] {
    const stmt = this.db.prepare('SELECT * FROM data_processing_activities ORDER BY name');
    const rows = stmt.all();
    return rows.map(row => this.mapRowToDataProcessingActivity(row));
  }

  updateDataProcessingActivity(id: number, data: UpdateDataProcessingActivityData): DataProcessingActivity | null {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.purpose !== undefined) {
      updates.push('purpose = ?');
      values.push(data.purpose);
    }
    if (data.dataCategories !== undefined) {
      updates.push('data_categories = ?');
      values.push(JSON.stringify(data.dataCategories));
    }
    if (data.dataSubjects !== undefined) {
      updates.push('data_subjects = ?');
      values.push(JSON.stringify(data.dataSubjects));
    }
    if (data.recipients !== undefined) {
      updates.push('recipients = ?');
      values.push(JSON.stringify(data.recipients));
    }
    if (data.transfers !== undefined) {
      updates.push('transfers = ?');
      values.push(data.transfers);
    }
    if (data.retentionPeriod !== undefined) {
      updates.push('retention_period = ?');
      values.push(data.retentionPeriod);
    }
    if (data.securityMeasures !== undefined) {
      updates.push('security_measures = ?');
      values.push(data.securityMeasures);
    }
    if (data.legalBasis !== undefined) {
      updates.push('legal_basis = ?');
      values.push(data.legalBasis);
    }
    if (data.controller !== undefined) {
      updates.push('controller = ?');
      values.push(data.controller);
    }
    if (data.processor !== undefined) {
      updates.push('processor = ?');
      values.push(data.processor);
    }
    if (data.dpoContact !== undefined) {
      updates.push('dpo_contact = ?');
      values.push(data.dpoContact);
    }
    if (data.lastReviewed !== undefined) {
      updates.push('last_reviewed = ?');
      values.push(data.lastReviewed ? data.lastReviewed.toISOString() : null);
    }
    if (data.nextReviewDate !== undefined) {
      updates.push('next_review_date = ?');
      values.push(data.nextReviewDate ? data.nextReviewDate.toISOString() : null);
    }

    if (updates.length === 0) return this.getDataProcessingActivity(id);

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = this.db.prepare(`UPDATE data_processing_activities SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.getDataProcessingActivity(id);
  }

  deleteDataProcessingActivity(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM data_processing_activities WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ==================== Compliance Dashboard ====================

  getComplianceDashboardStats(): ComplianceDashboardStats {
    // GDPR stats
    const dsrStats = this.db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'pending' OR status = 'in_progress' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        AVG(CASE WHEN completed_at IS NOT NULL 
          THEN julianday(completed_at) - julianday(requested_at) 
          ELSE NULL END) as avg_days
      FROM data_subject_requests
    `).get() as any;

    const consentStats = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        COUNT(CASE WHEN status = 'given' THEN 1 END) as active_consents
      FROM user_consents
    `).get() as any;

    const totalUsers = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const consentRate = totalUsers.count > 0 ? (consentStats.total_users / totalUsers.count) * 100 : 0;

    // Retention stats
    const retentionStats = this.db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_policies,
        MAX(last_run_at) as last_execution
      FROM data_retention_policies
    `).get() as any;

    // Legal holds stats
    const holdStats = this.db.prepare(`
      SELECT 
        COUNT(*) as active_holds,
        SUM(json_array_length(entity_ids)) as items_under_hold
      FROM legal_holds 
      WHERE status = 'active'
    `).get() as any;

    // Controls stats
    const controlStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'implemented' THEN 1 ELSE 0 END) as implemented,
        SUM(CASE WHEN status = 'partially_implemented' THEN 1 ELSE 0 END) as partial,
        SUM(CASE WHEN status = 'not_implemented' THEN 1 ELSE 0 END) as not_impl
      FROM compliance_controls
    `).get() as any;

    const complianceScore = controlStats.total > 0
      ? ((controlStats.implemented + controlStats.partial * 0.5) / controlStats.total) * 100
      : 0;

    // Assessment stats
    const assessmentStats = this.db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        MAX(CASE WHEN status = 'completed' THEN completed_at END) as last_completed,
        MIN(CASE WHEN status = 'scheduled' THEN scheduled_date END) as next_scheduled
      FROM compliance_assessments
    `).get() as any;

    return {
      gdpr: {
        pendingRequests: dsrStats.pending || 0,
        completedRequests: dsrStats.completed || 0,
        averageResponseTime: dsrStats.avg_days || 0,
        consentRate: Math.round(consentRate),
        activeConsents: consentStats.active_consents || 0
      },
      retention: {
        activePolicies: retentionStats.active_policies || 0,
        itemsDueForDeletion: 0, // Would need entity-specific logic
        lastExecutionDate: retentionStats.last_execution ? new Date(retentionStats.last_execution) : null
      },
      legalHolds: {
        activeHolds: holdStats.active_holds || 0,
        itemsUnderHold: holdStats.items_under_hold || 0
      },
      controls: {
        totalControls: controlStats.total || 0,
        implemented: controlStats.implemented || 0,
        partiallyImplemented: controlStats.partial || 0,
        notImplemented: controlStats.not_impl || 0,
        complianceScore: Math.round(complianceScore)
      },
      assessments: {
        scheduled: assessmentStats.scheduled || 0,
        inProgress: assessmentStats.in_progress || 0,
        completed: assessmentStats.completed || 0,
        lastAssessmentDate: assessmentStats.last_completed ? new Date(assessmentStats.last_completed) : null,
        nextAssessmentDate: assessmentStats.next_scheduled ? new Date(assessmentStats.next_scheduled) : null
      }
    };
  }

  // ==================== Helper Methods ====================

  private mapRowToDataSubjectRequest(row: any): DataSubjectRequest {
    return {
      id: row.id,
      userId: row.user_id,
      requestType: row.request_type as DataSubjectRightType,
      status: row.status as DataSubjectRequestStatus,
      description: row.description,
      requestedAt: new Date(row.requested_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      dueDate: new Date(row.due_date),
      assignedTo: row.assigned_to,
      response: row.response,
      exportFilePath: row.export_file_path,
      verificationToken: row.verification_token,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  private mapRowToDataRetentionPolicy(row: any): DataRetentionPolicy {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      entityType: row.entity_type,
      retentionPeriod: row.retention_period,
      retentionAction: row.retention_action as RetentionAction,
      status: row.status as RetentionPolicyStatus,
      conditions: row.conditions ? JSON.parse(row.conditions) : null,
      lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
      nextRunAt: row.next_run_at ? new Date(row.next_run_at) : null,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToRetentionExecutionLog(row: any): RetentionExecutionLog {
    return {
      id: row.id,
      policyId: row.policy_id,
      executedAt: new Date(row.executed_at),
      itemsProcessed: row.items_processed,
      itemsDeleted: row.items_deleted,
      itemsArchived: row.items_archived,
      itemsAnonymized: row.items_anonymized,
      errors: row.errors ? JSON.parse(row.errors) : null,
      summary: row.summary ? JSON.parse(row.summary) : null
    };
  }

  private mapRowToUserConsent(row: any): UserConsent {
    return {
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type as ConsentType,
      status: row.status as ConsentStatus,
      givenAt: row.given_at ? new Date(row.given_at) : null,
      withdrawnAt: row.withdrawn_at ? new Date(row.withdrawn_at) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      consentText: row.consent_text,
      consentVersion: row.consent_version,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  private mapRowToLegalHold(row: any): LegalHold {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status as LegalHoldStatus,
      entityType: row.entity_type,
      entityIds: JSON.parse(row.entity_ids),
      reason: row.reason,
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : null,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      releasedBy: row.released_by,
      releasedAt: row.released_at ? new Date(row.released_at) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    };
  }

  private mapRowToComplianceControl(row: any): ComplianceControl {
    return {
      id: row.id,
      framework: row.framework as ComplianceFramework,
      controlId: row.control_id,
      controlName: row.control_name,
      controlDescription: row.control_description,
      category: row.category,
      status: row.status as ControlStatus,
      implementation: row.implementation,
      evidence: row.evidence,
      assessmentDate: row.assessment_date ? new Date(row.assessment_date) : null,
      nextAssessmentDate: row.next_assessment_date ? new Date(row.next_assessment_date) : null,
      owner: row.owner,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToComplianceAssessment(row: any): ComplianceAssessment {
    return {
      id: row.id,
      framework: row.framework as ComplianceFramework,
      name: row.name,
      description: row.description,
      status: row.status as AssessmentStatus,
      scheduledDate: new Date(row.scheduled_date),
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      assessor: row.assessor,
      scope: row.scope,
      findings: row.findings ? JSON.parse(row.findings) : null,
      overallScore: row.overall_score,
      passed: row.passed === 1 ? true : row.passed === 0 ? false : null,
      reportPath: row.report_path,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapRowToDataProcessingActivity(row: any): DataProcessingActivity {
    return {
      id: row.id,
      name: row.name,
      purpose: row.purpose,
      dataCategories: JSON.parse(row.data_categories),
      dataSubjects: JSON.parse(row.data_subjects),
      recipients: JSON.parse(row.recipients),
      transfers: row.transfers,
      retentionPeriod: row.retention_period,
      securityMeasures: row.security_measures,
      legalBasis: row.legal_basis,
      controller: row.controller,
      processor: row.processor,
      dpoContact: row.dpo_contact,
      lastReviewed: row.last_reviewed ? new Date(row.last_reviewed) : null,
      nextReviewDate: row.next_review_date ? new Date(row.next_review_date) : null,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
