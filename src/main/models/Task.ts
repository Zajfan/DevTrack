/**
 * Task status enum
 */
export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  Review = 'review',
  Done = 'done',
  Blocked = 'blocked'
}

/**
 * Task priority enum
 */
export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

/**
 * Task model
 */
export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  position: number;
  tags: string | null; // JSON array of tag strings
}

/**
 * Data for creating a new task
 */
export interface CreateTaskData {
  projectId: number;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  startDate?: string;
  dueDate?: string;
  position?: number;
  tags?: string; // JSON array of tag strings
}

/**
 * Data for updating a task
 */
export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  startDate?: string;
  dueDate?: string;
  position?: number;
  tags?: string; // JSON array of tag strings
}
