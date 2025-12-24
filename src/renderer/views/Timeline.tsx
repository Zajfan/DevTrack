import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
} from '@mui/material';
import { format } from 'date-fns';
import GanttChart from '../components/GanttChart';
import { Project, Task, TaskDependency } from '../types';
import { ERROR_MESSAGES } from '../constants/errorMessages';

const Timeline: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Task update dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newStartDate, setNewStartDate] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState<string>('');

  // Load projects
  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        if (isMounted) {
          setLoading(true);
        }
        const projectList = await window.electronAPI.project.findAll();
        if (!isMounted) return;

        setProjects(projectList);

        // Auto-select first active project
        const activeProject = projectList.find(p => p.status === 'active');
        if (activeProject) {
          setSelectedProjectId(activeProject.id);
        } else if (projectList.length > 0) {
          setSelectedProjectId(projectList[0].id);
        }

        setError(null);
      } catch (err) {
        if (isMounted) {
          console.error(ERROR_MESSAGES.LOAD_PROJECTS_FAILED, err);
          setError(ERROR_MESSAGES.LOAD_PROJECTS_FAILED);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load tasks when project is selected
  useEffect(() => {
    let isMounted = true;

    const loadTasksAndDependencies = async (projectId: number) => {
      try {
        if (isMounted) {
          setLoading(true);
        }
        const [taskList, depList] = await Promise.all([
          window.electronAPI.task.findByProjectId(projectId),
          window.electronAPI.dependency.findByProjectId(projectId),
        ]);
        if (!isMounted) return;

        setTasks(taskList);
        setDependencies(depList);
        setError(null);
      } catch (err) {
        if (isMounted) {
          console.error(ERROR_MESSAGES.LOAD_TASKS_AND_DEPENDENCIES_FAILED, err);
          setError(ERROR_MESSAGES.LOAD_TASKS_AND_DEPENDENCIES_FAILED);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (selectedProjectId) {
      loadTasksAndDependencies(selectedProjectId);
    } else {
      setTasks([]);
      setDependencies([]);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectList = await window.electronAPI.project.findAll();
      setProjects(projectList);

      // Auto-select first active project
      const activeProject = projectList.find(p => p.status === 'active');
      if (activeProject) {
        setSelectedProjectId(activeProject.id);
      } else if (projectList.length > 0) {
        setSelectedProjectId(projectList[0].id);
      }

      setError(null);
    } catch (err) {
      console.error(ERROR_MESSAGES.LOAD_PROJECTS_FAILED, err);
      setError(ERROR_MESSAGES.LOAD_PROJECTS_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const loadTasksAndDependencies = async (projectId: number) => {
    try {
      setLoading(true);
      const [taskList, depList] = await Promise.all([
        window.electronAPI.task.findByProjectId(projectId),
        window.electronAPI.dependency.findByProjectId(projectId),
      ]);

      setTasks(taskList);
      setDependencies(depList);
      setError(null);
    } catch (err) {
      console.error(ERROR_MESSAGES.LOAD_TASKS_AND_DEPENDENCIES_FAILED, err);
      setError(ERROR_MESSAGES.LOAD_TASKS_AND_DEPENDENCIES_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setNewStartDate(task.startDate ? format(new Date(task.startDate), 'yyyy-MM-dd') : '');
    setNewDueDate(task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '');
    setUpdateDialogOpen(true);
  };

  const handleTaskUpdate = async (taskId: number, startDate: Date, dueDate: Date) => {
    try {
      await window.electronAPI.task.update(taskId, {
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
      });
      
      // Reload tasks
      if (selectedProjectId) {
        await loadTasksAndDependencies(selectedProjectId);
      }
    } catch (err) {
      console.error(ERROR_MESSAGES.UPDATE_TASK_FAILED, err);
      setError(ERROR_MESSAGES.UPDATE_TASK_DATES_FAILED);
    }
  };

  const handleSaveTaskDates = async () => {
    if (!selectedTask || !newStartDate || !newDueDate) return;
    
    try {
      const startDate = new Date(newStartDate);
      const dueDate = new Date(newDueDate);
      
      if (dueDate < startDate) {
        setError('Due date must be after start date');
        return;
      }
      
      await handleTaskUpdate(selectedTask.id, startDate, dueDate);
      setUpdateDialogOpen(false);
      setSelectedTask(null);
    } catch (err) {
      console.error(ERROR_MESSAGES.SAVE_TASK_DATES_FAILED, err);
      setError(ERROR_MESSAGES.SAVE_TASK_DATES_FAILED);
    }
  };

  const handleCloseDialog = () => {
    setUpdateDialogOpen(false);
    setSelectedTask(null);
    setError(null);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const tasksWithDates = tasks.filter(t => t.startDate && t.dueDate);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Timeline View
      </Typography>

      {/* Project Selector */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl fullWidth>
          <InputLabel id="project-select-label">Select Project</InputLabel>
          <Select
            labelId="project-select-label"
            value={selectedProjectId || ''}
            label="Select Project"
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
          >
            {projects.map(project => (
              <MenuItem key={project.id} value={project.id}>
                {project.name} ({project.status})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedProject && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedProject.description}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {tasksWithDates.length} of {tasks.length} tasks have dates
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Gantt Chart */}
      {!loading && selectedProjectId && (
        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
          {tasksWithDates.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                No Tasks with Dates
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add start and due dates to tasks to see them on the timeline.
              </Typography>
            </Paper>
          ) : (
            <GanttChart
              tasks={tasks}
              dependencies={dependencies}
              onTaskClick={handleTaskClick}
              onTaskUpdate={handleTaskUpdate}
              projectId={selectedProjectId}
            />
          )}
        </Box>
      )}

      {/* No Project Selected */}
      {!loading && !selectedProjectId && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            No Project Selected
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select a project to view its timeline.
          </Typography>
        </Paper>
      )}

      {/* Task Update Dialog */}
      <Dialog open={updateDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Update Task Dates</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body1" fontWeight="bold">
                {selectedTask.title}
              </Typography>
              
              <TextField
                label="Start Date"
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              
              <TextField
                label="Due Date"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveTaskDates} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Timeline;
