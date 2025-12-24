import { NotificationRepository } from '../repositories/NotificationRepository';
import { NotificationType } from '../models/Notification';
import { Task } from '../models/Task';
import { Project } from '../models/Project';

/**
 * Helper class for creating notifications for common events
 */
export class NotificationHelper {
  constructor(private notificationRepo: NotificationRepository) {}

  /**
   * Notify when a task is assigned
   */
  async notifyTaskAssigned(task: Task, assignedToUserId: number, assignedByUserId?: number): Promise<void> {
    await this.notificationRepo.create({
      userId: assignedToUserId,
      type: NotificationType.TaskAssigned,
      title: 'New task assigned',
      message: `You have been assigned to task: ${task.title}`,
      link: `/tasks/${task.id}`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    });
  }

  /**
   * Notify when a task is updated
   */
  async notifyTaskUpdated(task: Task, updatedByUserId: number, affectedUserIds: number[]): Promise<void> {
    const notifications = affectedUserIds
      .filter(userId => userId !== updatedByUserId) // Don't notify the person who made the update
      .map(userId => ({
        userId,
        type: NotificationType.TaskUpdated,
        title: 'Task updated',
        message: `Task "${task.title}" was updated`,
        link: `/tasks/${task.id}`,
        relatedProjectId: task.projectId,
        relatedTaskId: task.id,
      }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Notify when a task is completed
   */
  async notifyTaskCompleted(task: Task, completedByUserId: number, affectedUserIds: number[]): Promise<void> {
    const notifications = affectedUserIds
      .filter(userId => userId !== completedByUserId)
      .map(userId => ({
        userId,
        type: NotificationType.TaskCompleted,
        title: 'Task completed',
        message: `Task "${task.title}" has been completed`,
        link: `/tasks/${task.id}`,
        relatedProjectId: task.projectId,
        relatedTaskId: task.id,
      }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Notify when a task is due soon (within 24 hours)
   */
  async notifyTaskDueSoon(task: Task, userIds: number[]): Promise<void> {
    const dueDate = new Date(task.dueDate!);
    const formattedDate = dueDate.toLocaleDateString();

    const notifications = userIds.map(userId => ({
      userId,
      type: NotificationType.TaskDueSoon,
      title: 'Task due soon',
      message: `Task "${task.title}" is due on ${formattedDate}`,
      link: `/tasks/${task.id}`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Notify when a task is overdue
   */
  async notifyTaskOverdue(task: Task, userIds: number[]): Promise<void> {
    const notifications = userIds.map(userId => ({
      userId,
      type: NotificationType.TaskOverdue,
      title: 'Task overdue',
      message: `Task "${task.title}" is overdue`,
      link: `/tasks/${task.id}`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Notify when a comment is added to a task
   */
  async notifyCommentAdded(taskId: number, taskTitle: string, projectId: number, commentAuthor: string, affectedUserIds: number[]): Promise<void> {
    const notifications = affectedUserIds.map(userId => ({
      userId,
      type: NotificationType.CommentAdded,
      title: 'New comment',
      message: `${commentAuthor} commented on "${taskTitle}"`,
      link: `/tasks/${taskId}`,
      relatedProjectId: projectId,
      relatedTaskId: taskId,
    }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Notify when a user is mentioned in a comment
   */
  async notifyMentioned(taskId: number, taskTitle: string, projectId: number, mentionedByUser: string, mentionedUserIds: number[]): Promise<void> {
    const notifications = mentionedUserIds.map(userId => ({
      userId,
      type: NotificationType.CommentMentioned,
      title: 'You were mentioned',
      message: `${mentionedByUser} mentioned you in "${taskTitle}"`,
      link: `/tasks/${taskId}`,
      relatedProjectId: projectId,
      relatedTaskId: taskId,
    }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Notify when a user is invited to a project
   */
  async notifyProjectInvite(project: Project, invitedUserId: number, invitedByUser: string): Promise<void> {
    await this.notificationRepo.create({
      userId: invitedUserId,
      type: NotificationType.ProjectInvite,
      title: 'Project invitation',
      message: `${invitedByUser} added you to project "${project.name}"`,
      link: `/projects/${project.id}`,
      relatedProjectId: project.id,
    });
  }

  /**
   * Notify when a project is updated
   */
  async notifyProjectUpdated(project: Project, updatedByUserId: number, memberUserIds: number[]): Promise<void> {
    const notifications = memberUserIds
      .filter(userId => userId !== updatedByUserId)
      .map(userId => ({
        userId,
        type: NotificationType.ProjectUpdated,
        title: 'Project updated',
        message: `Project "${project.name}" was updated`,
        link: `/projects/${project.id}`,
        relatedProjectId: project.id,
      }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Notify when a task is blocked by a dependency
   */
  async notifyDependencyBlocked(task: Task, blockingTaskTitle: string, affectedUserIds: number[]): Promise<void> {
    const notifications = affectedUserIds.map(userId => ({
      userId,
      type: NotificationType.DependencyBlocked,
      title: 'Task blocked',
      message: `"${task.title}" is blocked by "${blockingTaskTitle}"`,
      link: `/tasks/${task.id}`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Notify when a blocking dependency is resolved
   */
  async notifyDependencyUnblocked(task: Task, unblockedTaskTitle: string, affectedUserIds: number[]): Promise<void> {
    const notifications = affectedUserIds.map(userId => ({
      userId,
      type: NotificationType.DependencyUnblocked,
      title: 'Task unblocked',
      message: `"${task.title}" is no longer blocked - "${unblockedTaskTitle}" was completed`,
      link: `/tasks/${task.id}`,
      relatedProjectId: task.projectId,
      relatedTaskId: task.id,
    }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Send a system notification to one or more users
   */
  async notifySystem(message: string, userIds: number[]): Promise<void> {
    const notifications = userIds.map(userId => ({
      userId,
      type: NotificationType.System,
      title: 'System notification',
      message,
    }));

    if (notifications.length > 0) {
      await this.notificationRepo.createBulk(notifications);
    }
  }

  /**
   * Check for due and overdue tasks and create notifications
   * Should be called periodically (e.g., daily)
   */
  async checkDueTasks(tasks: Task[], getUserIdsForTask: (taskId: number) => Promise<number[]>): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const task of tasks) {
      if (!task.dueDate || task.status === 'done') continue;

      const dueDate = new Date(task.dueDate);
      const userIds = await getUserIdsForTask(task.id);

      // Check if overdue
      if (dueDate < now) {
        await this.notifyTaskOverdue(task, userIds);
      }
      // Check if due within 24 hours
      else if (dueDate <= tomorrow) {
        await this.notifyTaskDueSoon(task, userIds);
      }
    }
  }
}
