import Database from 'better-sqlite3';
import {
  TaskStatusReport,
  TaskPriorityReport,
  ProjectProgressReport,
  UserWorkloadReport,
  TimeTrackingReport,
  TaskCompletionTrend,
  BurndownData,
  VelocityData,
  ProjectStatistics,
  UserStatistics,
  TimeStatistics,
  DateRange,
  ReportFilters
} from '../models/Report';
import { TaskStatus, TaskPriority } from '../models/Task';

/**
 * Analytics service for generating reports and statistics
 */
export class AnalyticsService {
  constructor(private db: Database.Database) {}

  /**
   * Get task status distribution
   */
  getTaskStatusReport(filters?: ReportFilters): TaskStatusReport[] {
    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tasks WHERE 1=1 ${this.buildWhereClause(filters)}), 2) as percentage
      FROM tasks
      WHERE 1=1 ${this.buildWhereClause(filters)}
      GROUP BY status
      ORDER BY count DESC
    `;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...this.getFilterValues(filters));
    
    return rows.map((row: any) => ({
      status: row.status,
      count: row.count,
      percentage: row.percentage || 0
    }));
  }

  /**
   * Get task priority distribution
   */
  getTaskPriorityReport(filters?: ReportFilters): TaskPriorityReport[] {
    let query = `
      SELECT 
        priority,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tasks WHERE 1=1 ${this.buildWhereClause(filters)}), 2) as percentage
      FROM tasks
      WHERE 1=1 ${this.buildWhereClause(filters)}
      GROUP BY priority
      ORDER BY 
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...this.getFilterValues(filters));
    
    return rows.map((row: any) => ({
      priority: row.priority,
      count: row.count,
      percentage: row.percentage || 0
    }));
  }

  /**
   * Get project progress report
   */
  getProjectProgressReport(projectIds?: number[]): ProjectProgressReport[] {
    let query = `
      SELECT 
        p.id as project_id,
        p.name as project_name,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.status = 'todo' THEN 1 ELSE 0 END) as todo_tasks,
        ROUND(SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) * 100.0 / COUNT(t.id), 2) as completion_percentage
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE 1=1
      ${projectIds && projectIds.length > 0 ? `AND p.id IN (${projectIds.map(() => '?').join(',')})` : ''}
      GROUP BY p.id, p.name
      HAVING COUNT(t.id) > 0
      ORDER BY p.name
    `;

    const stmt = this.db.prepare(query);
    const rows = projectIds && projectIds.length > 0 ? stmt.all(...projectIds) : stmt.all();
    
    return rows.map((row: any) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      totalTasks: row.total_tasks,
      completedTasks: row.completed_tasks,
      inProgressTasks: row.in_progress_tasks,
      todoTasks: row.todo_tasks,
      completionPercentage: row.completion_percentage || 0
    }));
  }

  /**
   * Get user workload report
   */
  getUserWorkloadReport(userIds?: number[]): UserWorkloadReport[] {
    let query = `
      SELECT 
        u.id as user_id,
        u.display_name as user_name,
        COUNT(t.id) as assigned_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN t.due_date IS NOT NULL AND t.due_date < date('now') AND t.status != 'done' THEN 1 ELSE 0 END) as overdue_tasks
      FROM users u
      LEFT JOIN tasks t ON CAST(u.id AS TEXT) = t.assigned_to
      WHERE 1=1
      ${userIds && userIds.length > 0 ? `AND u.id IN (${userIds.map(() => '?').join(',')})` : ''}
      GROUP BY u.id, u.display_name
      HAVING COUNT(t.id) > 0
      ORDER BY assigned_tasks DESC
    `;

    const stmt = this.db.prepare(query);
    const rows = userIds && userIds.length > 0 ? stmt.all(...userIds) : stmt.all();
    
    return rows.map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name,
      assignedTasks: row.assigned_tasks,
      completedTasks: row.completed_tasks,
      inProgressTasks: row.in_progress_tasks,
      overdueTasks: row.overdue_tasks
    }));
  }

  /**
   * Get time tracking report
   */
  getTimeTrackingReport(dateRange?: DateRange, filters?: ReportFilters): TimeTrackingReport[] {
    let query = `
      SELECT 
        te.user_id,
        u.display_name as user_name,
        t.project_id,
        p.name as project_name,
        SUM(te.duration) / 3600.0 as total_hours,
        SUM(CASE WHEN te.is_billable = 1 THEN te.duration ELSE 0 END) / 3600.0 as billable_hours,
        SUM(CASE WHEN te.is_billable = 0 THEN te.duration ELSE 0 END) / 3600.0 as non_billable_hours,
        SUM(CASE WHEN te.is_billable = 1 THEN (te.duration / 3600.0) * COALESCE(te.hourly_rate, 0) ELSE 0 END) as earnings,
        COUNT(te.id) as entries_count
      FROM time_entries te
      JOIN users u ON te.user_id = u.id
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE te.end_time IS NOT NULL
      ${this.buildDateRangeClause(dateRange, 'te.start_time')}
      ${filters?.projectIds && filters.projectIds.length > 0 ? `AND t.project_id IN (${filters.projectIds.map(() => '?').join(',')})` : ''}
      ${filters?.userIds && filters.userIds.length > 0 ? `AND te.user_id IN (${filters.userIds.map(() => '?').join(',')})` : ''}
      GROUP BY te.user_id, u.display_name, t.project_id, p.name
      ORDER BY total_hours DESC
    `;

    const params: any[] = [];
    if (dateRange?.startDate) params.push(dateRange.startDate);
    if (dateRange?.endDate) params.push(dateRange.endDate);
    if (filters?.projectIds) params.push(...filters.projectIds);
    if (filters?.userIds) params.push(...filters.userIds);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    
    return rows.map((row: any) => ({
      userId: row.user_id,
      userName: row.user_name,
      projectId: row.project_id,
      projectName: row.project_name,
      totalHours: Number(row.total_hours.toFixed(2)),
      billableHours: Number(row.billable_hours.toFixed(2)),
      nonBillableHours: Number(row.non_billable_hours.toFixed(2)),
      earnings: Number(row.earnings.toFixed(2)),
      entriesCount: row.entries_count
    }));
  }

  /**
   * Get task completion trend
   */
  getTaskCompletionTrend(dateRange?: DateRange, projectId?: number): TaskCompletionTrend[] {
    const { startDate, endDate } = this.resolveDateRange(dateRange);
    
    let query = `
      WITH RECURSIVE date_series AS (
        SELECT date(?) as date
        UNION ALL
        SELECT date(date, '+1 day')
        FROM date_series
        WHERE date < date(?)
      ),
      completed_by_date AS (
        SELECT 
          date(completed_at) as date,
          COUNT(*) as completed
        FROM tasks
        WHERE completed_at IS NOT NULL
          AND date(completed_at) BETWEEN ? AND ?
          ${projectId ? 'AND project_id = ?' : ''}
        GROUP BY date(completed_at)
      ),
      created_by_date AS (
        SELECT 
          date(created_at) as date,
          COUNT(*) as created
        FROM tasks
        WHERE date(created_at) BETWEEN ? AND ?
          ${projectId ? 'AND project_id = ?' : ''}
        GROUP BY date(created_at)
      )
      SELECT 
        ds.date,
        COALESCE(comp.completed, 0) as completed,
        COALESCE(cr.created, 0) as created,
        (SELECT COUNT(*) FROM tasks 
         WHERE date(completed_at) <= ds.date 
         ${projectId ? 'AND project_id = ?' : ''}) as cumulative
      FROM date_series ds
      LEFT JOIN completed_by_date comp ON ds.date = comp.date
      LEFT JOIN created_by_date cr ON ds.date = cr.date
      ORDER BY ds.date
    `;

    const params: any[] = [startDate, endDate, startDate, endDate];
    if (projectId) params.push(projectId);
    params.push(startDate, endDate);
    if (projectId) params.push(projectId);
    if (projectId) params.push(projectId);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    
    return rows.map((row: any) => ({
      date: row.date,
      completed: row.completed,
      created: row.created,
      cumulative: row.cumulative
    }));
  }

  /**
   * Get project statistics
   */
  getProjectStatistics(): ProjectStatistics {
    const stmt = this.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'completed') as completed_projects,
        (SELECT COUNT(*) FROM tasks) as total_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'done') as completed_tasks,
        (SELECT COUNT(*) FROM tasks WHERE due_date < date('now') AND status != 'done') as overdue_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'done' AND date(completed_at) >= date('now', '-7 days')) as tasks_completed_this_week,
        (SELECT COUNT(*) FROM tasks WHERE status = 'done' AND date(completed_at) >= date('now', 'start of month')) as tasks_completed_this_month,
        (SELECT AVG(julianday(completed_at) - julianday(created_at)) 
         FROM tasks WHERE completed_at IS NOT NULL) as avg_completion_time,
        (SELECT CAST(COUNT(*) AS REAL) / COUNT(DISTINCT project_id) 
         FROM tasks) as avg_tasks_per_project
    `);
    
    const row: any = stmt.get();
    
    return {
      totalProjects: row.total_projects,
      activeProjects: row.active_projects,
      completedProjects: row.completed_projects,
      totalTasks: row.total_tasks,
      completedTasks: row.completed_tasks,
      overdueTasks: row.overdue_tasks,
      tasksCompletedThisWeek: row.tasks_completed_this_week,
      tasksCompletedThisMonth: row.tasks_completed_this_month,
      averageCompletionTime: Number((row.avg_completion_time || 0).toFixed(1)),
      averageTasksPerProject: Number((row.avg_tasks_per_project || 0).toFixed(1))
    };
  }

  /**
   * Get user statistics
   */
  getUserStatistics(): UserStatistics {
    const stmt = this.db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(DISTINCT assigned_to) FROM tasks WHERE assigned_to IS NOT NULL) as active_users,
        (SELECT COUNT(*) FROM tasks WHERE assigned_to IS NOT NULL) as total_tasks_assigned,
        (SELECT COUNT(*) FROM tasks WHERE status = 'done' AND assigned_to IS NOT NULL) as total_tasks_completed,
        (SELECT CAST(COUNT(*) AS REAL) / COUNT(DISTINCT assigned_to) 
         FROM tasks WHERE assigned_to IS NOT NULL) as avg_tasks_per_user
    `);
    
    const row: any = stmt.get();
    
    const topPerformersStmt = this.db.prepare(`
      SELECT 
        u.id as user_id,
        u.display_name as user_name,
        COUNT(t.id) as completed_tasks
      FROM users u
      JOIN tasks t ON CAST(u.id AS TEXT) = t.assigned_to
      WHERE t.status = 'done'
      GROUP BY u.id, u.display_name
      ORDER BY completed_tasks DESC
      LIMIT 5
    `);
    
    const topPerformers = topPerformersStmt.all().map((r: any) => ({
      userId: r.user_id,
      userName: r.user_name,
      completedTasks: r.completed_tasks
    }));
    
    return {
      totalUsers: row.total_users,
      activeUsers: row.active_users,
      totalTasksAssigned: row.total_tasks_assigned,
      totalTasksCompleted: row.total_tasks_completed,
      averageTasksPerUser: Number((row.avg_tasks_per_user || 0).toFixed(1)),
      topPerformers
    };
  }

  /**
   * Get time tracking statistics
   */
  getTimeStatistics(dateRange?: DateRange): TimeStatistics {
    const { startDate, endDate } = this.resolveDateRange(dateRange);
    
    const stmt = this.db.prepare(`
      SELECT 
        SUM(duration) / 3600.0 as total_hours,
        SUM(CASE WHEN is_billable = 1 THEN duration ELSE 0 END) / 3600.0 as billable_hours,
        SUM(CASE WHEN is_billable = 1 THEN (duration / 3600.0) * COALESCE(hourly_rate, 0) ELSE 0 END) as total_earnings,
        AVG(duration) / 3600.0 as avg_hours_per_entry
      FROM time_entries
      WHERE end_time IS NOT NULL
        AND date(start_time) BETWEEN ? AND ?
    `);
    
    const row: any = stmt.get(startDate, endDate);
    
    const daysCount = this.getDaysBetween(startDate, endDate);
    const avgHoursPerDay = daysCount > 0 ? (row.total_hours || 0) / daysCount : 0;
    
    const topProjectsStmt = this.db.prepare(`
      SELECT 
        p.id as project_id,
        p.name as project_name,
        SUM(te.duration) / 3600.0 as hours
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE te.end_time IS NOT NULL
        AND date(te.start_time) BETWEEN ? AND ?
      GROUP BY p.id, p.name
      ORDER BY hours DESC
      LIMIT 5
    `);
    
    const mostTrackedProjects = topProjectsStmt.all(startDate, endDate).map((r: any) => ({
      projectId: r.project_id,
      projectName: r.project_name,
      hours: Number(r.hours.toFixed(2))
    }));
    
    return {
      totalHoursTracked: Number((row.total_hours || 0).toFixed(2)),
      billableHours: Number((row.billable_hours || 0).toFixed(2)),
      totalEarnings: Number((row.total_earnings || 0).toFixed(2)),
      averageHoursPerDay: Number(avgHoursPerDay.toFixed(2)),
      averageHoursPerTask: Number((row.avg_hours_per_entry || 0).toFixed(2)),
      mostTrackedProjects
    };
  }

  // Helper methods

  private buildWhereClause(filters?: ReportFilters): string {
    if (!filters) return '';
    
    const clauses: string[] = [];
    
    if (filters.projectIds && filters.projectIds.length > 0) {
      clauses.push(`AND project_id IN (${filters.projectIds.map(() => '?').join(',')})`);
    }
    if (filters.statuses && filters.statuses.length > 0) {
      clauses.push(`AND status IN (${filters.statuses.map(() => '?').join(',')})`);
    }
    if (filters.priorities && filters.priorities.length > 0) {
      clauses.push(`AND priority IN (${filters.priorities.map(() => '?').join(',')})`);
    }
    
    return clauses.join(' ');
  }

  private getFilterValues(filters?: ReportFilters): any[] {
    if (!filters) return [];
    
    const values: any[] = [];
    
    if (filters.projectIds) values.push(...filters.projectIds);
    if (filters.statuses) values.push(...filters.statuses);
    if (filters.priorities) values.push(...filters.priorities);
    
    return values;
  }

  private buildDateRangeClause(dateRange?: DateRange, column: string = 'created_at'): string {
    if (!dateRange) return '';
    
    const { startDate, endDate } = this.resolveDateRange(dateRange);
    return `AND date(${column}) BETWEEN '${startDate}' AND '${endDate}'`;
  }

  private resolveDateRange(dateRange?: DateRange): { startDate: string; endDate: string } {
    if (dateRange?.startDate && dateRange?.endDate) {
      return { startDate: dateRange.startDate, endDate: dateRange.endDate };
    }
    
    const endDate = new Date().toISOString().split('T')[0];
    let startDate: string;
    
    switch (dateRange?.period) {
      case 'today':
        startDate = endDate;
        break;
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'quarter':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    
    return { startDate, endDate };
  }

  private getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
}
