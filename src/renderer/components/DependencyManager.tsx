import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Chip,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Block as BlockIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { Task, TaskDependencyWithDetails, DependencyType, CreateTaskDependencyData } from '../types';

interface DependencyManagerProps {
  open: boolean;
  onClose: () => void;
  taskId: number;
  projectId: number;
}

export default function DependencyManager({ open, onClose, taskId, projectId }: DependencyManagerProps) {
  const [dependencies, setDependencies] = useState<TaskDependencyWithDetails[]>([]);
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dependencyType, setDependencyType] = useState<DependencyType>(DependencyType.Blocks);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load dependencies and available tasks
  useEffect(() => {
    if (open) {
      loadDependencies();
      loadAvailableTasks();
    }
  }, [open, taskId]);

  const loadDependencies = async () => {
    try {
      const deps = await window.electronAPI.dependency.findByTaskIdWithDetails(taskId);
      setDependencies(deps);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
      setError('Failed to load dependencies');
    }
  };

  const loadAvailableTasks = async () => {
    try {
      const allTasks = await window.electronAPI.task.findByProjectId(projectId);
      // Filter out the current task and tasks that already have dependencies
      const existingDepIds = dependencies.map(d => d.dependsOnTaskId);
      const filtered = allTasks.filter(t => t.id !== taskId && !existingDepIds.includes(t.id));
      setAvailableTasks(filtered);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to load tasks');
    }
  };

  const handleAddDependency = async () => {
    if (!selectedTask) {
      setError('Please select a task');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: CreateTaskDependencyData = {
        taskId,
        dependsOnTaskId: selectedTask.id,
        dependencyType
      };

      await window.electronAPI.dependency.create(data);
      setSelectedTask(null);
      setDependencyType(DependencyType.Blocks);
      await loadDependencies();
      await loadAvailableTasks();
    } catch (err: any) {
      console.error('Failed to create dependency:', err);
      setError(err.message || 'Failed to create dependency');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDependency = async (dependencyId: number) => {
    try {
      await window.electronAPI.dependency.delete(dependencyId);
      await loadDependencies();
      await loadAvailableTasks();
    } catch (err) {
      console.error('Failed to delete dependency:', err);
      setError('Failed to delete dependency');
    }
  };

  const getDependencyTypeLabel = (type: DependencyType) => {
    switch (type) {
      case DependencyType.Blocks:
        return 'Blocks';
      case DependencyType.BlockedBy:
        return 'Blocked By';
      case DependencyType.RelatesTo:
        return 'Relates To';
      default:
        return type;
    }
  };

  const getDependencyTypeColor = (type: DependencyType) => {
    switch (type) {
      case DependencyType.Blocks:
        return 'error';
      case DependencyType.BlockedBy:
        return 'warning';
      case DependencyType.RelatesTo:
        return 'info';
      default:
        return 'default';
    }
  };

  const getDependencyIcon = (type: DependencyType) => {
    switch (type) {
      case DependencyType.Blocks:
      case DependencyType.BlockedBy:
        return <BlockIcon fontSize="small" />;
      case DependencyType.RelatesTo:
        return <LinkIcon fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage Task Dependencies</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Add new dependency */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Add Dependency
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <Autocomplete
              sx={{ flex: 1 }}
              options={availableTasks}
              getOptionLabel={(task) => `#${task.id} - ${task.title}`}
              value={selectedTask}
              onChange={(_, newValue) => setSelectedTask(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Task"
                  size="small"
                />
              )}
              renderOption={(props, task) => (
                <li {...props} key={task.id}>
                  <Box>
                    <Typography variant="body2">#{task.id} - {task.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {task.status} • {task.priority}
                    </Typography>
                  </Box>
                </li>
              )}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={dependencyType}
                label="Type"
                onChange={(e) => setDependencyType(e.target.value as DependencyType)}
              >
                <MenuItem value={DependencyType.Blocks}>Blocks</MenuItem>
                <MenuItem value={DependencyType.BlockedBy}>Blocked By</MenuItem>
                <MenuItem value={DependencyType.RelatesTo}>Relates To</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddDependency}
              disabled={!selectedTask || loading}
            >
              Add
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            • <strong>Blocks:</strong> This task must be completed before the selected task<br />
            • <strong>Blocked By:</strong> This task cannot start until the selected task is completed<br />
            • <strong>Relates To:</strong> This task is related to the selected task
          </Typography>
        </Box>

        {/* Existing dependencies */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Current Dependencies ({dependencies.length})
          </Typography>
          {dependencies.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No dependencies yet. Add dependencies to link related tasks.
            </Typography>
          ) : (
            <List>
              {dependencies.map((dep) => (
                <ListItem
                  key={dep.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <Box sx={{ mr: 2 }}>
                    {getDependencyIcon(dep.dependencyType)}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={getDependencyTypeLabel(dep.dependencyType)}
                          size="small"
                          color={getDependencyTypeColor(dep.dependencyType)}
                        />
                        <Typography variant="body2">
                          #{dep.dependsOnTaskId} - {dep.dependsOnTaskTitle}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        Status: {dep.dependsOnTaskStatus}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteDependency(dep.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
