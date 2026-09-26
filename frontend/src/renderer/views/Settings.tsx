import {
  Box,
  Paper,
  Typography,
  Switch,
  Divider,
  FormControl,
  FormControlLabel,
  Select,
  MenuItem,
  Button,
  TextField,
} from '@mui/material';
import { useState } from 'react';

export default function Settings() {
  const [settings, setSettings] = useState({
    theme: 'dark',
    notifications: true,
    autoSave: true,
    defaultView: 'dashboard',
    language: 'en',
  });

  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        Settings
      </Typography>

      {/* Appearance */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Appearance
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Theme
            </Typography>
            <Select
              value={settings.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="auto">Auto (System)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Default View
            </Typography>
            <Select
              value={settings.defaultView}
              onChange={(e) => handleChange('defaultView', e.target.value)}
            >
              <MenuItem value="dashboard">Dashboard</MenuItem>
              <MenuItem value="projects">Projects</MenuItem>
              <MenuItem value="kanban">Kanban Board</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Preferences */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Preferences
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.notifications}
                onChange={(e) => handleChange('notifications', e.target.checked)}
              />
            }
            label="Enable Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.autoSave}
                onChange={(e) => handleChange('autoSave', e.target.checked)}
              />
            }
            label="Auto-save Changes"
          />
        </Box>
      </Paper>

      {/* Database */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Database
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Database Path"
            value="~/.devtrack/devtrack.db"
            InputProps={{
              readOnly: true,
            }}
            helperText="Location where your DevTrack data is stored"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined">Backup Database</Button>
            <Button variant="outlined">Restore Database</Button>
          </Box>
        </Box>
      </Paper>

      {/* About */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          About DevTrack
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Version: 1.0.0
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Backend: C++23 with SQLite
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Frontend: Electron + React + TypeScript
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary">
            A high-performance, concept-driven project management system for AI-assisted solo development.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" sx={{ mr: 1 }}>
              Check for Updates
            </Button>
            <Button variant="outlined">View Documentation</Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
