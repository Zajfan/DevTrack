import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Assessment as DashboardIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as TodoIcon,
  Timer as InProgressIcon,
  Block as BlockedIcon,
  Flag as PriorityIcon,
  TrendingUp as TrendingUpIcon,
  TaskAlt as TaskAltIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { Project, Task, TaskStatus, TaskPriority } from '../types';
import { ERROR_MESSAGES } from '../constants/errorMessages';

interface TaskMetrics {
  total: number;
  completed: number;
  inProgress: number;
  todo: number;
  blocked: number;
  completionRate: number;
}

interface PriorityMetrics {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface ProjectMetrics {
  id: number;
  name: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  status: string;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        setLoading(true);
      }
      try {
        const projectsData = await window.electronAPI.project.findAll();
        if (!isMounted) return;
        setProjects(projectsData);

        // Load all tasks in parallel using Promise.all (performance optimization)
        const taskPromises = projectsData.map(project =>
          window.electronAPI.task.findByProjectId(project.id)
        );
        const taskArrays = await Promise.all(taskPromises);
        if (!isMounted) return;
        const allTasks = taskArrays.flat();

        setTasks(allTasks);
      } catch (err) {
        if (isMounted) {
          console.error(ERROR_MESSAGES.LOAD_DASHBOARD_DATA_FAILED, err);
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
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const projectsData = await window.electronAPI.project.findAll();
      setProjects(projectsData);

      // Load all tasks in parallel using Promise.all (performance optimization)
      const taskPromises = projectsData.map(project =>
        window.electronAPI.task.findByProjectId(project.id)
      );
      const taskArrays = await Promise.all(taskPromises);
      const allTasks = taskArrays.flat();

      setTasks(allTasks);
    } catch (err) {
      console.error(ERROR_MESSAGES.LOAD_DASHBOARD_DATA_FAILED, err);
    } finally {
      setLoading(false);
    }
  };

