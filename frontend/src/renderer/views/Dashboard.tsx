import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Folder as ProjectIcon,
  Assignment as TaskIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as TimeIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { ProjectStatus, TaskStatus } from '../types';

export default function Dashboard() {
  // Mock data for preview
  const stats = [
    { title: 'Active Projects', value: 5, icon: <ProjectIcon />, color: '#2563eb', trend: '+2 this month' },
    { title: 'Total Tasks', value: 42, icon: <TaskIcon />, color: '#8b5cf6', trend: '18 completed' },
    { title: 'In Progress', value: 12, icon: <TrendingUpIcon />, color: '#10b981', trend: '5 this week' },
    { title: 'Overdue', value: 3, icon: <TimeIcon />, color: '#ef4444', trend: 'Need attention' },
  ];

  const recentProjects = [
    {
      id: 1,
      name: 'DevTrack C++23 Migration',
      status: ProjectStatus.Active,
      progress: 65,
      tasks: 24,
      completedTasks: 16,
      dueDate: '2025-12-01',
    },
    {
      id: 2,
      name: 'AI-Powered Code Assistant',
      status: ProjectStatus.Active,
      progress: 42,
      tasks: 18,
      completedTasks: 8,
      dueDate: '2025-11-25',
    },
    {
      id: 3,
      name: 'Mobile App Redesign',
      status: ProjectStatus.OnHold,
      progress: 30,
      tasks: 12,
      completedTasks: 4,
      dueDate: '2026-01-15',
    },
  ];

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.Active:
        return 'success';
      case ProjectStatus.OnHold:
        return 'warning';
      case ProjectStatus.Completed:
        return 'info';
      case ProjectStatus.Archived:
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Dashboard
      </Typography>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}05 100%)`,
                border: 1,
                borderColor: 'divider',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      backgroundColor: stat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stat.value}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {stat.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.trend}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Projects */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Recent Projects
      </Typography>
      <Grid container spacing={3}>
        {recentProjects.map((project) => (
          <Grid item xs={12} md={6} lg={4} key={project.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                    {project.name}
                  </Typography>
                  <IconButton size="small">
                    <MoreIcon />
                  </IconButton>
                </Box>
                <Chip
                  label={project.status}
                  color={getStatusColor(project.status)}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {project.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={project.progress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {project.completedTasks}/{project.tasks} tasks
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Due: {new Date(project.dueDate).toLocaleDateString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ mt: 4, p: 3, background: 'linear-gradient(135deg, #2563eb15 0%, #8b5cf615 100%)' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Quick Start
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Welcome to DevTrack! Get started by creating your first project or exploring existing ones.
        </Typography>
      </Paper>
    </Box>
  );
}
