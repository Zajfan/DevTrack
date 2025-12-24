import { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  LinearProgress,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Fab,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { ProjectStatus } from '../types';
import { useNavigate } from 'react-router-dom';

export default function Projects() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock projects data
  const projects = [
    {
      id: 1,
      name: 'DevTrack C++23 Migration',
      description: 'Migrating DevTrack from C# MAUI to modern C++23 backend with Electron frontend',
      status: ProjectStatus.Active,
      progress: 65,
      tasks: 24,
      completedTasks: 16,
      dueDate: '2025-12-01',
      conceptWhat: 'A high-performance project management system',
      conceptHow: 'Using C++23 and Electron architecture',
      conceptWhy: 'Better performance and cross-platform support',
    },
    {
      id: 2,
      name: 'AI-Powered Code Assistant',
      description: 'Building an intelligent code completion and refactoring tool',
      status: ProjectStatus.Active,
      progress: 42,
      tasks: 18,
      completedTasks: 8,
      dueDate: '2025-11-25',
      conceptWhat: 'AI coding assistant with context awareness',
      conceptHow: 'Using LLMs and semantic code analysis',
      conceptWhy: 'Accelerate development workflow',
    },
    {
      id: 3,
      name: 'Mobile App Redesign',
      description: 'Complete UI/UX overhaul of mobile application',
      status: ProjectStatus.OnHold,
      progress: 30,
      tasks: 12,
      completedTasks: 4,
      dueDate: '2026-01-15',
      conceptWhat: 'Modern mobile app interface',
      conceptHow: 'Material Design 3 principles',
      conceptWhy: 'Improve user engagement',
    },
    {
      id: 4,
      name: 'Documentation Portal',
      description: 'Centralized documentation system with search and versioning',
      status: ProjectStatus.Active,
      progress: 80,
      tasks: 10,
      completedTasks: 8,
      dueDate: '2025-11-20',
      conceptWhat: 'Interactive documentation platform',
      conceptHow: 'Static site generation with full-text search',
      conceptWhy: 'Better developer experience',
    },
    {
      id: 5,
      name: 'Analytics Dashboard',
      description: 'Real-time analytics and reporting system',
      status: ProjectStatus.Completed,
      progress: 100,
      tasks: 15,
      completedTasks: 15,
      dueDate: '2025-10-30',
      conceptWhat: 'Data visualization platform',
      conceptHow: 'React with D3.js and WebSocket updates',
      conceptWhy: 'Data-driven decision making',
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

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Projects
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />}>
          New Project
        </Button>
      </Box>

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search projects..."
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
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="grid">
            <GridViewIcon />
          </ToggleButton>
          <ToggleButton value="list">
            <ListViewIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Projects Grid */}
      <Grid container spacing={3}>
        {filteredProjects.map((project) => (
          <Grid item xs={12} md={viewMode === 'grid' ? 6 : 12} lg={viewMode === 'grid' ? 4 : 12} key={project.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                    {project.name}
                  </Typography>
                  <Chip
                    label={project.status}
                    color={getStatusColor(project.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {project.description}
                </Typography>
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
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${project.completedTasks}/${project.tasks} tasks`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Due: ${new Date(project.dueDate).toLocaleDateString()}`}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}>
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredProjects.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No projects found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search query or create a new project
          </Typography>
        </Box>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