  // Memoize task metrics calculation to avoid unnecessary recalculations
  const taskMetrics = useMemo<TaskMetrics>(() => {
    const filteredTasks = selectedProject === 0
      ? tasks
      : tasks.filter(t => t.projectId === selectedProject);

    // Task status metrics
    const completed = filteredTasks.filter(t => t.status === TaskStatus.Done).length;
    const inProgress = filteredTasks.filter(t => t.status === TaskStatus.InProgress).length;
    const todo = filteredTasks.filter(t => t.status === TaskStatus.Todo).length;
    const blocked = filteredTasks.filter(t => t.status === TaskStatus.Blocked).length;
    const total = filteredTasks.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      inProgress,
      todo,
      blocked,
      completionRate,
    };
  }, [tasks, selectedProject]);

  // Memoize priority metrics calculation
  const priorityMetrics = useMemo<PriorityMetrics>(() => {
    const filteredTasks = selectedProject === 0
      ? tasks
      : tasks.filter(t => t.projectId === selectedProject);

    const critical = filteredTasks.filter(t => t.priority === TaskPriority.Critical).length;
    const high = filteredTasks.filter(t => t.priority === TaskPriority.High).length;
    const medium = filteredTasks.filter(t => t.priority === TaskPriority.Medium).length;
    const low = filteredTasks.filter(t => t.priority === TaskPriority.Low).length;

    return { critical, high, medium, low };
  }, [tasks, selectedProject]);

  // Memoize project metrics calculation
  const projectMetrics = useMemo<ProjectMetrics[]>(() => {
    return projects.map(project => {
      const projectTasks = tasks.filter(t => t.projectId === project.id);
      const completedTasks = projectTasks.filter(t => t.status === TaskStatus.Done).length;
      const totalTasks = projectTasks.length;
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        id: project.id,
        name: project.name,
        totalTasks,
        completedTasks,
        completionRate,
        status: project.status,
      };
    });
  }, [projects, tasks]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DashboardIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Analytics and insights for your projects
            </Typography>
          </Box>
        </Box>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Project Filter</InputLabel>
          <Select
            value={selectedProject}
            label="Project Filter"
            onChange={(e) => setSelectedProject(Number(e.target.value))}
          >
            <MenuItem value={0}>All Projects</MenuItem>
            {projects.map(project => (
              <MenuItem key={project.id} value={project.id}>
                {project.icon} {project.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #2563eb15 0%, #2563eb05 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <TaskAltIcon />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {taskMetrics.total}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Total Tasks
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {taskMetrics.completionRate.toFixed(1)}% completion rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #10b98115 0%, #10b98105 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <CompletedIcon />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                  {taskMetrics.completed}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Completed
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {taskMetrics.total > 0 ? ((taskMetrics.completed / taskMetrics.total) * 100).toFixed(0) : 0}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <InProgressIcon />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                  {taskMetrics.inProgress}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                In Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active work items
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ef444415 0%, #ef444405 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    backgroundColor: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <BlockedIcon />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                  {taskMetrics.blocked}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Blocked
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Need attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Task Status Distribution */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <BarChartIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Task Status Distribution
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Completed</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                    {taskMetrics.completed}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskMetrics.total > 0 ? (taskMetrics.completed / taskMetrics.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: '#10b98120', '& .MuiLinearProgress-bar': { backgroundColor: '#10b981' } }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">In Progress</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                    {taskMetrics.inProgress}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskMetrics.total > 0 ? (taskMetrics.inProgress / taskMetrics.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: '#f59e0b20', '& .MuiLinearProgress-bar': { backgroundColor: '#f59e0b' } }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Todo</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#6b7280' }}>
                    {taskMetrics.todo}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskMetrics.total > 0 ? (taskMetrics.todo / taskMetrics.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: '#6b728020', '& .MuiLinearProgress-bar': { backgroundColor: '#6b7280' } }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Blocked</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>
                    {taskMetrics.blocked}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskMetrics.total > 0 ? (taskMetrics.blocked / taskMetrics.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: '#ef444420', '& .MuiLinearProgress-bar': { backgroundColor: '#ef4444' } }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Priority Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <PriorityIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Priority Distribution
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Chip
                  icon={<PriorityIcon />}
                  label={`Critical: ${priorityMetrics.critical}`}
                  sx={{ backgroundColor: '#ef444420', color: '#ef4444', fontWeight: 600 }}
                />
                <Chip
                  icon={<PriorityIcon />}
                  label={`High: ${priorityMetrics.high}`}
                  sx={{ backgroundColor: '#f59e0b20', color: '#f59e0b', fontWeight: 600 }}
                />
                <Chip
                  icon={<PriorityIcon />}
                  label={`Medium: ${priorityMetrics.medium}`}
                  sx={{ backgroundColor: '#3b82f620', color: '#3b82f6', fontWeight: 600 }}
                />
                <Chip
                  icon={<PriorityIcon />}
                  label={`Low: ${priorityMetrics.low}`}
                  sx={{ backgroundColor: '#6b728020', color: '#6b7280', fontWeight: 600 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Critical</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#ef4444' }}>
                    {priorityMetrics.critical}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskMetrics.total > 0 ? (priorityMetrics.critical / taskMetrics.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: '#ef444420', '& .MuiLinearProgress-bar': { backgroundColor: '#ef4444' } }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">High</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b' }}>
                    {priorityMetrics.high}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskMetrics.total > 0 ? (priorityMetrics.high / taskMetrics.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: '#f59e0b20', '& .MuiLinearProgress-bar': { backgroundColor: '#f59e0b' } }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Medium</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#3b82f6' }}>
                    {priorityMetrics.medium}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskMetrics.total > 0 ? (priorityMetrics.medium / taskMetrics.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: '#3b82f620', '& .MuiLinearProgress-bar': { backgroundColor: '#3b82f6' } }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">Low</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#6b7280' }}>
                    {priorityMetrics.low}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={taskMetrics.total > 0 ? (priorityMetrics.low / taskMetrics.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, backgroundColor: '#6b728020', '& .MuiLinearProgress-bar': { backgroundColor: '#6b7280' } }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Project Progress */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <TrendingUpIcon color="primary" />
        Project Progress
      </Typography>
      <Grid container spacing={3}>
        {projectMetrics.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {project.name}
                </Typography>
                <Chip
                  label={project.status}
                  size="small"
                  color={
                    project.status === 'active' ? 'success' :
                    project.status === 'on_hold' ? 'warning' :
                    project.status === 'completed' ? 'info' :
                    'default'
                  }
                  sx={{ mb: 2 }}
                />
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {project.completionRate.toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={project.completionRate}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {project.completedTasks}/{project.totalTasks} tasks
                  </Typography>
                  {project.completionRate === 100 && (
                    <Chip label="Complete" size="small" color="success" />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
