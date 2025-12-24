import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  ViewKanban as BoardViewIcon,
  ViewList as ListViewIcon,
  MoreVert as MoreIcon,
  Flag as FlagIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Task, TaskStatus, TaskPriority, Project, Label, CustomField } from '../types';
import CustomFieldInput from '../components/CustomFieldInput';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export default function Tasks() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [taskLabels, setTaskLabels] = useState<Record<number, Label[]>>({});
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<number, string>>({});
  const [selectedProject, setSelectedProject] = useState<number | 'all'>('all');
  const [selectedLabel, setSelectedLabel] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sortBy, setSortBy] = useState<'title' | 'status' | 'priority' | 'dueDate'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: TaskPriority.Medium,
    projectId: 0,
    dueDate: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      try {
        // Load projects
        const projectsData = await window.electronAPI.project.findAll();
        if (!isMounted) return;
        setProjects(projectsData);

        // Load tasks for selected project or all tasks
        let tasksData: Task[] = [];
        if (selectedProject === 'all') {
          // Load tasks from all projects
          for (const project of projectsData) {
            const projectTasks = await window.electronAPI.task.findByProjectId(project.id);
            if (!isMounted) return;
            tasksData = [...tasksData, ...projectTasks];
          }
        } else {
          tasksData = await window.electronAPI.task.findByProjectId(selectedProject);
          if (!isMounted) return;
        }
        setTasks(tasksData);

        // Load labels for all tasks
        const labelsMap: Record<number, Label[]> = {};
        for (const task of tasksData) {
          const labels = await window.electronAPI.label.findByTaskId(task.id);
          if (!isMounted) return;
          labelsMap[task.id] = labels;
        }
        setTaskLabels(labelsMap);

        // Load all unique labels from all projects
        const allProjectLabels: Label[] = [];
        for (const project of projectsData) {
          const projectLabels = await window.electronAPI.label.findByProjectId(project.id);
          if (!isMounted) return;
          allProjectLabels.push(...projectLabels);
        }
        setAllLabels(allProjectLabels);

        if (isMounted) {
          console.log('Loaded tasks:', tasksData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : ERROR_MESSAGES.LOAD_DATA_FAILED);
          console.error(ERROR_MESSAGES.LOAD_DATA_FAILED, err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [selectedProject]);

  // Load custom fields when project changes in dialog
  useEffect(() => {
    let isMounted = true;

    const loadCustomFieldsForProject = async (projectId: number) => {
      const fields = await window.electronAPI.customField.findByProjectId(projectId);
      if (isMounted) {
        setCustomFields(fields);
        // Reset custom field values
        setCustomFieldValues({});
      }
    };

    if (createDialogOpen && newTask.projectId) {
      loadCustomFieldsForProject(newTask.projectId);
    }

    return () => {
      isMounted = false;
    };
  }, [createDialogOpen, newTask.projectId]);

  useEffect(() => {
    let isMounted = true;

    const loadCustomFieldsForTask = async (task: Task) => {
      const fields = await window.electronAPI.customField.findByProjectId(task.projectId);
      if (!isMounted) return;
      setCustomFields(fields);

      // Load existing values
      const values = await window.electronAPI.customField.getTaskValues(task.id);
      if (isMounted) {
        const valuesMap: Record<number, string> = {};
        values.forEach(v => {
          valuesMap[v.customFieldId] = v.value;
        });
        setCustomFieldValues(valuesMap);
      }
    };

    if (editDialogOpen && editingTask) {
      loadCustomFieldsForTask(editingTask);
    }

    return () => {
      isMounted = false;
    };
  }, [editDialogOpen, editingTask]);

  const loadCustomFieldsForProject = async (projectId: number) => {
    const fields = await window.electronAPI.customField.findByProjectId(projectId);
    setCustomFields(fields);
    // Reset custom field values
    setCustomFieldValues({});
  };

  const loadCustomFieldsForTask = async (task: Task) => {
    const fields = await window.electronAPI.customField.findByProjectId(task.projectId);
    setCustomFields(fields);

    // Load existing values
    const values = await window.electronAPI.customField.getTaskValues(task.id);
    const valuesMap: Record<number, string> = {};
    values.forEach(v => {
      valuesMap[v.customFieldId] = v.value;
    });
    setCustomFieldValues(valuesMap);
  };
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load projects
      const projectsData = await window.electronAPI.project.findAll();
      setProjects(projectsData);

      // Load tasks for selected project or all tasks
      let tasksData: Task[] = [];
      if (selectedProject === 'all') {
        // Load tasks from all projects
        for (const project of projectsData) {
          const projectTasks = await window.electronAPI.task.findByProjectId(project.id);
          tasksData = [...tasksData, ...projectTasks];
        }
      } else {
        tasksData = await window.electronAPI.task.findByProjectId(selectedProject);
      }
      setTasks(tasksData);

      // Load labels for all tasks
      await loadTaskLabels(tasksData);

      // Load all unique labels from all projects
      const allProjectLabels: Label[] = [];
      for (const project of projectsData) {
        const projectLabels = await window.electronAPI.label.findByProjectId(project.id);
        allProjectLabels.push(...projectLabels);
      }
      setAllLabels(allProjectLabels);

      console.log('Loaded tasks:', tasksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.LOAD_DATA_FAILED);
      console.error(ERROR_MESSAGES.LOAD_DATA_FAILED, err);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskLabels = async (tasksList: Task[]) => {
    const labelsMap: Record<number, Label[]> = {};
    for (const task of tasksList) {
      const labels = await window.electronAPI.label.findByTaskId(task.id);
      labelsMap[task.id] = labels;
    }
    setTaskLabels(labelsMap);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // If dropped in the same column, do nothing
    if (source.droppableId === destination.droppableId) return;

    // Update task status
    const taskId = parseInt(draggableId.replace('task-', ''));
    const newStatus = destination.droppableId as TaskStatus;

    try {
      await window.electronAPI.task.update(taskId, { status: newStatus });
      
      // Optimistically update local state
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (err) {
      console.error(ERROR_MESSAGES.UPDATE_TASK_STATUS_FAILED, err);
      setError(ERROR_MESSAGES.UPDATE_TASK_STATUS_FAILED);
      // Reload to get correct state
      loadData();
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.projectId) {
      setError(ERROR_MESSAGES.TASK_TITLE_REQUIRED);
      return;
    }

    try {
      const createdTask = await window.electronAPI.task.create({
        projectId: newTask.projectId,
        title: newTask.title,
        description: newTask.description || undefined,
        status: TaskStatus.Todo,
        priority: newTask.priority,
        assignedTo: undefined,
        dueDate: newTask.dueDate || undefined,
        position: tasks.length,
      });

      // Save custom field values
      for (const field of customFields) {
        const value = customFieldValues[field.id];
        if (value) {
          await window.electronAPI.customField.setTaskValue(createdTask.id, field.id, value);
        }
      }

      setCreateDialogOpen(false);
      setNewTask({ title: '', description: '', priority: TaskPriority.Medium, projectId: 0, dueDate: '' });
      setCustomFieldValues({});
      loadData();
    } catch (err) {
      console.error(ERROR_MESSAGES.CREATE_TASK_FAILED, err);
      setError(ERROR_MESSAGES.CREATE_TASK_FAILED);
    }
  };

  const handleEditTask = async () => {
    if (!editingTask) return;

    try {
      await window.electronAPI.task.update(editingTask.id, {
        title: editingTask.title,
        description: editingTask.description || undefined,
        status: editingTask.status,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate || undefined,
      });

      // Save custom field values
      for (const field of customFields) {
        const value = customFieldValues[field.id];
        if (value) {
          await window.electronAPI.customField.setTaskValue(editingTask.id, field.id, value);
        } else {
          // Delete value if empty
          await window.electronAPI.customField.deleteTaskValue(editingTask.id, field.id);
        }
      }

      setEditDialogOpen(false);
      setEditingTask(null);
      setCustomFieldValues({});
      loadData();
    } catch (err) {
      console.error(ERROR_MESSAGES.UPDATE_TASK_FAILED, err);
      setError(ERROR_MESSAGES.UPDATE_TASK_FAILED);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await window.electronAPI.task.delete(taskId);
      loadData();
    } catch (err) {
      console.error(ERROR_MESSAGES.DELETE_TASK_FAILED, err);
      setError(ERROR_MESSAGES.DELETE_TASK_FAILED);
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask({ ...task });
    setEditDialogOpen(true);
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

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter(task => 
      task.status === status &&
      (searchQuery === '' || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );
  };

  const getFilteredAndSortedTasks = () => {
    let filtered = tasks.filter(task => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Label filter
      const matchesLabel = selectedLabel === 'all' || 
        (taskLabels[task.id] && taskLabels[task.id].some(l => l.id === selectedLabel));
      
      return matchesSearch && matchesLabel;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const handleSort = (column: 'title' | 'status' | 'priority' | 'dueDate') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const columns = [
    { id: TaskStatus.Todo, title: 'To Do', color: '#6b7280' },
    { id: TaskStatus.InProgress, title: 'In Progress', color: '#3b82f6' },
    { id: TaskStatus.Review, title: 'Review', color: '#f59e0b' },
    { id: TaskStatus.Done, title: 'Done', color: '#10b981' },
    { id: TaskStatus.Blocked, title: 'Blocked', color: '#ef4444' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Tasks
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          disabled={projects.length === 0}
        >
          New Task
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Project</InputLabel>
          <Select
            value={selectedProject}
            label="Project"
            onChange={(e) => setSelectedProject(e.target.value as number | 'all')}
          >
            <MenuItem value="all">All Projects</MenuItem>
            {projects.map(project => (
              <MenuItem key={project.id} value={project.id}>
                {project.icon} {project.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Label</InputLabel>
          <Select
            value={selectedLabel}
            label="Label"
            onChange={(e) => setSelectedLabel(e.target.value as number | 'all')}
          >
            <MenuItem value="all">All Labels</MenuItem>
            {allLabels.map(label => (
              <MenuItem key={label.id} value={label.id}>
                <Chip
                  label={label.name}
                  size="small"
                  sx={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                    fontWeight: 600,
                  }}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
        >
          <ToggleButton value="board">
            <BoardViewIcon sx={{ mr: 1 }} /> Board
          </ToggleButton>
          <ToggleButton value="list">
            <ListViewIcon sx={{ mr: 1 }} /> List
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : viewMode === 'board' ? (
        /* Kanban Board View */
        <DragDropContext onDragEnd={handleDragEnd}>
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
            {columns.map(column => (
              <Paper
                key={column.id}
                sx={{
                  minWidth: 300,
                  maxWidth: 300,
                  backgroundColor: 'background.paper',
                  borderTop: 3,
                  borderColor: column.color,
                }}
              >
                {/* Column Header */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {column.title}
                    </Typography>
                    <Chip
                      label={getTasksByStatus(column.id).length}
                      size="small"
                      sx={{ backgroundColor: `${column.color}20`, color: column.color }}
                    />
                  </Box>
                </Box>

                {/* Droppable Column */}
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      sx={{
                        p: 1,
                        minHeight: 200,
                        maxHeight: 'calc(100vh - 350px)',
                        overflowY: 'auto',
                        backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                      }}
                    >
                      {getTasksByStatus(column.id).map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={`task-${task.id}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => navigate(`/tasks/${task.id}`)}
                              sx={{
                                mb: 1,
                                cursor: 'pointer',
                                opacity: snapshot.isDragging ? 0.8 : 1,
                                transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                                '&:hover': { bgcolor: 'action.hover' },
                                '&:active': { cursor: 'grabbing' },
                              }}
                            >
                              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
                                    {task.title}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <IconButton 
                                      size="small" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog(task);
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton 
                                      size="small" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTask(task.id);
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                </Box>
                                {task.description && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 1, fontSize: '0.8rem' }}
                                  >
                                    {task.description.length > 100
                                      ? `${task.description.substring(0, 100)}...`
                                      : task.description}
                                  </Typography>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <FlagIcon
                                    sx={{
                                      fontSize: 16,
                                      color: getPriorityColor(task.priority),
                                    }}
                                  />
                                  <Chip
                                    label={task.priority}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.7rem',
                                      backgroundColor: `${getPriorityColor(task.priority)}20`,
                                      color: getPriorityColor(task.priority),
                                    }}
                                  />
                                  {taskLabels[task.id]?.slice(0, 2).map(label => (
                                    <Chip
                                      key={label.id}
                                      label={label.name}
                                      size="small"
                                      sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        backgroundColor: `${label.color}20`,
                                        color: label.color,
                                      }}
                                    />
                                  ))}
                                  {(taskLabels[task.id]?.length || 0) > 2 && (
                                    <Chip
                                      label={`+${(taskLabels[task.id]?.length || 0) - 2}`}
                                      size="small"
                                      sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                      }}
                                    />
                                  )}
                                  {task.dueDate && (
                                    <Typography variant="caption" color="text.secondary">
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </Typography>
                                  )}
                                </Box>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Paper>
            ))}
          </Box>
        </DragDropContext>
      ) : (
        /* List View */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'title'}
                    direction={sortBy === 'title' ? sortOrder : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'status'}
                    direction={sortBy === 'status' ? sortOrder : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'priority'}
                    direction={sortBy === 'priority' ? sortOrder : 'asc'}
                    onClick={() => handleSort('priority')}
                  >
                    Priority
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'dueDate'}
                    direction={sortBy === 'dueDate' ? sortOrder : 'asc'}
                    onClick={() => handleSort('dueDate')}
                  >
                    Due Date
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredAndSortedTasks().map((task) => (
                <TableRow 
                  key={task.id} 
                  hover 
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {task.title}
                      </Typography>
                      {task.description && (
                        <Typography variant="caption" color="text.secondary">
                          {task.description.length > 80
                            ? `${task.description.substring(0, 80)}...`
                            : task.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={task.status.replace('_', ' ')}
                      size="small"
                      sx={{
                        backgroundColor: `${columns.find(c => c.id === task.status)?.color}20`,
                        color: columns.find(c => c.id === task.status)?.color,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FlagIcon
                        sx={{
                          fontSize: 16,
                          color: getPriorityColor(task.priority),
                        }}
                      />
                      <Chip
                        label={task.priority}
                        size="small"
                        sx={{
                          backgroundColor: `${getPriorityColor(task.priority)}20`,
                          color: getPriorityColor(task.priority),
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(task);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Empty State */}
      {!loading && tasks.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No tasks yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {projects.length === 0
              ? 'Create a project first to start adding tasks'
              : 'Create your first task to get started'}
          </Typography>
          {projects.length > 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
              Create Task
            </Button>
          )}
        </Box>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Task</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Project</InputLabel>
              <Select
                value={newTask.projectId || ''}
                label="Project"
                onChange={(e) => setNewTask({ ...newTask, projectId: Number(e.target.value) })}
              >
                {projects.map(project => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.icon} {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              required
              label="Title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newTask.priority}
                label="Priority"
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
              >
                <MenuItem value={TaskPriority.Low}>Low</MenuItem>
                <MenuItem value={TaskPriority.Medium}>Medium</MenuItem>
                <MenuItem value={TaskPriority.High}>High</MenuItem>
                <MenuItem value={TaskPriority.Critical}>Critical</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="date"
              label="Due Date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            {/* Custom Fields */}
            {customFields.map(field => (
              <CustomFieldInput
                key={field.id}
                field={field}
                value={customFieldValues[field.id] || ''}
                onChange={(value) => setCustomFieldValues({
                  ...customFieldValues,
                  [field.id]: value
                })}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTask} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent>
          {editingTask && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                fullWidth
                required
                label="Title"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={editingTask.description || ''}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editingTask.status}
                  label="Status"
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                >
                  <MenuItem value={TaskStatus.Todo}>To Do</MenuItem>
                  <MenuItem value={TaskStatus.InProgress}>In Progress</MenuItem>
                  <MenuItem value={TaskStatus.Review}>Review</MenuItem>
                  <MenuItem value={TaskStatus.Done}>Done</MenuItem>
                  <MenuItem value={TaskStatus.Blocked}>Blocked</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={editingTask.priority}
                  label="Priority"
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                >
                  <MenuItem value={TaskPriority.Low}>Low</MenuItem>
                  <MenuItem value={TaskPriority.Medium}>Medium</MenuItem>
                  <MenuItem value={TaskPriority.High}>High</MenuItem>
                  <MenuItem value={TaskPriority.Critical}>Critical</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                type="date"
                label="Due Date"
                value={editingTask.dueDate || ''}
                onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              {/* Custom Fields */}
              {customFields.map(field => (
                <CustomFieldInput
                  key={field.id}
                  field={field}
                  value={customFieldValues[field.id] || ''}
                  onChange={(value) => setCustomFieldValues({
                    ...customFieldValues,
                    [field.id]: value
                  })}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditTask} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
