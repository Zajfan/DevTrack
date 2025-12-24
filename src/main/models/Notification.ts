/**
 * Notification model
 */
export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  relatedProjectId: number | null;
  relatedTaskId: number | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface CreateNotificationData {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedProjectId?: number;
  relatedTaskId?: number;
}

/**
 * Notification types
 */
export enum NotificationType {
  TaskAssigned = 'task_assigned',
  TaskUpdated = 'task_updated',
  TaskCompleted = 'task_completed',
  TaskDueSoon = 'task_due_soon',
  TaskOverdue = 'task_overdue',
  CommentAdded = 'comment_added',
  CommentMentioned = 'comment_mentioned',
  ProjectInvite = 'project_invite',
  ProjectUpdated = 'project_updated',
  DependencyBlocked = 'dependency_blocked',
  DependencyUnblocked = 'dependency_unblocked',
  System = 'system',
}

/**
 * Helper to get notification icon/color based on type
 */
export function getNotificationStyle(type: NotificationType): { color: string; icon: string } {
  switch (type) {
    case NotificationType.TaskAssigned:
      return { color: '#3b82f6', icon: 'assignment' };
    case NotificationType.TaskUpdated:
      return { color: '#8b5cf6', icon: 'edit' };
    case NotificationType.TaskCompleted:
      return { color: '#10b981', icon: 'check_circle' };
    case NotificationType.TaskDueSoon:
      return { color: '#f59e0b', icon: 'schedule' };
    case NotificationType.TaskOverdue:
      return { color: '#ef4444', icon: 'warning' };
    case NotificationType.CommentAdded:
      return { color: '#3b82f6', icon: 'comment' };
    case NotificationType.CommentMentioned:
      return { color: '#8b5cf6', icon: 'alternate_email' };
    case NotificationType.ProjectInvite:
      return { color: '#10b981', icon: 'group_add' };
    case NotificationType.ProjectUpdated:
      return { color: '#6b7280', icon: 'folder' };
    case NotificationType.DependencyBlocked:
      return { color: '#ef4444', icon: 'block' };
    case NotificationType.DependencyUnblocked:
      return { color: '#10b981', icon: 'check' };
    case NotificationType.System:
      return { color: '#6b7280', icon: 'info' };
    default:
      return { color: '#6b7280', icon: 'notifications' };
  }
}
