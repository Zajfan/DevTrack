import { useParams } from 'react-router-dom';
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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as TodoIcon,
  AccessTime as InProgressIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { ProjectStatus, TaskStatus, TaskPriority } from '../types';

export default function ProjectDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState(0);

  // Mock project data
  const project = {
    id: parseInt(id || '1'),
    name: 'DevTrack C++23 Migration',
    description: 'Migrating DevTrack from C# MAUI to modern C++23 backend with Electron frontend',
    status: ProjectStatus.Active,
    progress: 65,
    createdDate: '2025-10-15',
    dueDate: '2025-12-01',
    conceptWhat: 'A high-performance, concept-driven project management system for AI-assisted solo development',
    conceptHow: 'Using C++23 backend with SQLite database and Electron desktop frontend with React + TypeScript',
    conceptWhere: 'Desktop application running locally, cross-platform (Windows, macOS, Linux)',
    conceptWithWhat: 'C++23, CMake, SQLite3, Crow HTTP server, Electron, React, TypeScript, Material-UI',
    conceptWhen: 'Q4 2025 - Complete migration and launch v1.0 by end of year',
    conceptWhy: 'Better performance, native cross-platform support, and modern development experience',
  };

  const tasks = [
    {
      id: 1,
      title: 'Setup C++23 project structure',
      description: 'Create CMake configuration and directory structure',
      status: TaskStatus.Completed,
      priority: TaskPriority.High,
      estimatedHours: 4,
      actualHours: 3.5,
    },
    {
      id: 2,
      title: 'Implement database layer',
      description: 'Create SQLite wrapper and repository pattern',
      status: TaskStatus.Completed,
      priority: TaskPriority.Critical,
      estimatedHours: 8,
      actualHours: 10,
    },
    {
      id: 3,
      title: 'Build API endpoints',
      description: 'Implement REST API using Crow framework',
      status: TaskStatus.InProgress,
      priority: TaskPriority.Critical,
      estimatedHours: 12,
      actualHours: 6,
    },
    {
      id: 4,
      title: 'Create Electron UI components',
      description: 'Build React components for all views',
      status: TaskStatus.InProgress,
      priority: TaskPriority.High,
      estimatedHours: 16,
      actualHours: 8,
    },
    {
      id: 5,
      title: 'Implement 5W1H concept system',
      description: 'Add concept tracking and relationships',
      status: TaskStatus.ToDo,
      priority: TaskPriority.Medium,
      estimatedHours: 10,
      actualHours: 0,
    },
    {
      id: 6,
      title: 'Add drag-and-drop Kanban view',
      description: 'Implement task board with drag-and-drop',
      status: TaskStatus.ToDo,
      priority: TaskPriority.Medium,
      estimatedHours: 8,
      actualHours: 0,
    },
  ];

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.Completed:
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

  const completedTasks = tasks.filter((t) => t.status === TaskStatus.Completed).length;

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
              {project.description}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={project.status} color={getStatusColor(project.status)} />
              <Chip label={`Due: ${new Date(project.dueDate).toLocaleDateString()}`} variant="outlined" />
              <Chip label={`${completedTasks}/${tasks.length} tasks completed`} variant="outlined" />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
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
            {project.progress}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={project.progress}
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
                    {new Date(project.createdDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(project.dueDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1">{project.status}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Progress
                  </Typography>
                  <Typography variant="body1">{project.progress}%</Typography>
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
            <Button variant="contained" startIcon={<AddIcon />}>
              Add Task
            </Button>
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
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {task.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Est: {task.estimatedHours}h | Actual: {task.actualHours}h
                        </Typography>
                      </Box>
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
    </Box>
  );
}
