import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Grid,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachFile as AttachFileIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { Task, TaskStatus, TaskPriority, Attachment } from '../types';

interface TaskWithAttachments extends Task {
  attachments?: Attachment[];
  commentCount?: number;
}

export const GalleryView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0', 10);
  const [tasks, setTasks] = useState<TaskWithAttachments[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      try {
        const allTasks = await window.electronAPI.task.findByProjectId(projectId);
        if (!isMounted) return;

        // Load attachments and comment counts for each task
        const tasksWithExtras = await Promise.all(
          allTasks.map(async (task) => {
            const attachments = await window.electronAPI.attachment.findByTaskId(task.id);
            const comments = await window.electronAPI.comment.findByTaskId(task.id);

            return {
              ...task,
              attachments,
              commentCount: comments.length,
            };
          })
        );

        if (isMounted) {
          setTasks(tasksWithExtras);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load tasks:', error);
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const loadTasks = async () => {
    try {
      const allTasks = await window.electronAPI.task.findByProjectId(projectId);

      // Load attachments and comment counts for each task
      const tasksWithExtras = await Promise.all(
        allTasks.map(async (task) => {
          const attachments = await window.electronAPI.attachment.findByTaskId(task.id);
          const comments = await window.electronAPI.comment.findByTaskId(task.id);

          return {
            ...task,
            attachments,
            commentCount: comments.length,
          };
        })
      );

      setTasks(tasksWithExtras);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, task: Task) => {
    setAnchorEl(event.currentTarget);
    setSelectedTask(task);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTask(null);
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await window.electronAPI.task.delete(selectedTask.id);
      await loadTasks();
      handleMenuClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const getPriorityColor = (priority: TaskPriority): string => {
    switch (priority) {
      case TaskPriority.Critical: return '#d32f2f';
      case TaskPriority.High: return '#f57c00';
      case TaskPriority.Medium: return '#1976d2';
      case TaskPriority.Low: return '#388e3c';
      default: return '#757575';
    }
  };

  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.Todo: return '#9e9e9e';
      case TaskStatus.InProgress: return '#2196f3';
      case TaskStatus.Review: return '#ff9800';
      case TaskStatus.Done: return '#4caf50';
      case TaskStatus.Blocked: return '#f44336';
      default: return '#757575';
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Due Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Due Tomorrow';
    } else if (date < today) {
      return `Overdue (${date.toLocaleDateString()})`;
    } else {
      return `Due ${date.toLocaleDateString()}`;
    }
  };

  const getCardImage = (task: TaskWithAttachments): string | null => {
    if (!task.attachments || task.attachments.length === 0) return null;
    
    // Find first image attachment
    const imageAttachment = task.attachments.find(att =>
      att.mimeType.startsWith('image/')
    );
    
    return imageAttachment ? `file://${imageAttachment.filePath}` : null;
  };

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gallery View
      </Typography>

      <Grid container spacing={3}>
        {tasks.map((task) => {
          const cardImage = getCardImage(task);
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={task.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                {cardImage ? (
                  <CardMedia
                    component="img"
                    height="160"
                    image={cardImage}
                    alt={task.title}
                    sx={{ objectFit: 'cover' }}
                  />
                ) : (
                  <Box
                    sx={{
                      height: 160,
                      backgroundColor: getStatusColor(task.status),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <Typography variant="h2" sx={{ opacity: 0.3 }}>
                      {getInitials(task.title)}
                    </Typography>
                  </Box>
                )}
                
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1, pr: 1 }}>
                      {task.title}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, task)}
                      sx={{ mt: -1, mr: -1 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  {task.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {task.description}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={task.status.replace('_', ' ')}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(task.status),
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 22,
                      }}
                    />
                    <Chip
                      label={task.priority}
                      size="small"
                      sx={{
                        backgroundColor: getPriorityColor(task.priority),
                        color: 'white',
                        fontSize: '0.7rem',
                        height: 22,
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(task.dueDate)}
                    </Typography>
                  </Box>
                  
                  {task.assignedTo && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Avatar
                        sx={{
                          width: 20,
                          height: 20,
                          fontSize: '0.7rem',
                          bgcolor: 'primary.main',
                        }}
                      >
                        {getInitials(task.assignedTo)}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {task.assignedTo}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions sx={{ pt: 0, px: 2, pb: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                    {task.attachments && task.attachments.length > 0 && (
                      <Tooltip title={`${task.attachments.length} attachment(s)`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AttachFileIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {task.attachments.length}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                    
                    {task.commentCount && task.commentCount > 0 && (
                      <Tooltip title={`${task.commentCount} comment(s)`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CommentIcon fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {task.commentCount}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {tasks.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No tasks found for this project
          </Typography>
        </Paper>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>View Details</MenuItem>
        <MenuItem onClick={handleMenuClose}>Edit</MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};
