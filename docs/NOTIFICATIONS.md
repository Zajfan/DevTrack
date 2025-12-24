# Notification System Documentation

## Overview

DevTrack's notification system provides real-time alerts for task updates, assignments, deadlines, and team collaboration events. The system uses a type-safe TypeScript implementation with SQLite storage.

## Features

- ✅ 12 notification types covering all major events
- ✅ Real-time badge updates (30-second polling)
- ✅ Mark as read/unread functionality
- ✅ Bulk operations for efficiency
- ✅ Automatic cleanup of old notifications
- ✅ Type-specific icons and colors
- ✅ Relative timestamp display
- ✅ Click-to-navigate to related content

## Notification Types

| Type | Trigger | Example |
|------|---------|---------|
| `TaskAssigned` | User assigned to task | "You have been assigned to task: Fix login bug" |
| `TaskUpdated` | Task modified | "Task 'Update docs' was updated" |
| `TaskCompleted` | Task marked done | "Task 'Deploy to prod' has been completed" |
| `TaskDueSoon` | Due within 24 hours | "Task 'Code review' is due on 01/15/2024" |
| `TaskOverdue` | Past due date | "Task 'Fix bug #123' is overdue" |
| `CommentAdded` | New comment posted | "Alice commented on 'Fix login bug'" |
| `CommentMentioned` | User @mentioned | "Bob mentioned you in 'Update docs'" |
| `ProjectInvite` | Added to project | "Charlie added you to project 'DevTrack v2'" |
| `ProjectUpdated` | Project modified | "Project 'DevTrack v2' was updated" |
| `DependencyBlocked` | Task blocked by dependency | "'Feature X' is blocked by 'Setup DB'" |
| `DependencyUnblocked` | Blocker resolved | "'Feature X' is no longer blocked - 'Setup DB' was completed" |
| `System` | System message | "Scheduled maintenance tonight at 2 AM" |

## Architecture

### Database Schema

```sql
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  related_project_id INTEGER,
  related_task_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

### Backend Components

**NotificationRepository** (`src/main/repositories/NotificationRepository.ts`)
- `create(data)` - Create single notification
- `createBulk(notifications[])` - Bulk insert with transaction
- `findByUserId(userId, limit?)` - Get user's notifications
- `findUnreadByUserId(userId, limit?)` - Unread only
- `getUnreadCount(userId)` - Badge count
- `markAsRead(id)` / `markAllAsRead(userId)` - Read status
- `delete(id)` / `deleteAllByUserId(userId)` - Deletion
- `deleteOldReadNotifications(daysOld)` - Cleanup utility

**NotificationHelper** (`src/main/utils/NotificationHelper.ts`)
- `notifyTaskAssigned(task, userId)` - Task assignment
- `notifyTaskUpdated(task, updatedBy, affectedUsers)` - Task changes
- `notifyTaskCompleted(task, completedBy, affectedUsers)` - Task completion
- `notifyTaskDueSoon(task, userIds)` - Due date reminder
- `notifyTaskOverdue(task, userIds)` - Overdue alert
- `notifyCommentAdded(taskId, author, affectedUsers)` - New comment
- `notifyMentioned(taskId, mentionedBy, mentionedUsers)` - @mentions
- `notifyProjectInvite(project, userId, invitedBy)` - Project access
- `notifyProjectUpdated(project, updatedBy, members)` - Project changes
- `notifyDependencyBlocked(task, blockingTask, affectedUsers)` - Blocked tasks
- `notifyDependencyUnblocked(task, unblockedTask, affectedUsers)` - Unblocked tasks
- `notifySystem(message, userIds)` - System announcements
- `checkDueTasks(tasks, getUserIds)` - Periodic due date check

### Frontend Components

**NotificationCenter** (`src/renderer/components/NotificationCenter.tsx`)
- Badge with unread count in title bar
- Popover with notification list (20 most recent)
- Auto-refresh every 30 seconds
- Click notification to navigate and mark as read
- "Mark all read" bulk action
- Type-specific colored icons
- Relative timestamps (Just now, 5m ago, 3h ago)

## Usage Examples

### Creating Notifications Manually

```typescript
// In main process
import { NotificationRepository } from './repositories/NotificationRepository';
import { NotificationType } from './models/Notification';

const notificationRepo = new NotificationRepository(db);

// Create single notification
await notificationRepo.create({
  userId: 1,
  type: NotificationType.TaskAssigned,
  title: 'New task assigned',
  message: 'You have been assigned to task: Fix login bug',
  link: '/tasks/42',
  relatedProjectId: 5,
  relatedTaskId: 42,
});

// Create multiple notifications efficiently
await notificationRepo.createBulk([
  {
    userId: 1,
    type: NotificationType.TaskDueSoon,
    title: 'Task due soon',
    message: 'Task "Code review" is due tomorrow',
    link: '/tasks/10',
    relatedTaskId: 10,
  },
  {
    userId: 2,
    type: NotificationType.CommentAdded,
    title: 'New comment',
    message: 'Alice commented on "Fix bug #123"',
    link: '/tasks/20',
    relatedTaskId: 20,
  },
]);
```

### Using NotificationHelper

```typescript
import { NotificationHelper } from './utils/NotificationHelper';

const notificationHelper = new NotificationHelper(notificationRepo);

// When assigning a task
await notificationHelper.notifyTaskAssigned(task, assignedToUserId, assignedByUserId);

