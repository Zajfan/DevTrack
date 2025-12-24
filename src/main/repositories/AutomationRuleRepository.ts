import Database from 'better-sqlite3';
import {
  AutomationRule,
  CreateAutomationRuleData,
  UpdateAutomationRuleData,
  AutomationLog,
  CreateAutomationLogData,
  AutomationRuleWithDetails,
  TriggerType,
  ActionType,
  TriggerConfig,
  ActionConfig
} from '../models/AutomationRule';

/**
 * Database row interface for automation_rules table
 */
interface AutomationRuleRow {
  id: number;
  name: string;
  description: string | null;
  project_id: number | null;
  is_active: number;
  trigger_type: string;
  trigger_config: string;
  action_type: string;
  action_config: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  last_executed_at: string | null;
  execution_count: number;
}

/**
 * Database row interface for automation_rules with joined details
 */
interface AutomationRuleWithDetailsRow extends AutomationRuleRow {
  project_name: string | null;
  creator_name: string | null;
}

/**
 * Database row interface for automation_logs table
 */
interface AutomationLogRow {
  id: number;
  rule_id: number;
  trigger_data: string;
  action_data: string;
  status: string;
  error_message: string | null;
  executed_at: string;
}

/**
 * Database row interface for rule statistics query
 */
interface RuleStatsRow {
  total: number;
  success: number;
  error: number;
  skipped: number;
  last_executed: string | null;
}

/**
 * Repository for automation rules and logs
 */
