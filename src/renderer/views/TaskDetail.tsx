import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Button,
  TextField,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Flag as FlagIcon,
  Send as SendIcon,
  Label as LabelIcon,
  AttachFile as AttachFileIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  OpenInNew as OpenIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { Task, Comment, TaskPriority, Label, Attachment, TaskDependencyWithDetails } from '../types';
import LabelManager from '../components/LabelManager';
import DependencyManager from '../components/DependencyManager';
import TimeTracker from '../components/TimeTracker';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependencyWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [dependencyManagerOpen, setDependencyManagerOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTaskAndComments = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      try {
        const taskId = parseInt(id!);
        const taskData = await window.electronAPI.task.findById(taskId);
        if (!isMounted) return;

        if (!taskData) {
          setError(ERROR_MESSAGES.TASK_NOT_FOUND);
          return;
        }
        setTask(taskData);

        const commentsData = await window.electronAPI.comment.findByTaskId(taskId);
        if (!isMounted) return;
        setComments(commentsData);

        const labelsData = await window.electronAPI.label.findByTaskId(taskId);
        if (!isMounted) return;
        setLabels(labelsData);

        const attachmentsData = await window.electronAPI.attachment.findByTaskId(taskId);
        if (!isMounted) return;
        setAttachments(attachmentsData);

        const dependenciesData = await window.electronAPI.dependency.findByTaskIdWithDetails(taskId);
        if (!isMounted) return;
        setDependencies(dependenciesData);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : ERROR_MESSAGES.LOAD_TASK_FAILED);
          console.error(ERROR_MESSAGES.LOAD_TASK_FAILED, err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      loadTaskAndComments();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const loadTaskAndComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const taskId = parseInt(id!);
      const taskData = await window.electronAPI.task.findById(taskId);
      if (!taskData) {
        setError(ERROR_MESSAGES.TASK_NOT_FOUND);
        return;
      }
      setTask(taskData);

      const commentsData = await window.electronAPI.comment.findByTaskId(taskId);
      setComments(commentsData);

      const labelsData = await window.electronAPI.label.findByTaskId(taskId);
      setLabels(labelsData);

      const attachmentsData = await window.electronAPI.attachment.findByTaskId(taskId);
      setAttachments(attachmentsData);

      const dependenciesData = await window.electronAPI.dependency.findByTaskIdWithDetails(taskId);
      setDependencies(dependenciesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.LOAD_TASK_FAILED);
      console.error(ERROR_MESSAGES.LOAD_TASK_FAILED, err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;

    try {
      await window.electronAPI.comment.create({
        taskId: task.id,
        author: 'You', // Solo user for now
        content: newComment,
      });

      setNewComment('');
      loadTaskAndComments();
    } catch (err) {
      console.error(ERROR_MESSAGES.CREATE_COMMENT_FAILED, err);
      setError(ERROR_MESSAGES.CREATE_COMMENT_FAILED);
    }
  };

  const handleUpdateComment = async (commentId: number) => {
    if (!editCommentText.trim()) return;

    try {
      await window.electronAPI.comment.update(commentId, {
        content: editCommentText,
      });

      setEditingComment(null);
      setEditCommentText('');
      loadTaskAndComments();
    } catch (err) {
      console.error(ERROR_MESSAGES.UPDATE_COMMENT_FAILED, err);
      setError(ERROR_MESSAGES.UPDATE_COMMENT_FAILED);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Delete this comment?')) return;

    try {
      await window.electronAPI.comment.delete(commentId);
      loadTaskAndComments();
    } catch (err) {
      console.error(ERROR_MESSAGES.DELETE_COMMENT_FAILED, err);
      setError(ERROR_MESSAGES.DELETE_COMMENT_FAILED);
    }
  };

  const handleFileUpload = async () => {
    if (!task) return;
    
    setUploadingFile(true);
    try {
      const uploadedFiles = await window.electronAPI.file.upload(task.id);
      if (uploadedFiles.length > 0) {
        loadTaskAndComments();
      }
    } catch (err) {
      console.error(ERROR_MESSAGES.UPLOAD_FILE_FAILED, err);
      setError(ERROR_MESSAGES.UPLOAD_FILE_FAILED);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileOpen = async (attachmentId: number) => {
    try {
      await window.electronAPI.file.open(attachmentId);
    } catch (err) {
      console.error(ERROR_MESSAGES.OPEN_FILE_FAILED, err);
      setError(ERROR_MESSAGES.OPEN_FILE_FAILED);
    }
  };

  const handleFileDelete = async (attachmentId: number) => {
    if (!confirm('Delete this attachment?')) return;
    
    try {
      await window.electronAPI.file.deleteWithCleanup(attachmentId);
      loadTaskAndComments();
    } catch (err) {
      console.error(ERROR_MESSAGES.DELETE_FILE_FAILED, err);
      setError(ERROR_MESSAGES.DELETE_FILE_FAILED);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon />;
    if (mimeType === 'application/pdf') return <PdfIcon />;
    return <FileIcon />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.Critical:
        return '#ef4444';
      case TaskPriority.High:
        return '#f59e0b';
      case TaskPriority.Medium:
        return '#3b82f6';
      case TaskPriority.Low:
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      todo: '#6b7280',
      in_progress: '#3b82f6',
      review: '#f59e0b',
      done: '#10b981',
      blocked: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!task) {
    return (
      <Box>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/tasks')}>
          Back to Tasks
        </Button>
        <Typography variant="h6" sx={{ mt: 4, textAlign: 'center' }}>
          Task not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/tasks')}>
          <BackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 600, flex: 1 }}>
          Task Details
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Task Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            label={task.status.replace('_', ' ')}
            size="small"
            sx={{
              backgroundColor: `${getStatusColor(task.status)}20`,
              color: getStatusColor(task.status),
            }}
          />
          <Chip
            icon={<FlagIcon />}
            label={task.priority}
            size="small"
            sx={{
              backgroundColor: `${getPriorityColor(task.priority)}20`,
              color: getPriorityColor(task.priority),
            }}
          />
          {task.dueDate && (
            <Chip
              label={`Due: ${new Date(task.dueDate).toLocaleDateString()}`}
              size="small"
              variant="outlined"
            />
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<LinkIcon />}
            onClick={() => setDependencyManagerOpen(true)}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Dependencies
          </Button>
          <Button
            size="small"
            startIcon={<LabelIcon />}
            onClick={() => setLabelManagerOpen(true)}
            variant="outlined"
          >
            Manage Labels
          </Button>
        </Box>

        {/* Labels */}
        {labels.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {labels.map(label => (
              <Chip
                key={label.id}
                label={label.name}
                size="small"
                sx={{
                  backgroundColor: `${label.color}20`,
                  color: label.color,
                  fontWeight: 600,
                }}
              />
            ))}
          </Box>
        )}

        {/* Dependencies */}
        {dependencies.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Dependencies
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {dependencies.map(dep => (
                <Chip
                  key={dep.id}
                  icon={<LinkIcon />}
                  label={`${dep.dependencyType === 'blocks' ? 'Blocks' : dep.dependencyType === 'blocked_by' ? 'Blocked by' : 'Related to'}: #${dep.dependsOnTaskId} ${dep.dependsOnTaskTitle}`}
                  size="small"
                  variant="outlined"
                  color={dep.dependencyType === 'blocks' ? 'error' : dep.dependencyType === 'blocked_by' ? 'warning' : 'info'}
                />
              ))}
            </Box>
          </Box>
        )}

        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          {task.title}
        </Typography>

        {task.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {task.description}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2, fontSize: '0.85rem', color: 'text.secondary' }}>
          <Typography variant="caption">
            Created: {new Date(task.createdAt).toLocaleString()}
          </Typography>
          <Typography variant="caption">
            Updated: {new Date(task.updatedAt).toLocaleString()}
          </Typography>
          {task.completedAt && (
            <Typography variant="caption">
              Completed: {new Date(task.completedAt).toLocaleString()}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Attachments Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Attachments ({attachments.length})
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AttachFileIcon />}
            onClick={handleFileUpload}
            disabled={uploadingFile}
          >
            {uploadingFile ? 'Uploading...' : 'Upload Files'}
          </Button>
        </Box>

        {attachments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No attachments yet. Click "Upload Files" to add files to this task.
          </Typography>
        ) : (
          <List>
            {attachments.map(attachment => (
              <ListItem
                key={attachment.id}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon>
                  {getFileIcon(attachment.mimeType)}
                </ListItemIcon>
                <ListItemText
                  primary={attachment.fileName}
                  secondary={`${formatFileSize(attachment.fileSize)} • Uploaded by ${attachment.uploadedBy} • ${new Date(attachment.uploadedAt).toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleFileOpen(attachment.id)}
                    sx={{ mr: 1 }}
                    title="Open file"
                  >
                    <OpenIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleFileDelete(attachment.id)}
                    title="Delete file"
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Time Tracking Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Time Tracking
        </Typography>
        
        <TimeTracker
          taskId={task.id}
          userId={1} // TODO: Get from authenticated user
          onEntryCreated={() => console.log('Time entry created')}
          onEntryUpdated={() => console.log('Time entry updated')}
          onEntryDeleted={() => console.log('Time entry deleted')}
        />
      </Paper>

      {/* Comments Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Comments ({comments.length})
        </Typography>

        {/* Add Comment */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleAddComment();
              }
            }}
          />
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            sx={{ alignSelf: 'flex-start' }}
          >
            Post
          </Button>
        </Box>

        {/* Comments List */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {comments.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No comments yet. Be the first to comment!
            </Typography>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {comment.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(comment.createdAt).toLocaleString()}
                        {comment.updatedAt !== comment.createdAt && ' (edited)'}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingComment(comment.id);
                          setEditCommentText(comment.content);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteComment(comment.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {editingComment === comment.id ? (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        value={editCommentText}
                        onChange={(e) => setEditCommentText(e.target.value)}
                      />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleUpdateComment(comment.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setEditingComment(null);
                            setEditCommentText('');
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {comment.content}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      </Paper>

      {/* Label Manager Dialog */}
      {task && (
        <LabelManager
          open={labelManagerOpen}
          onClose={() => setLabelManagerOpen(false)}
          projectId={task.projectId}
          taskId={task.id}
          taskLabels={labels}
          onLabelsChange={loadTaskAndComments}
        />
      )}

      {/* Dependency Manager Dialog */}
      {task && (
        <DependencyManager
          open={dependencyManagerOpen}
          onClose={() => {
            setDependencyManagerOpen(false);
            loadTaskAndComments();
          }}
          taskId={task.id}
          projectId={task.projectId}
        />
      )}
    </Box>
  );
}
