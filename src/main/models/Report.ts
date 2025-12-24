/**
 * Report model and analytics types
 */

export interface Report {
  id: number;
  name: string;
  description: string | null;
  type: ReportType;
  config: ReportConfig;
  projectId: number | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

export interface CreateReportData {
  name: string;
  description?: string;
  type: ReportType;
  config: ReportConfig;
  projectId?: number;
  createdBy: number;
  isPublic?: boolean;
}

export interface UpdateReportData {
  name?: string;
  description?: string;
  type?: ReportType;
  config?: ReportConfig;
  isPublic?: boolean;
}

// Report types
export enum ReportType {
  TaskStatus = 'task_status',
  TaskPriority = 'task_priority',
  TaskCompletion = 'task_completion',
  ProjectProgress = 'project_progress',
  UserWorkload = 'user_workload',
  TimeTracking = 'time_tracking',
  BurndownChart = 'burndown_chart',
  VelocityChart = 'velocity_chart',
  Custom = 'custom'
}

// Report configuration
export interface ReportConfig {
  dateRange?: DateRange;
  groupBy?: GroupBy;
  filters?: ReportFilters;
  chartType?: ChartType;
  metrics?: string[];
  customQuery?: CustomQuery;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
}

export enum GroupBy {
  Status = 'status',
  Priority = 'priority',
  Assignee = 'assignee',
  Project = 'project',
  Label = 'label',
  Date = 'date',
  Week = 'week',
  Month = 'month'
}

export interface ReportFilters {
  projectIds?: number[];
  userIds?: number[];
  statuses?: string[];
  priorities?: string[];
  labelIds?: number[];
}

export enum ChartType {
  Bar = 'bar',
  Line = 'line',
  Pie = 'pie',
  Doughnut = 'doughnut',
  Area = 'area',
  Table = 'table'
}

export interface CustomQuery {
  select?: string[];
  from?: string;
  where?: Record<string, any>;
  groupBy?: string[];
  orderBy?: string[];
}

// Analytics data structures
export interface TaskStatusReport {
  status: string;
  count: number;
  percentage: number;
}

export interface TaskPriorityReport {
  priority: string;
  count: number;
  percentage: number;
}

export interface ProjectProgressReport {
  projectId: number;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  completionPercentage: number;
}

export interface UserWorkloadReport {
  userId: number;
  userName: string;
  assignedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
}

export interface TimeTrackingReport {
  userId?: number;
  userName?: string;
  projectId?: number;
  projectName?: string;
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  earnings: number;
  entriesCount: number;
}

export interface TaskCompletionTrend {
  date: string;
  completed: number;
  created: number;
  cumulative: number;
}

export interface BurndownData {
  date: string;
  ideal: number;
  actual: number;
  remaining: number;
}

export interface VelocityData {
  period: string;
  completed: number;
  average: number;
}

// Summary statistics
export interface ProjectStatistics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksCompletedThisWeek: number;
  tasksCompletedThisMonth: number;
  averageCompletionTime: number; // in days
  averageTasksPerProject: number;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  totalTasksAssigned: number;
  totalTasksCompleted: number;
  averageTasksPerUser: number;
  topPerformers: Array<{
    userId: number;
    userName: string;
    completedTasks: number;
  }>;
}

export interface TimeStatistics {
  totalHoursTracked: number;
  billableHours: number;
  totalEarnings: number;
  averageHoursPerDay: number;
  averageHoursPerTask: number;
  mostTrackedProjects: Array<{
    projectId: number;
    projectName: string;
    hours: number;
  }>;
}

// Report with details
export interface ReportWithDetails extends Report {
  projectName: string | null;
  creatorName: string | null;
}

// Export data format
export interface ReportExportData {
  reportName: string;
  generatedAt: string;
  dateRange?: DateRange;
  data: any;
  summary?: Record<string, any>;
}
