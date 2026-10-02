export interface Project {
  id: number;
  name: string;
  description?: string | null;
  path: string;
  status: string;
  color?: string | null;
  icon?: string | null;
  tags: string;
  last_accessed: string | null;
  created_at: string;
  updated_at?: string;
  concept_what?: string | null;
  concept_how?: string | null;
  concept_where?: string | null;
  concept_with_what?: string | null;
  concept_when?: string | null;
  concept_why?: string | null;
  git?: GitInfo | null;
}

export interface GitInfo {
  branch: string;
  is_dirty: boolean;
  ahead: number;
  behind: number;
  stashes: number;
}

export interface Task {
  github_url?: string;
  github_number?: number;
  github_milestone?: string | null;
  target_version?: string;
  id: number;
  project_id: number;
  project_name?: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assigned_to?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at?: string;
  completed_at?: string | null;
  position?: number;
  tags?: string | null;
}

export interface SubTask {
  id: number;
  task_id: number;
  title: string;
  done: boolean;
}

export interface TimeEntry {
  id: number;
  task_id: number;
  task_title?: string;
  project_name?: string;
  user_id?: number;
  description?: string | null;
  start_time: string | number;
  end_time?: string | number | null;
  duration?: number | null;
  duration_seconds: number;
  is_billable?: boolean;
  hourly_rate?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface TimeLogSummary {
  period: string;
  entries: TimeLogEntry[];
  total_seconds: number;
  total_formatted: string;
}

export interface TimeLogEntry {
  date: string;
  project: string;
  task: string;
  duration: string;
  duration_seconds: number;
}

export interface DashboardSummary {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  active_tasks: number;
  completed_tasks: number;
  done_tasks: number;
  total_time_today: number;
  total_time_week: number;
  recent_projects: Project[];
  active_timer: { task_id: number; elapsed_formatted: string } | null;
}

export interface CreateProjectRequest {
  name: string;
  path: string;
  description?: string;
  status?: string;
  color?: string;
  icon?: string;
  concept_what?: string;
  concept_how?: string;
  concept_where?: string;
  concept_with_what?: string;
  concept_when?: string;
  concept_why?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: string;
  color?: string;
  icon?: string;
  tags?: string;
  concept_what?: string;
  concept_how?: string;
  concept_where?: string;
  concept_with_what?: string;
  concept_when?: string;
  concept_why?: string;
}

export interface CreateTaskRequest {
  target_version?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  start_date?: string;
  due_date?: string;
  position?: number;
  tags?: string;
}

export interface UpdateTaskRequest {
  target_version?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigned_to?: string;
  start_date?: string;
  due_date?: string;
  position?: number;
  tags?: string;
}

export interface CreateSubTaskRequest {
  title: string;
}

export interface UpdateSubTaskRequest {
  title?: string;
  done?: boolean;
}

export interface CreateTimeEntryRequest {
  task_id: number;
  user_id: number;
  description?: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  is_billable?: boolean;
  hourly_rate?: number;
}

export interface NotesRequest {
  content: string;
}

export interface ApiError {
  message: string;
}

export interface StartTimerResponse {
  task_id: number;
  start_time: number;
}

export interface StopTimerResponse {
  task_id: number;
  duration_seconds: number;
}

export interface ActiveTimerResponse {
  task_id: number;
  start_time: number;
  elapsed: number;
}

export interface TimerUpdateEvent {
  active: boolean;
  task_id: number;
  elapsed: number;
}