import { useState, useEffect } from 'react';
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
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  MoreVert as MoreIcon,
  ContentCopy as TemplateIcon,
} from '@mui/icons-material';
import { Project, ProjectStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import SaveAsTemplateDialog from '../components/SaveAsTemplateDialog';
import TemplatePickerDialog from '../components/TemplatePickerDialog';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export default function Projects() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectMenuAnchor, setNewProjectMenuAnchor] = useState<null | HTMLElement>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [selectedProjectForTemplate, setSelectedProjectForTemplate] = useState<Project | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // Load projects from database
  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await window.electronAPI.project.findAll();
        if (isMounted) {
          setProjects(data);
          console.log('Loaded projects:', data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : ERROR_MESSAGES.LOAD_PROJECTS_FAILED);
          console.error(ERROR_MESSAGES.LOAD_PROJECTS_FAILED, err);
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

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.project.findAll();
      setProjects(data);
      console.log('Loaded projects:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.LOAD_PROJECTS_FAILED);
      console.error(ERROR_MESSAGES.LOAD_PROJECTS_FAILED, err);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects by search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

  const handleOpenSaveAsTemplate = (project: Project, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedProjectForTemplate(project);
    setSaveAsTemplateOpen(true);
  };

  const handleTemplateCreated = (project: Project) => {
    navigate(`/projects/${project.id}`);
    loadProjects();
  };

  const handleCreateBlankProject = async () => {
    if (!newProjectName.trim()) {
      setError(ERROR_MESSAGES.PROJECT_NAME_REQUIRED);
      return;
    }

    try {
      const project = await window.electronAPI.project.create({
        name: newProjectName,
        description: newProjectDescription || undefined,
        status: ProjectStatus.Active,
      });

      setCreateProjectOpen(false);
      setNewProjectName('');
      setNewProjectDescription('');
      navigate(`/projects/${project.id}`);
      loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : ERROR_MESSAGES.CREATE_PROJECT_FAILED);
      console.error(ERROR_MESSAGES.CREATE_PROJECT_FAILED, err);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Projects
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<TemplateIcon />}
            onClick={() => setTemplatePickerOpen(true)}
          >
            From Template
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={(e) => setNewProjectMenuAnchor(e.currentTarget)}
          >
            New Project
          </Button>
        </Box>
      </Box>

      {/* New Project Menu */}
      <Menu
        anchorEl={newProjectMenuAnchor}
        open={Boolean(newProjectMenuAnchor)}
        onClose={() => setNewProjectMenuAnchor(null)}
      >
        <MenuItem onClick={() => {
          setNewProjectMenuAnchor(null);
          setCreateProjectOpen(true);
        }}>
          <ListItemText>Blank Project</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setNewProjectMenuAnchor(null);
          setTemplatePickerOpen(true);
        }}>
          <ListItemIcon>
            <TemplateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>From Template</ListItemText>
        </MenuItem>
      </Menu>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    {project.icon && <span style={{ fontSize: '1.5rem' }}>{project.icon}</span>}
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {project.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={project.status}
                    color={getStatusColor(project.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {project.description || 'No description'}
                </Typography>
                
                {/* 5W1H Concepts Summary */}
                {project.conceptWhat && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                      What:
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                      {project.conceptWhat}
                    </Typography>
                  </Box>
                )}
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button size="small" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}>
                  View Details
                </Button>
                <Button
                  size="small"
                  startIcon={<TemplateIcon />}
                  onClick={(e) => handleOpenSaveAsTemplate(project, e)}
                >
                  Save as Template
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredProjects.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No projects found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery ? 'Try adjusting your search query' : 'Create your first project to get started'}
          </Typography>
        </Box>
      )}
        </>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
        onClick={(e) => setNewProjectMenuAnchor(e.currentTarget)}
      >
        <AddIcon />
      </Fab>

      {/* Template Picker Dialog */}
      <TemplatePickerDialog
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onSelectTemplate={handleTemplateCreated}
      />

      {/* Create Blank Project Dialog */}
      <Dialog 
        open={createProjectOpen} 
        onClose={() => {
          setCreateProjectOpen(false);
          setNewProjectName('');
          setNewProjectDescription('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              autoFocus
              label="Project Name"
              fullWidth
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name"
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              placeholder="Enter project description (optional)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setCreateProjectOpen(false);
              setNewProjectName('');
              setNewProjectDescription('');
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateBlankProject}
            variant="contained"
            disabled={!newProjectName.trim()}
          >
            Create Project
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save as Template Dialog */}
      {selectedProjectForTemplate && (
        <SaveAsTemplateDialog
          open={saveAsTemplateOpen}
          onClose={() => {
            setSaveAsTemplateOpen(false);
            setSelectedProjectForTemplate(null);
          }}
          projectId={selectedProjectForTemplate.id}
          projectName={selectedProjectForTemplate.name}
          onSuccess={() => {
            alert('Template created successfully!');
            navigate('/templates');
          }}
        />
      )}
    </Box>
  );
}
