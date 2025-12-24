import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
} from '@mui/material';
import { TemplateCategory } from '../types';

interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  onSuccess?: (templateId: number) => void;
}

export default function SaveAsTemplateDialog({
  open,
  onClose,
  projectId,
  projectName,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  const [templateName, setTemplateName] = useState(`${projectName} Template`);
  const [category, setCategory] = useState<TemplateCategory>(TemplateCategory.Other);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const templateId = await window.electronAPI.template.saveProjectAsTemplate(
        projectId,
        templateName,
        category,
        isPublic,
        1 // Current user ID
      );

      console.log('Template created with ID:', templateId);
      onSuccess?.(templateId);
      onClose();
      
      // Reset form
      setTemplateName(`${projectName} Template`);
      setCategory(TemplateCategory.Other);
      setIsPublic(false);
    } catch (err) {
      console.error('Failed to save template:', err);
      setError('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save as Template</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            label="Template Name"
            fullWidth
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            autoFocus
            disabled={saving}
            required
          />

          <FormControl fullWidth disabled={saving}>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
            >
              {Object.values(TemplateCategory).map(cat => (
                <MenuItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={saving}>
            <InputLabel>Visibility</InputLabel>
            <Select
              value={isPublic ? 'public' : 'private'}
              label="Visibility"
              onChange={(e) => setIsPublic(e.target.value === 'public')}
            >
              <MenuItem value="private">Private (Only me)</MenuItem>
              <MenuItem value="public">Public (All users)</MenuItem>
            </Select>
          </FormControl>

          <Alert severity="info">
            This will create a template including all tasks in this project. 
            Task assignments and dates will not be included.
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !templateName.trim()}
        >
          {saving ? 'Saving...' : 'Save Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
