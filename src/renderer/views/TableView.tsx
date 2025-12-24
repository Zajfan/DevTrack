import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Chip,
  Typography,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { Task, TaskStatus, TaskPriority, CreateTaskData } from '../types';

type SortField = 'title' | 'status' | 'priority' | 'assignedTo' | 'dueDate' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface EditingTask {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string;
  dueDate: string;
}

export const TableView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || '0', 10);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [editingTask, setEditingTask] = useState<EditingTask | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      try {
        const allTasks = await window.electronAPI.task.findByProjectId(projectId);
        if (isMounted) {
          setTasks(allTasks);
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
      setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortedTasks = (): Task[] => {
    return [...tasks].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      if (aVal === null) aVal = '';
      if (bVal === null) bVal = '';
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleSelectTask = (taskId: number, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo || '',
      dueDate: task.dueDate || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    
    try {
      await window.electronAPI.task.update(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description || undefined,
        status: editingTask.status,
        priority: editingTask.priority,
        assignedTo: editingTask.assignedTo || undefined,
        dueDate: editingTask.dueDate || undefined,
      });
      setEditingTask(null);
      await loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await window.electronAPI.task.delete(taskId);
      await loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTasks.size} task(s)?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedTasks).map(id => window.electronAPI.task.delete(id))
      );
      setSelectedTasks(new Set());
      await loadTasks();
    } catch (error) {
      console.error('Failed to delete tasks:', error);
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
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const sortedTasks = getSortedTasks();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Table View</Typography>
        
        {selectedTasks.size > 0 && (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="body2">
              {selectedTasks.size} task(s) selected
            </Typography>
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={handleBulkDelete}
            >
              Delete Selected
            </Button>
          </Box>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedTasks.size === tasks.length && tasks.length > 0}
                  indeterminate={selectedTasks.size > 0 && selectedTasks.size < tasks.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'title'}
                  direction={sortField === 'title' ? sortOrder : 'asc'}
                  onClick={() => handleSort('title')}
                >
                  Title
                </TableSortLabel>
              </TableCell>
              <TableCell>Description</TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'status'}
                  direction={sortField === 'status' ? sortOrder : 'asc'}
                  onClick={() => handleSort('status')}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'priority'}
                  direction={sortField === 'priority' ? sortOrder : 'asc'}
                  onClick={() => handleSort('priority')}
                >
                  Priority
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'assignedTo'}
                  direction={sortField === 'assignedTo' ? sortOrder : 'asc'}
                  onClick={() => handleSort('assignedTo')}
                >
                  Assigned To
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'dueDate'}
                  direction={sortField === 'dueDate' ? sortOrder : 'asc'}
                  onClick={() => handleSort('dueDate')}
                >
                  Due Date
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortField === 'createdAt'}
                  direction={sortField === 'createdAt' ? sortOrder : 'asc'}
                  onClick={() => handleSort('createdAt')}
                >
                  Created
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTasks.map((task) => (
              <TableRow
                key={task.id}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedTasks.has(task.id)}
                    onChange={(e) => handleSelectTask(task.id, e.target.checked)}
                  />
                </TableCell>
                
                {editingTask?.id === task.id ? (
                  <>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={editingTask.title}
                        onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        value={editingTask.description}
                        onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        fullWidth
                        value={editingTask.status}
                        onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                      >
                        <MenuItem value={TaskStatus.Todo}>To Do</MenuItem>
                        <MenuItem value={TaskStatus.InProgress}>In Progress</MenuItem>
                        <MenuItem value={TaskStatus.Review}>Review</MenuItem>
                        <MenuItem value={TaskStatus.Done}>Done</MenuItem>
                        <MenuItem value={TaskStatus.Blocked}>Blocked</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        fullWidth
                        value={editingTask.priority}
                        onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                      >
                        <MenuItem value={TaskPriority.Low}>Low</MenuItem>
                        <MenuItem value={TaskPriority.Medium}>Medium</MenuItem>
                        <MenuItem value={TaskPriority.High}>High</MenuItem>
                        <MenuItem value={TaskPriority.Critical}>Critical</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={editingTask.assignedTo}
                        onChange={(e) => setEditingTask({ ...editingTask, assignedTo: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="date"
                        fullWidth
                        value={editingTask.dueDate}
                        onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>{formatDate(task.createdAt)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={handleSaveEdit} color="primary">
                        <SaveIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={handleCancelEdit}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {task.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                        {task.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status.replace('_', ' ')}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(task.status),
                          color: 'white',
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.priority}
                        size="small"
                        sx={{
                          backgroundColor: getPriorityColor(task.priority),
                          color: 'white',
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {task.assignedTo || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(task.dueDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(task.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditTask(task)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteTask(task.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
