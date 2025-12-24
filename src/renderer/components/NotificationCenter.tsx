import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
  Divider,
  Button,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Assignment as TaskIcon,
  Comment as CommentIcon,
  Folder as ProjectIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Info as InfoIcon,
  AlternateEmail as MentionIcon,
  GroupAdd as GroupAddIcon,
} from '@mui/icons-material';
import { Notification, NotificationType } from '../types';
import { useNavigate } from 'react-router-dom';

interface NotificationCenterProps {
  userId: number;
}

export default function NotificationCenter({ userId }: NotificationCenterProps) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadUnreadCount = async () => {
    try {
      const count = await window.electronAPI.notification.getUnreadCount(userId);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.notification.findByUserId(userId, 20);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    await loadNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await window.electronAPI.notification.markAsRead(notificationId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await window.electronAPI.notification.markAllAsRead(userId);
      await loadNotifications();
      await loadUnreadCount();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate if there's a link
    if (notification.link) {
      navigate(notification.link);
      handleClose();
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.TaskAssigned:
        return <TaskIcon fontSize="small" sx={{ color: '#3b82f6' }} />;
      case NotificationType.TaskUpdated:
        return <TaskIcon fontSize="small" sx={{ color: '#8b5cf6' }} />;
      case NotificationType.TaskCompleted:
        return <CheckCircleIcon fontSize="small" sx={{ color: '#10b981' }} />;
      case NotificationType.TaskDueSoon:
        return <ScheduleIcon fontSize="small" sx={{ color: '#f59e0b' }} />;
      case NotificationType.TaskOverdue:
        return <WarningIcon fontSize="small" sx={{ color: '#ef4444' }} />;
      case NotificationType.CommentAdded:
        return <CommentIcon fontSize="small" sx={{ color: '#3b82f6' }} />;
      case NotificationType.CommentMentioned:
        return <MentionIcon fontSize="small" sx={{ color: '#8b5cf6' }} />;
      case NotificationType.ProjectInvite:
        return <GroupAddIcon fontSize="small" sx={{ color: '#10b981' }} />;
      case NotificationType.ProjectUpdated:
        return <ProjectIcon fontSize="small" sx={{ color: '#6b7280' }} />;
      case NotificationType.DependencyBlocked:
        return <BlockIcon fontSize="small" sx={{ color: '#ef4444' }} />;
      case NotificationType.DependencyUnblocked:
        return <CheckCircleIcon fontSize="small" sx={{ color: '#10b981' }} />;
      default:
        return <InfoIcon fontSize="small" sx={{ color: '#6b7280' }} />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        size="small"
        onClick={handleOpen}
        sx={{ color: '#cccccc' }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 600 },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllAsRead}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />

        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItemButton
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                    '&:hover': {
                      backgroundColor: notification.isRead ? 'action.hover' : 'action.selected',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, width: '100%', alignItems: 'start' }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'background.default' }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: notification.isRead ? 400 : 600,
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {notification.title}
                        </Typography>
                        {!notification.isRead && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'primary.main',
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(notification.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                </ListItemButton>
                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
}