// When updating a task
const affectedUsers = [task.assigneeId, task.creatorId];
await notificationHelper.notifyTaskUpdated(task, updatedByUserId, affectedUsers);

// When completing a task
await notificationHelper.notifyTaskCompleted(task, completedByUserId, [task.assigneeId]);

// When adding a comment
await notificationHelper.notifyCommentAdded(
  taskId,
  taskTitle,
  projectId,
  commentAuthor,
  [task.assigneeId, task.watchers]
);

// Daily cron job to check for due/overdue tasks
const activeTasks = await taskRepo.findByStatus('in_progress');
await notificationHelper.checkDueTasks(activeTasks, async (taskId) => {
  const task = await taskRepo.findById(taskId);
  return task.assigneeId ? [task.assigneeId] : [];
});
```

### Frontend Integration

```typescript
// In React component
import { useEffect, useState } from 'react';

function MyComponent() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load unread count
    const loadCount = async () => {
      const count = await window.electronAPI.notification.getUnreadCount(userId);
      setUnreadCount(count);
    };

    loadCount();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Mark notification as read when clicked
  const handleNotificationClick = async (notificationId: number, link?: string) => {
    await window.electronAPI.notification.markAsRead(notificationId);
    if (link) {
      navigate(link);
    }
  };

  return <Badge badgeContent={unreadCount}>...</Badge>;
}
```

## IPC API

All notification methods are exposed via `window.electronAPI.notification`:

```typescript
// Create
notification.create(data: CreateNotificationData): Promise<Notification>
notification.createBulk(notifications: CreateNotificationData[]): Promise<Notification[]>

// Read
notification.findById(id: number): Promise<Notification | null>
notification.findByUserId(userId: number, limit?: number): Promise<Notification[]>
notification.findUnreadByUserId(userId: number, limit?: number): Promise<Notification[]>
notification.getUnreadCount(userId: number): Promise<number>

// Update
notification.markAsRead(id: number): Promise<Notification>
notification.markAllAsRead(userId: number): Promise<void>
notification.markAsUnread(id: number): Promise<Notification>

// Delete
notification.delete(id: number): Promise<boolean>
notification.deleteAllByUserId(userId: number): Promise<void>
notification.deleteOldReadNotifications(daysOld: number): Promise<void>

// Filter
notification.findByType(userId: number, type: NotificationType, limit?: number): Promise<Notification[]>
notification.findByProjectId(userId: number, projectId: number, limit?: number): Promise<Notification[]>
notification.findByTaskId(userId: number, taskId: number, limit?: number): Promise<Notification[]>
```

## Best Practices

### Performance
- Use `createBulk()` for multiple notifications instead of individual `create()` calls
- Set reasonable limits when fetching notifications (default: 20)
- Run `deleteOldReadNotifications()` periodically (e.g., weekly) to prevent bloat

### User Experience
- Don't notify users of their own actions (filter out `updatedByUserId`)
- Use appropriate notification types for context
- Include helpful links to related content
- Keep messages concise and actionable

### Maintenance
- Clean up old read notifications regularly:
  ```typescript
  // Delete notifications read more than 30 days ago
  await notificationRepo.deleteOldReadNotifications(30);
  ```

- Set up periodic due date checks:
  ```typescript
  // Run daily at midnight
  setInterval(async () => {
    const tasks = await taskRepo.findActiveTasksWithDueDates();
    await notificationHelper.checkDueTasks(tasks, getUserIdsForTask);
  }, 24 * 60 * 60 * 1000);
  ```

## Styling

Notification icons use Material-UI color palette:

| Type | Icon | Color |
|------|------|-------|
| TaskAssigned | Assignment | Primary (blue) |
| TaskUpdated | Update | Info (light blue) |
| TaskCompleted | CheckCircle | Success (green) |
| TaskDueSoon | Schedule | Warning (orange) |
| TaskOverdue | Error | Error (red) |
| CommentAdded | Comment | Info (light blue) |
| CommentMentioned | AlternateEmail | Secondary (purple) |
| ProjectInvite | GroupAdd | Primary (blue) |
| ProjectUpdated | BusinessCenter | Info (light blue) |
| DependencyBlocked | Block | Error (red) |
| DependencyUnblocked | LockOpen | Success (green) |
| System | Notifications | Default (grey) |

## Future Enhancements

- [ ] Email/push notification delivery
- [ ] Notification preferences per type
- [ ] Notification grouping/threading
- [ ] Snooze functionality
- [ ] Desktop notifications (OS-level)
- [ ] Sound alerts
- [ ] Notification channels/categories
- [ ] Digest mode (daily summary)

## Troubleshooting

**Badge not updating?**
- Check browser console for IPC errors
- Verify userId is correct
- Check database for notifications with `sqlite3 devtrack.db "SELECT * FROM notifications WHERE user_id = 1;"`

**Notifications not appearing?**
- Verify notification was created in database
- Check `is_read` status
- Ensure NotificationCenter component is mounted
- Check polling interval (default: 30 seconds)

**Performance issues?**
- Run cleanup: `deleteOldReadNotifications(30)`
- Check notification count: `SELECT COUNT(*) FROM notifications;`
- Add database indexes if missing
- Use limits when fetching: `findByUserId(userId, 50)`

## Related Documentation

- [Database Schema](./ARCHITECTURE.md#database)
- [IPC Architecture](./ARCHITECTURE.md#ipc-communication)
- [Type System](./ARCHITECTURE.md#typescript-types)
- [UI Components](./ARCHITECTURE.md#frontend-components)
