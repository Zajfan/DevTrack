import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Palette as PaletteIcon,
  Business as BusinessIcon,
  Keyboard as KeyboardIcon,
  ViewModule as WorkspaceIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { AppSettings, KeyboardShortcut } from '../types';
import { ERROR_MESSAGES } from '../constants/errorMessages';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsView() {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [editingShortcut, setEditingShortcut] = useState<KeyboardShortcut | null>(null);
  const [shortcutDialogOpen, setShortcutDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

  // Load settings on mount
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const loadedSettings = await window.electronAPI.settings.getAll();
        if (isMounted) {
          setSettings(loadedSettings);
        }
      } catch (error) {
        if (isMounted) {
          console.error(ERROR_MESSAGES.LOAD_SETTINGS_FAILED, error);
          showSnackbar(ERROR_MESSAGES.LOAD_SETTINGS_FAILED, 'error');
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.settings.getAll();
      setSettings(loadedSettings);
    } catch (error) {
      console.error(ERROR_MESSAGES.LOAD_SETTINGS_FAILED, error);
      showSnackbar(ERROR_MESSAGES.LOAD_SETTINGS_FAILED, 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleThemeChange = async (field: string, value: any) => {
    if (!settings) return;
    
    const updatedTheme = { ...settings.theme, [field]: value };
    try {
      await window.electronAPI.settings.set('theme', updatedTheme);
      setSettings({ ...settings, theme: updatedTheme });
      showSnackbar('Theme updated', 'success');
    } catch (error) {
      console.error(ERROR_MESSAGES.UPDATE_THEME_FAILED, error);
      showSnackbar(ERROR_MESSAGES.UPDATE_THEME_FAILED, 'error');
    }
  };

  const handleBrandingChange = async (field: string, value: string) => {
    if (!settings) return;
    
    const updatedBranding = { ...settings.branding, [field]: value };
    try {
      await window.electronAPI.settings.set('branding', updatedBranding);
      setSettings({ ...settings, branding: updatedBranding });
      showSnackbar('Branding updated', 'success');
    } catch (error) {
      console.error(ERROR_MESSAGES.UPDATE_BRANDING_FAILED, error);
      showSnackbar(ERROR_MESSAGES.UPDATE_BRANDING_FAILED, 'error');
    }
  };

  const handleWorkspaceChange = async (field: string, value: any) => {
    if (!settings) return;
    
    const updatedWorkspace = { ...settings.workspace, [field]: value };
    try {
      await window.electronAPI.settings.set('workspace', updatedWorkspace);
      setSettings({ ...settings, workspace: updatedWorkspace });
      showSnackbar('Workspace settings updated', 'success');
    } catch (error) {
      console.error(ERROR_MESSAGES.UPDATE_WORKSPACE_SETTINGS_FAILED, error);
      showSnackbar(ERROR_MESSAGES.UPDATE_WORKSPACE_SETTINGS_FAILED, 'error');
    }
  };

  const handleEditShortcut = (shortcut: KeyboardShortcut) => {
    setEditingShortcut({ ...shortcut });
    setShortcutDialogOpen(true);
  };

  const handleSaveShortcut = async () => {
    if (!settings || !editingShortcut) return;
    
    const updatedShortcuts = settings.keyboardShortcuts.map(s =>
      s.action === editingShortcut.action ? editingShortcut : s
    );
    
    try {
      await window.electronAPI.settings.set('keyboardShortcuts', updatedShortcuts);
      setSettings({ ...settings, keyboardShortcuts: updatedShortcuts });
      setShortcutDialogOpen(false);
      setEditingShortcut(null);
      showSnackbar('Keyboard shortcut updated', 'success');
    } catch (error) {
      console.error(ERROR_MESSAGES.UPDATE_SHORTCUT_FAILED, error);
      showSnackbar(ERROR_MESSAGES.UPDATE_SHORTCUT_FAILED, 'error');
    }
  };

  const handleAddShortcut = () => {
    setEditingShortcut({
      action: 'custom',
      keys: 'Ctrl+Shift+',
      description: 'New custom shortcut',
    });
    setShortcutDialogOpen(true);
  };

  const handleDeleteShortcut = async (action: string) => {
    if (!settings) return;
    
    const updatedShortcuts = settings.keyboardShortcuts.filter(s => s.action !== action);
    
    try {
      await window.electronAPI.settings.set('keyboardShortcuts', updatedShortcuts);
      setSettings({ ...settings, keyboardShortcuts: updatedShortcuts });
      showSnackbar('Keyboard shortcut deleted', 'success');
    } catch (error) {
      console.error(ERROR_MESSAGES.DELETE_SHORTCUT_FAILED, error);
      showSnackbar(ERROR_MESSAGES.DELETE_SHORTCUT_FAILED, 'error');
    }
  };

  const handleResetSection = async (section: keyof AppSettings) => {
    if (!confirm(`Are you sure you want to reset ${section} settings to defaults?`)) return;
    
    try {
      await window.electronAPI.settings.resetSection(section);
      await loadSettings();
      showSnackbar(`${section} settings reset to defaults`, 'success');
    } catch (error) {
      console.error(ERROR_MESSAGES.RESET_SECTION_FAILED, error);
      showSnackbar(ERROR_MESSAGES.RESET_SECTION_FAILED, 'error');
    }
  };

  const handleResetAll = async () => {
    if (!confirm('Are you sure you want to reset ALL settings to defaults? This cannot be undone.')) return;
    
    try {
      await window.electronAPI.settings.reset();
      await loadSettings();
      showSnackbar('All settings reset to defaults', 'success');
    } catch (error) {
      console.error(ERROR_MESSAGES.RESET_SETTINGS_FAILED, error);
      showSnackbar(ERROR_MESSAGES.RESET_SETTINGS_FAILED, 'error');
    }
  };

  const handleExport = async () => {
    try {
      const settingsJson = await window.electronAPI.settings.export();
      const blob = new Blob([settingsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `devtrack-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSnackbar('Settings exported successfully', 'success');
    } catch (error) {
      console.error(ERROR_MESSAGES.EXPORT_SETTINGS_FAILED, error);
      showSnackbar(ERROR_MESSAGES.EXPORT_SETTINGS_FAILED, 'error');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      await window.electronAPI.settings.import(text);
      await loadSettings();
      showSnackbar('Settings imported successfully', 'success');
    } catch (error) {
      console.error(ERROR_MESSAGES.IMPORT_SETTINGS_FAILED, error);
      showSnackbar(ERROR_MESSAGES.IMPORT_SETTINGS_FAILED, 'error');
    }
    
    // Reset file input
    event.target.value = '';
  };

  if (!settings) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography>Loading settings...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ fontSize: 40, mr: 2 }} />
        <Typography variant="h4" component="h1">
          Settings
        </Typography>
      </Box>

      <Paper>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
          <Tab icon={<PaletteIcon />} label="Theme" />
          <Tab icon={<BusinessIcon />} label="Branding" />
          <Tab icon={<KeyboardIcon />} label="Keyboard Shortcuts" />
          <Tab icon={<WorkspaceIcon />} label="Workspace" />
        </Tabs>

        {/* Theme Tab */}
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Theme Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Theme Mode</InputLabel>
                <Select
                  value={settings.theme.mode}
                  label="Theme Mode"
                  onChange={(e) => handleThemeChange('mode', e.target.value)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Primary Color"
                type="color"
                value={settings.theme.primaryColor || '#2563eb'}
                onChange={(e) => handleThemeChange('primaryColor', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Secondary Color"
                type="color"
                value={settings.theme.secondaryColor || '#8b5cf6'}
                onChange={(e) => handleThemeChange('secondaryColor', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Background Color"
                type="color"
                value={settings.theme.backgroundColor || '#1e1e1e'}
                onChange={(e) => handleThemeChange('backgroundColor', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Text Color"
                type="color"
                value={settings.theme.textColor || '#ffffff'}
                onChange={(e) => handleThemeChange('textColor', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Custom CSS"
                multiline
                rows={4}
                value={settings.theme.customCss || ''}
                onChange={(e) => handleThemeChange('customCss', e.target.value)}
                placeholder="/* Add your custom CSS here */"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => handleResetSection('theme')}
              >
                Reset Theme to Defaults
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Branding Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Branding Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Application Name"
                value={settings.branding.appName}
                onChange={(e) => handleBrandingChange('appName', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Company Name"
                value={settings.branding.companyName || ''}
                onChange={(e) => handleBrandingChange('companyName', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Logo URL"
                value={settings.branding.logoUrl || ''}
                onChange={(e) => handleBrandingChange('logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Support Email"
                type="email"
                value={settings.branding.supportEmail || ''}
                onChange={(e) => handleBrandingChange('supportEmail', e.target.value)}
                placeholder="support@example.com"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => handleResetSection('branding')}
              >
                Reset Branding to Defaults
              </Button>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Keyboard Shortcuts Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Keyboard Shortcuts
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleAddShortcut}
              >
                Add Custom
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => handleResetSection('keyboardShortcuts')}
              >
                Reset to Defaults
              </Button>
            </Stack>
          </Box>
          
          <List>
            {settings.keyboardShortcuts.map((shortcut, index) => (
              <React.Fragment key={shortcut.action}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={shortcut.description}
                    secondary={
                      <Chip
                        label={shortcut.keys}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleEditShortcut(shortcut)}>
                      <EditIcon />
                    </IconButton>
                    {shortcut.action.startsWith('custom') && (
                      <IconButton edge="end" onClick={() => handleDeleteShortcut(shortcut.action)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </TabPanel>

        {/* Workspace Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Workspace Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Default View</InputLabel>
                <Select
                  value={settings.workspace.defaultView}
                  label="Default View"
                  onChange={(e) => handleWorkspaceChange('defaultView', e.target.value)}
                >
                  <MenuItem value="list">List View</MenuItem>
                  <MenuItem value="board">Board View</MenuItem>
                  <MenuItem value="calendar">Calendar View</MenuItem>
                  <MenuItem value="table">Table View</MenuItem>
                  <MenuItem value="gallery">Gallery View</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Default Grouping</InputLabel>
                <Select
                  value={settings.workspace.taskGrouping}
                  label="Default Grouping"
                  onChange={(e) => handleWorkspaceChange('taskGrouping', e.target.value)}
                >
                  <MenuItem value="status">By Status</MenuItem>
                  <MenuItem value="priority">By Priority</MenuItem>
                  <MenuItem value="assignee">By Assignee</MenuItem>
                  <MenuItem value="none">None</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Default Sorting</InputLabel>
                <Select
                  value={settings.workspace.taskSorting}
                  label="Default Sorting"
                  onChange={(e) => handleWorkspaceChange('taskSorting', e.target.value)}
                >
                  <MenuItem value="manual">Manual</MenuItem>
                  <MenuItem value="dueDate">Due Date</MenuItem>
                  <MenuItem value="priority">Priority</MenuItem>
                  <MenuItem value="created">Created Date</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Auto-save Interval (seconds)"
                type="number"
                value={settings.workspace.autoSaveInterval}
                onChange={(e) => handleWorkspaceChange('autoSaveInterval', parseInt(e.target.value))}
                inputProps={{ min: 5, max: 300 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.workspace.showCompletedTasks}
                    onChange={(e) => handleWorkspaceChange('showCompletedTasks', e.target.checked)}
                  />
                }
                label="Show Completed Tasks"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.workspace.notificationsEnabled}
                    onChange={(e) => handleWorkspaceChange('notificationsEnabled', e.target.checked)}
                  />
                }
                label="Enable Notifications"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.workspace.soundEnabled}
                    onChange={(e) => handleWorkspaceChange('soundEnabled', e.target.checked)}
                  />
                }
                label="Enable Sound"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.workspace.autoSave}
                    onChange={(e) => handleWorkspaceChange('autoSave', e.target.checked)}
                  />
                }
                label="Auto-save"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => handleResetSection('workspace')}
              >
                Reset Workspace to Defaults
              </Button>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          Export Settings
        </Button>
        <Button
          variant="outlined"
          component="label"
          startIcon={<UploadIcon />}
        >
          Import Settings
          <input
            type="file"
            hidden
            accept=".json"
            onChange={handleImport}
          />
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          color="error"
          startIcon={<RefreshIcon />}
          onClick={handleResetAll}
        >
          Reset All Settings
        </Button>
      </Box>

      {/* Keyboard Shortcut Edit Dialog */}
      <Dialog open={shortcutDialogOpen} onClose={() => setShortcutDialogOpen(false)}>
        <DialogTitle>
          {editingShortcut?.action.startsWith('custom') ? 'Add Custom Shortcut' : 'Edit Keyboard Shortcut'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Description"
            value={editingShortcut?.description || ''}
            onChange={(e) => setEditingShortcut(prev => prev ? { ...prev, description: e.target.value } : null)}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Keys (e.g., Ctrl+Shift+N)"
            value={editingShortcut?.keys || ''}
            onChange={(e) => setEditingShortcut(prev => prev ? { ...prev, keys: e.target.value } : null)}
            helperText="Use modifiers: Ctrl, Shift, Alt, and a key"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShortcutDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveShortcut} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Settings Info Footer */}
      <Paper sx={{ mt: 3, p: 2, bgcolor: 'background.default' }}>
        <Typography variant="caption" color="text.secondary">
          Settings Version: {settings.version} | Last Updated: {new Date(settings.lastUpdated).toLocaleString()}
        </Typography>
      </Paper>
    </Container>
  );
}