export class AutomationRuleRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new automation rule
   */
  create(data: CreateAutomationRuleData): AutomationRule {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO automation_rules (
        name, description, project_id, is_active, trigger_type, trigger_config,
        action_type, action_config, created_by, created_at, updated_at, execution_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);
    
    const result = stmt.run(
      data.name,
      data.description || null,
      data.projectId || null,
      data.isActive !== false ? 1 : 0,
      data.triggerType,
      JSON.stringify(data.triggerConfig),
      data.actionType,
      JSON.stringify(data.actionConfig),
      data.createdBy,
      now,
      now
    );

    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created automation rule');
    }
    return created;
  }

  /**
   * Find automation rule by ID
   */
  findById(id: number): AutomationRule | null {
    const stmt = this.db.prepare('SELECT * FROM automation_rules WHERE id = ?');
    const row = stmt.get(id) as AutomationRuleRow | undefined;
    return row ? this.mapRowToAutomationRule(row) : null;
  }

  /**
   * Find all automation rules
   */
  findAll(): AutomationRule[] {
    const stmt = this.db.prepare('SELECT * FROM automation_rules ORDER BY created_at DESC');
    const rows = stmt.all() as AutomationRuleRow[];
    return rows.map(row => this.mapRowToAutomationRule(row));
  }

  /**
   * Find automation rules by project ID
   */
  findByProjectId(projectId: number): AutomationRule[] {
    const stmt = this.db.prepare('SELECT * FROM automation_rules WHERE project_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(projectId) as AutomationRuleRow[];
    return rows.map(row => this.mapRowToAutomationRule(row));
  }

  /**
   * Find global automation rules (no specific project)
   */
  findGlobalRules(): AutomationRule[] {
    const stmt = this.db.prepare('SELECT * FROM automation_rules WHERE project_id IS NULL ORDER BY created_at DESC');
    const rows = stmt.all() as AutomationRuleRow[];
    return rows.map(row => this.mapRowToAutomationRule(row));
  }

  /**
   * Find active automation rules by trigger type
   */
  findActiveByTriggerType(triggerType: TriggerType, projectId?: number): AutomationRule[] {
    let query = 'SELECT * FROM automation_rules WHERE is_active = 1 AND trigger_type = ?';
    const params: any[] = [triggerType];

    if (projectId !== undefined) {
      query += ' AND (project_id = ? OR project_id IS NULL)';
      params.push(projectId);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as AutomationRuleRow[];
    return rows.map(row => this.mapRowToAutomationRule(row));
  }

  /**
   * Find automation rule with project and creator details
   */
  findByIdWithDetails(id: number): AutomationRuleWithDetails | null {
    const stmt = this.db.prepare(`
      SELECT
        ar.*,
        p.name as project_name,
        u.display_name as creator_name
      FROM automation_rules ar
      LEFT JOIN projects p ON ar.project_id = p.id
      LEFT JOIN users u ON ar.created_by = u.id
      WHERE ar.id = ?
    `);

    const row = stmt.get(id) as AutomationRuleWithDetailsRow | undefined;
    return row ? this.mapRowToAutomationRuleWithDetails(row) : null;
  }

  /**
   * Find all automation rules with details
   */
  findAllWithDetails(): AutomationRuleWithDetails[] {
    const stmt = this.db.prepare(`
      SELECT
        ar.*,
        p.name as project_name,
        u.display_name as creator_name
      FROM automation_rules ar
      LEFT JOIN projects p ON ar.project_id = p.id
      LEFT JOIN users u ON ar.created_by = u.id
      ORDER BY ar.created_at DESC
    `);

    const rows = stmt.all() as AutomationRuleWithDetailsRow[];
    return rows.map(row => this.mapRowToAutomationRuleWithDetails(row));
  }

  /**
   * Find automation rules by project with details
   */
  findByProjectIdWithDetails(projectId: number): AutomationRuleWithDetails[] {
    const stmt = this.db.prepare(`
      SELECT
        ar.*,
        p.name as project_name,
        u.display_name as creator_name
      FROM automation_rules ar
      LEFT JOIN projects p ON ar.project_id = p.id
      LEFT JOIN users u ON ar.created_by = u.id
      WHERE ar.project_id = ?
      ORDER BY ar.created_at DESC
    `);

    const rows = stmt.all(projectId) as AutomationRuleWithDetailsRow[];
    return rows.map(row => this.mapRowToAutomationRuleWithDetails(row));
  }

  /**
   * Update automation rule
   */
  update(id: number, data: UpdateAutomationRuleData): AutomationRule | null {
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
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }
    if (data.triggerType !== undefined) {
      updates.push('trigger_type = ?');
      values.push(data.triggerType);
    }
    if (data.triggerConfig !== undefined) {
      updates.push('trigger_config = ?');
      values.push(JSON.stringify(data.triggerConfig));
    }
    if (data.actionType !== undefined) {
      updates.push('action_type = ?');
      values.push(data.actionType);
    }
    if (data.actionConfig !== undefined) {
      updates.push('action_config = ?');
      values.push(JSON.stringify(data.actionConfig));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(
      `UPDATE automation_rules SET ${updates.join(', ')} WHERE id = ?`
    );
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Toggle automation rule active status
   */
  toggleActive(id: number): AutomationRule | null {
    const rule = this.findById(id);
    if (!rule) return null;
    
    return this.update(id, { isActive: !rule.isActive });
  }

  /**
   * Record rule execution
   */
  recordExecution(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE automation_rules 
      SET last_executed_at = ?, execution_count = execution_count + 1, updated_at = ?
      WHERE id = ?
    `);
    const now = new Date().toISOString();
    stmt.run(now, now, id);
  }

  /**
   * Delete automation rule
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM automation_rules WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // ===== AUTOMATION LOGS =====

  /**
   * Create automation log entry
   */
  createLog(data: CreateAutomationLogData): AutomationLog {
    const stmt = this.db.prepare(`
      INSERT INTO automation_logs (
        rule_id, trigger_data, action_data, status, error_message, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.ruleId,
      JSON.stringify(data.triggerData),
      JSON.stringify(data.actionData),
      data.status,
      data.errorMessage || null,
      new Date().toISOString()
    );

    const created = this.findLogById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created automation log');
    }
    return created;
  }

  /**
   * Find log by ID
   */
  findLogById(id: number): AutomationLog | null {
    const stmt = this.db.prepare('SELECT * FROM automation_logs WHERE id = ?');
    const row = stmt.get(id) as AutomationLogRow | undefined;
    return row ? this.mapRowToAutomationLog(row) : null;
  }

  /**
   * Find logs by rule ID
   */
  findLogsByRuleId(ruleId: number, limit: number = 100): AutomationLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM automation_logs
      WHERE rule_id = ?
      ORDER BY executed_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(ruleId, limit) as AutomationLogRow[];
    return rows.map(row => this.mapRowToAutomationLog(row));
  }

  /**
   * Find recent logs
   */
  findRecentLogs(limit: number = 100): AutomationLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM automation_logs
      ORDER BY executed_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as AutomationLogRow[];
    return rows.map(row => this.mapRowToAutomationLog(row));
  }

  /**
   * Get execution statistics for a rule
   */
  getRuleStats(ruleId: number): {
    totalExecutions: number;
    successCount: number;
    errorCount: number;
    skippedCount: number;
    lastExecutedAt: string | null;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
        MAX(executed_at) as last_executed
      FROM automation_logs
      WHERE rule_id = ?
    `);

    const row = stmt.get(ruleId) as RuleStatsRow | undefined;

    return {
      totalExecutions: row?.total || 0,
      successCount: row?.success || 0,
      errorCount: row?.error || 0,
      skippedCount: row?.skipped || 0,
      lastExecutedAt: row?.last_executed || null
    };
  }

  /**
   * Delete old logs
   */
  deleteOldLogs(daysOld: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const stmt = this.db.prepare(`
      DELETE FROM automation_logs 
      WHERE executed_at < ?
    `);
    
    const result = stmt.run(cutoffDate.toISOString());
    return result.changes;
  }

  // ===== PRIVATE MAPPING METHODS =====

  private mapRowToAutomationRule(row: AutomationRuleRow): AutomationRule {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      projectId: row.project_id,
      isActive: Boolean(row.is_active),
      triggerType: row.trigger_type as TriggerType,
      triggerConfig: JSON.parse(row.trigger_config) as TriggerConfig,
      actionType: row.action_type as ActionType,
      actionConfig: JSON.parse(row.action_config) as ActionConfig,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastExecutedAt: row.last_executed_at,
      executionCount: row.execution_count
    };
  }

  private mapRowToAutomationRuleWithDetails(row: AutomationRuleWithDetailsRow): AutomationRuleWithDetails {
    return {
      ...this.mapRowToAutomationRule(row),
      projectName: row.project_name,
      creatorName: row.creator_name
    };
  }

  private mapRowToAutomationLog(row: AutomationLogRow): AutomationLog {
    return {
      id: row.id,
      ruleId: row.rule_id,
      triggerData: JSON.parse(row.trigger_data),
      actionData: JSON.parse(row.action_data),
      status: row.status as 'success' | 'error' | 'skipped',
      errorMessage: row.error_message,
      executedAt: row.executed_at
    };
  }
}
