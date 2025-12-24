import Database from 'better-sqlite3';
import { TaskDependency, CreateTaskDependencyData, DependencyType, TaskDependencyWithDetails } from '../models/TaskDependency';

/**
 * Database row interface for task_dependencies table
 */
interface TaskDependencyRow {
  id: number;
  task_id: number;
  depends_on_task_id: number;
  dependency_type: string;
  created_at: string;
}

/**
 * Database row interface for task_dependencies with task details
 */
interface TaskDependencyWithDetailsRow extends TaskDependencyRow {
  depends_on_task_title: string;
  depends_on_task_status: string;
  task_title?: string;
  task_status?: string;
}

/**
 * Repository for task dependency operations
 */
export class TaskDependencyRepository {
  constructor(private db: Database.Database) {}

  /**
   * Create a new task dependency
   */
  create(data: CreateTaskDependencyData): TaskDependency {
    // Validate: Cannot depend on itself
    if (data.taskId === data.dependsOnTaskId) {
      throw new Error('A task cannot depend on itself');
    }

    // Validate: Check for circular dependencies
    if (this.wouldCreateCircularDependency(data.taskId, data.dependsOnTaskId)) {
      throw new Error('This dependency would create a circular dependency chain');
    }

    const stmt = this.db.prepare(`
      INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    const result = stmt.run(data.taskId, data.dependsOnTaskId, data.dependencyType);
    const created = this.findById(result.lastInsertRowid as number);
    if (!created) {
      throw new Error('Failed to retrieve created task dependency');
    }
    return created;
  }

  /**
   * Find dependency by ID
   */
  findById(id: number): TaskDependency | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM task_dependencies WHERE id = ?
    `);
    const row = stmt.get(id) as TaskDependencyRow | undefined;
    return row ? this.mapRowToDependency(row) : undefined;
  }

  /**
   * Find all dependencies for a task (tasks this task depends on)
   */
  findByTaskId(taskId: number): TaskDependency[] {
    const stmt = this.db.prepare(`
      SELECT * FROM task_dependencies WHERE task_id = ?
    `);
    const rows = stmt.all(taskId) as TaskDependencyRow[];
    return rows.map(row => this.mapRowToDependency(row));
  }

  /**
   * Find all tasks that depend on a given task (tasks blocked by this task)
   */
  findDependentTasks(taskId: number): TaskDependency[] {
    const stmt = this.db.prepare(`
      SELECT * FROM task_dependencies WHERE depends_on_task_id = ?
    `);
    const rows = stmt.all(taskId) as TaskDependencyRow[];
    return rows.map(row => this.mapRowToDependency(row));
  }

  /**
   * Find all dependencies for a project
   */
  findByProjectId(projectId: number): TaskDependency[] {
    const stmt = this.db.prepare(`
      SELECT td.*
      FROM task_dependencies td
      JOIN tasks t ON t.id = td.task_id
      WHERE t.project_id = ?
    `);
    const rows = stmt.all(projectId) as TaskDependencyRow[];
    return rows.map(row => this.mapRowToDependency(row));
  }

  /**
   * Find dependencies with task details
   */
  findByTaskIdWithDetails(taskId: number): TaskDependencyWithDetails[] {
    const stmt = this.db.prepare(`
      SELECT
        td.*,
        t.title as depends_on_task_title,
        t.status as depends_on_task_status
      FROM task_dependencies td
      JOIN tasks t ON t.id = td.depends_on_task_id
      WHERE td.task_id = ?
    `);
    const rows = stmt.all(taskId) as TaskDependencyWithDetailsRow[];
    return rows.map(row => this.mapRowToDependencyWithDetails(row));
  }

  /**
   * Find dependent tasks with details
   */
  findDependentTasksWithDetails(taskId: number): TaskDependencyWithDetails[] {
    const stmt = this.db.prepare(`
      SELECT
        td.*,
        t.title as task_title,
        t.status as task_status
      FROM task_dependencies td
      JOIN tasks t ON t.id = td.task_id
      WHERE td.depends_on_task_id = ?
    `);
    const rows = stmt.all(taskId) as TaskDependencyWithDetailsRow[];
    return rows.map((row) => ({
      ...this.mapRowToDependency(row),
      taskTitle: row.task_title,
      taskStatus: row.task_status
    }));
  }

  /**
   * Delete a dependency
   */
  delete(id: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM task_dependencies WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete dependency by task IDs
   */
  deleteByTaskIds(taskId: number, dependsOnTaskId: number): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM task_dependencies 
      WHERE task_id = ? AND depends_on_task_id = ?
    `);
    const result = stmt.run(taskId, dependsOnTaskId);
    return result.changes > 0;
  }

  /**
   * Check if adding a dependency would create a circular dependency
   * Uses depth-first search to detect cycles
   */
  private wouldCreateCircularDependency(taskId: number, dependsOnTaskId: number): boolean {
    const visited = new Set<number>();
    const stack = [dependsOnTaskId];

    while (stack.length > 0) {
      const currentTaskId = stack.pop()!;
      
      if (currentTaskId === taskId) {
        return true; // Circular dependency detected
      }

      if (visited.has(currentTaskId)) {
        continue; // Already visited this task
      }

      visited.add(currentTaskId);

      // Get all tasks that currentTask depends on
      const dependencies = this.findByTaskId(currentTaskId);
      for (const dep of dependencies) {
        stack.push(dep.dependsOnTaskId);
      }
    }

    return false; // No circular dependency
  }

  /**
   * Get all blocking tasks for a given task (tasks that must be completed first)
   */
  getBlockingTasks(taskId: number): number[] {
    const dependencies = this.findByTaskId(taskId);
    return dependencies
      .filter(dep => dep.dependencyType === DependencyType.Blocks || dep.dependencyType === DependencyType.BlockedBy)
      .map(dep => dep.dependsOnTaskId);
  }

  /**
   * Get all blocked tasks (tasks waiting for this task to complete)
   */
  getBlockedTasks(taskId: number): number[] {
    const dependents = this.findDependentTasks(taskId);
    return dependents
      .filter(dep => dep.dependencyType === DependencyType.Blocks || dep.dependencyType === DependencyType.BlockedBy)
      .map(dep => dep.taskId);
  }

  /**
   * Check if a task has any blocking dependencies
   */
  hasBlockingDependencies(taskId: number): boolean {
    const blockingTasks = this.getBlockingTasks(taskId);
    return blockingTasks.length > 0;
  }

  /**
   * Map database row to TaskDependency
   */
  private mapRowToDependency(row: TaskDependencyRow): TaskDependency {
    return {
      id: row.id,
      taskId: row.task_id,
      dependsOnTaskId: row.depends_on_task_id,
      dependencyType: row.dependency_type as DependencyType,
      createdAt: row.created_at
    };
  }

  /**
   * Map database row to TaskDependencyWithDetails
   */
  private mapRowToDependencyWithDetails(row: TaskDependencyWithDetailsRow): TaskDependencyWithDetails {
    return {
      ...this.mapRowToDependency(row),
      dependsOnTaskTitle: row.depends_on_task_title,
      dependsOnTaskStatus: row.depends_on_task_status
    };
  }
}
