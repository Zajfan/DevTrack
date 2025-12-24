import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Divider,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
  Tabs,
  Tab,
  ButtonGroup,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as TodoIcon,
  AccessTime as InProgressIcon,
  Settings as SettingsIcon,
  ViewList as ListIcon,
  ViewModule as BoardIcon,
  CalendarToday as CalendarIcon,
  TableChart as TableIcon,
  ViewComfy as GalleryIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { ProjectStatus, TaskStatus, TaskPriority, Project, Task } from '../types';
import CustomFieldManager from '../components/CustomFieldManager';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadProjectData = async () => {
      if (!id) return;

      if (isMounted) {
        setLoading(true);
      }
      try {
        const projectData = await window.electronAPI.project.findById(parseInt(id));
        const taskData = await window.electronAPI.task.findByProjectId(parseInt(id));
        if (isMounted) {
          setProject(projectData || null);
          setTasks(taskData);
        }
      } catch (error) {
        if (isMounted) {
          console.error(ERROR_MESSAGES.LOAD_PROJECT_FAILED, error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProjectData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const loadProjectData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const projectData = await window.electronAPI.project.findById(parseInt(id));
      const taskData = await window.electronAPI.task.findByProjectId(parseInt(id));
      setProject(projectData || null);
      setTasks(taskData);
    } catch (error) {
      console.error(ERROR_MESSAGES.LOAD_PROJECT_FAILED, error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!project) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Project not found</Typography>
      </Box>
    );
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Done:
        return <CompletedIcon color="success" />;
      case TaskStatus.InProgress:
        return <InProgressIcon color="primary" />;
      default:
        return <TodoIcon color="disabled" />;
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.Critical:
        return 'error';
      case TaskPriority.High:
        return 'warning';
      case TaskPriority.Medium:
        return 'info';
      case TaskPriority.Low:
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.Active:
        return 'success';
      case ProjectStatus.OnHold:
        return 'warning';
      case ProjectStatus.Completed:
        return 'info';
      default:
        return 'default';
    }
  };

  const completedTasks = tasks.filter((t) => t.status === TaskStatus.Done).length;
  const inProgressTasks = tasks.filter((t) => t.status === TaskStatus.InProgress).length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {project.name}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {project.description || 'No description provided'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={project.status} color={getStatusColor(project.status)} />
              <Chip label={`${completedTasks}/${tasks.length} tasks completed`} variant="outlined" />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setCustomFieldsOpen(true)}>
              Custom Fields
            </Button>
            <Button variant="outlined" startIcon={<EditIcon />}>
              Edit
            </Button>
            <IconButton color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Overall Progress
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {progress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 10, borderRadius: 5, mt: 1 }}
        />
      </Paper>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Tasks" />
        <Tab label="5W1H Concepts" />
      </Tabs>

      {/* Overview Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Project Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Created Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1">{project.status}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Progress
                  </Typography>
                  <Typography variant="body1">{progress}%</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Quick Stats
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Tasks
                  </Typography>
                  <Typography variant="h4">{tasks.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {completedTasks}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                  <Typography variant="h4" color="primary.main">
                    {tasks.filter((t) => t.status === TaskStatus.InProgress).length}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tasks Tab */}
      {activeTab === 1 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Tasks
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <ButtonGroup size="small" variant="outlined">
                <Button startIcon={<ListIcon />}>List</Button>
                <Button startIcon={<BoardIcon />}>Board</Button>
                <Button startIcon={<CalendarIcon />} onClick={() => navigate(`/projects/${id}/calendar`)}>
                  Calendar
                </Button>
                <Button startIcon={<TableIcon />} onClick={() => navigate(`/projects/${id}/table`)}>
                  Table
                </Button>
                <Button startIcon={<GalleryIcon />} onClick={() => navigate(`/projects/${id}/gallery`)}>
                  Gallery
                </Button>
              </ButtonGroup>
              <Button variant="contained" startIcon={<AddIcon />}>
                Add Task
              </Button>
            </Box>
          </Box>
          <List>
            {tasks.map((task, index) => (
              <Box key={task.id}>
                <ListItem
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon>{getStatusIcon(task.status)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {task.title}
                        </Typography>
                        <Chip label={task.priority} color={getPriorityColor(task.priority)} size="small" />
                        <Chip label={task.status} size="small" variant="outlined" />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {task.description}
                      </Typography>
                    }
                  />
                  <IconButton size="small">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </ListItem>
              </Box>
            ))}
          </List>
        </Paper>
      )}

      {/* 5W1H Concepts Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  📝 What
                </Typography>
                <Typography variant="body2">{project.conceptWhat}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="secondary" gutterBottom>
                  🔧 How
                </Typography>
                <Typography variant="body2">{project.conceptHow}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="success.main" gutterBottom>
                  📍 Where
                </Typography>
                <Typography variant="body2">{project.conceptWhere}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="warning.main" gutterBottom>
                  🛠️ With What
                </Typography>
                <Typography variant="body2">{project.conceptWithWhat}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="info.main" gutterBottom>
                  ⏰ When
                </Typography>
                <Typography variant="body2">{project.conceptWhen}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" color="error.main" gutterBottom>
                  💡 Why
                </Typography>
                <Typography variant="body2">{project.conceptWhy}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Custom Fields Manager Dialog */}
      <CustomFieldManager
        open={customFieldsOpen}
        onClose={() => setCustomFieldsOpen(false)}
        projectId={project.id}
      />
    </Box>
  );
}
