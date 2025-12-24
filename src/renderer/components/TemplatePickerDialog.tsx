import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  TextField,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { Folder as FolderIcon } from '@mui/icons-material';
import { ProjectTemplate, Project } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface TemplatePickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (project: Project) => void;
}

export default function TemplatePickerDialog({
  open,
  onClose,
  onSelectTemplate,
}: TemplatePickerDialogProps) {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [publicTemplates, setPublicTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      const [myTemplates, pubTemplates] = await Promise.all([
        window.electronAPI.projectTemplate.findByCreator(1), // Current user
        window.electronAPI.projectTemplate.findPublic(),
      ]);
      setTemplates(myTemplates);
      setPublicTemplates(pubTemplates);
    } catch (error) {
      console.error('Failed to load templates:', error);
      setError('Failed to load templates');
    }
  };

  const handleSelectTemplate = (template: ProjectTemplate) => {
    setSelectedTemplate(template);
    setCustomName(template.name);
    setCustomDescription(template.description || '');
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;

    setCreating(true);
    setError(null);

    try {
      const project = await window.electronAPI.template.createProjectFromTemplate(
        selectedTemplate.id,
        customName || undefined,
        customDescription || undefined
      );

      onSelectTemplate(project);
      handleClose();
    } catch (err) {
      console.error('Failed to create project from template:', err);
      setError('Failed to create project from template');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setSelectedTemplate(null);
      setCustomName('');
      setCustomDescription('');
      setError(null);
      onClose();
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSelectedTemplate(null);
  };

  const renderTemplateCard = (template: ProjectTemplate) => (
    <Grid item xs={12} sm={6} key={template.id}>
      <Card
        sx={{
          cursor: 'pointer',
          border: 2,
          borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'transparent',
          '&:hover': {
            borderColor: 'primary.light',
          },
        }}
        onClick={() => handleSelectTemplate(template)}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <FolderIcon sx={{ mr: 1, color: template.color || 'primary.main' }} />
            <Typography variant="h6" component="div">
              {template.name}
            </Typography>
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
      </Card>
    </Grid>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Project from Template</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {!selectedTemplate ? (
            <>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="My Templates" />
                <Tab label="Public Templates" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                {templates.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No templates available. Create one from an existing project first.
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {templates.map(renderTemplateCard)}
                  </Grid>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {publicTemplates.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      No public templates available
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    {publicTemplates.map(renderTemplateCard)}
                  </Grid>
                )}
              </TabPanel>
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info">
                Customize the project name and description, or use the template defaults.
              </Alert>

              <TextField
                label="Project Name"
                fullWidth
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                disabled={creating}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                disabled={creating}
              />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Template: {selectedTemplate.name}
                </Typography>
                {selectedTemplate.category && (
                  <Chip
                    label={selectedTemplate.category}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {selectedTemplate && (
          <Button onClick={() => setSelectedTemplate(null)} disabled={creating}>
            Back
          </Button>
        )}
        <Button onClick={handleClose} disabled={creating}>
          Cancel
        </Button>
        <Button
          onClick={handleCreateFromTemplate}
          variant="contained"
          disabled={!selectedTemplate || creating}
        >
          {creating ? 'Creating...' : 'Create Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
