import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileCopy as DuplicateIcon,
  Folder as FolderIcon,
  MoreVert as MoreIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import {
  ProjectTemplate,
  ProjectTemplateWithTasks,
  CreateProjectTemplateData,
  TemplateCategory,
} from '../types';
import { ERROR_MESSAGES } from '../constants/errorMessages';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<ProjectTemplate[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateWithTasks | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTemplate, setMenuTemplate] = useState<ProjectTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateProjectTemplateData>({
    name: '',
    description: '',
    category: TemplateCategory.Other,
    isPublic: false,
  });

  useEffect(() => {
    let isMounted = true;

    const loadTemplates = async () => {
      try {
        const [myTemplates, pubTemplates] = await Promise.all([
          window.electronAPI.projectTemplate.findByCreator(1), // Current user
          window.electronAPI.projectTemplate.findPublic(),
        ]);
        if (isMounted) {
          setTemplates(myTemplates);
          setPublicTemplates(pubTemplates);
        }
      } catch (error) {
        if (isMounted) {
          console.error(ERROR_MESSAGES.LOAD_TEMPLATES_FAILED, error);
        }
      }
    };

    loadTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadTemplates = async () => {
    try {
      const [myTemplates, pubTemplates] = await Promise.all([
        window.electronAPI.projectTemplate.findByCreator(1), // Current user
        window.electronAPI.projectTemplate.findPublic(),
      ]);
      setTemplates(myTemplates);
      setPublicTemplates(pubTemplates);
    } catch (error) {
      console.error(ERROR_MESSAGES.LOAD_TEMPLATES_FAILED, error);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateTemplate = async () => {
    try {
      await window.electronAPI.projectTemplate.create({
        ...formData,
        createdBy: 1, // Current user
      });
      setCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        category: TemplateCategory.Other,
        isPublic: false,
      });
      loadTemplates();
    } catch (error) {
      console.error(ERROR_MESSAGES.CREATE_TEMPLATE_FAILED, error);
    }
  };

  const handlePreviewTemplate = async (template: ProjectTemplate) => {
    try {
      const fullTemplate = await window.electronAPI.projectTemplate.findByIdWithTasks(template.id);
      setSelectedTemplate(fullTemplate || null);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error(ERROR_MESSAGES.LOAD_TEMPLATE_DETAILS_FAILED, error);
    }
  };

  const handleUseTemplate = async (template: ProjectTemplate) => {
    try {
      const project = await window.electronAPI.template.createProjectFromTemplate(template.id);
      console.log('Created project from template:', project);
      // Navigate to the new project (implement navigation later)
      alert(`Project "${project.name}" created successfully!`);
    } catch (error) {
      console.error(ERROR_MESSAGES.CREATE_PROJECT_FROM_TEMPLATE_FAILED, error);
    }
  };

  const handleDuplicateTemplate = async (template: ProjectTemplate) => {
    try {
      await window.electronAPI.projectTemplate.duplicate(template.id, `${template.name} (Copy)`);
      loadTemplates();
      handleMenuClose();
    } catch (error) {
      console.error(ERROR_MESSAGES.DUPLICATE_TEMPLATE_FAILED, error);
    }
  };

  const handleDeleteTemplate = async (template: ProjectTemplate) => {
    if (confirm(`Delete template "${template.name}"?`)) {
      try {
        await window.electronAPI.projectTemplate.delete(template.id);
        loadTemplates();
        handleMenuClose();
      } catch (error) {
        console.error(ERROR_MESSAGES.DELETE_TEMPLATE_FAILED, error);
      }
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: ProjectTemplate) => {
    setAnchorEl(event.currentTarget);
    setMenuTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTemplate(null);
  };

  const renderTemplateCard = (template: ProjectTemplate, showActions = true) => (
    <Grid item xs={12} sm={6} md={4} key={template.id}>
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FolderIcon sx={{ mr: 1, color: template.color || 'primary.main' }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {template.name}
            </Typography>
            {showActions && (
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, template)}
              >
                <MoreIcon />
              </IconButton>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
            {template.description || 'No description'}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {template.category && (
              <Chip label={template.category} size="small" color="primary" variant="outlined" />
            )}
            {template.isPublic && (
              <Chip label="Public" size="small" color="success" variant="outlined" />
            )}
          </Box>
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<PreviewIcon />}
            onClick={() => handlePreviewTemplate(template)}
          >
            Preview
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => handleUseTemplate(template)}
          >
            Use Template
          </Button>
        </CardActions>
      </Card>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Project Templates</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Template
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tab label="My Templates" />
        <Tab label="Public Templates" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        {templates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No templates yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create your first template to reuse project structures
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Template
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {templates.map(template => renderTemplateCard(template, true))}
          </Grid>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {publicTemplates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              No public templates available
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {publicTemplates.map(template => renderTemplateCard(template, false))}
          </Grid>
        )}
      </TabPanel>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Template</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Template Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value as TemplateCategory })}
              >
                {Object.values(TemplateCategory).map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Visibility</InputLabel>
              <Select
                value={formData.isPublic ? 'public' : 'private'}
                label="Visibility"
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.value === 'public' })}
              >
                <MenuItem value="private">Private (Only me)</MenuItem>
                <MenuItem value="public">Public (All users)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateTemplate}
            variant="contained"
            disabled={!formData.name.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedTemplate?.name}
          <Typography variant="body2" color="text.secondary">
            {selectedTemplate?.description}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tasks ({selectedTemplate.tasks.length})
              </Typography>
              {selectedTemplate.tasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No tasks in this template
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedTemplate.tasks.map((task, index) => (
                    <Card key={task.id} variant="outlined">
                      <CardContent sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 30 }}>
                            {index + 1}.
                          </Typography>
                          <Typography variant="body1" sx={{ flexGrow: 1 }}>
                            {task.title}
                          </Typography>
                          <Chip label={task.priority} size="small" color="primary" variant="outlined" />
                        </Box>
                        {task.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ ml: 5, mt: 0.5 }}>
                            {task.description}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button
            onClick={() => {
              if (selectedTemplate) {
                handleUseTemplate(selectedTemplate);
                setPreviewDialogOpen(false);
              }
            }}
            variant="contained"
          >
            Use This Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => menuTemplate && handlePreviewTemplate(menuTemplate)}>
          <ListItemIcon>
            <PreviewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Preview</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuTemplate && handleDuplicateTemplate(menuTemplate)}>
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuTemplate && handleDeleteTemplate(menuTemplate)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
