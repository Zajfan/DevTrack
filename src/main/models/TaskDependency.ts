/**
 * Task dependency types
 */
export enum DependencyType {
  Blocks = 'blocks',           // This task blocks the dependent task
  BlockedBy = 'blocked_by',     // This task is blocked by the dependent task
  RelatesTo = 'relates_to'      // This task relates to the dependent task
}

/**
 * Task dependency interface
 */
export interface TaskDependency {
  id: number;
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: DependencyType;
  createdAt: string;
}

/**
 * Data for creating a new task dependency
 */
export interface CreateTaskDependencyData {
  taskId: number;
  dependsOnTaskId: number;
  dependencyType: DependencyType;
}

/**
 * Extended dependency info with task details
 */
export interface TaskDependencyWithDetails extends TaskDependency {
  dependsOnTaskTitle?: string;
  dependsOnTaskStatus?: string;
  taskTitle?: string;
  taskStatus?: string;
}
