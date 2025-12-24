import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  Stack,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { CustomField, CustomFieldType, CreateCustomFieldData } from '../types';

interface CustomFieldManagerProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  onFieldsChange?: () => void;
}

export default function CustomFieldManager({
  open,
  onClose,
  projectId,
  onFieldsChange,
}: CustomFieldManagerProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [newField, setNewField] = useState<CreateCustomFieldData>({
    projectId,
    name: '',
    fieldType: CustomFieldType.Text,
    options: '',
    required: false,
  });

  useEffect(() => {
    if (open) {
      loadFields();
    }
  }, [open, projectId]);

  const loadFields = async () => {
    const customFields = await window.electronAPI.customField.findByProjectId(projectId);
    setFields(customFields);
  };

  const handleCreateField = async () => {
    if (!newField.name.trim()) return;

    const data: CreateCustomFieldData = {
      ...newField,
      projectId,
    };

    // For select/multi-select, ensure options is a JSON string
    if (newField.fieldType === CustomFieldType.Select || newField.fieldType === CustomFieldType.MultiSelect) {
      if (newField.options) {
        const optionsArray = newField.options.split(',').map(opt => opt.trim()).filter(Boolean);
        data.options = JSON.stringify(optionsArray);
      }
    }

    await window.electronAPI.customField.create(data);

    setNewField({
      projectId,
      name: '',
      fieldType: CustomFieldType.Text,
      options: '',
      required: false,
    });
    setCreating(false);
    loadFields();
    onFieldsChange?.();
  };

  const handleUpdateField = async () => {
    if (!editing || !editing.name.trim()) return;

    const data: any = {
      name: editing.name,
      required: editing.required,
    };

    // For select/multi-select, ensure options is a JSON string
    if (editing.fieldType === CustomFieldType.Select || editing.fieldType === CustomFieldType.MultiSelect) {
      if (editing.options) {
        const optionsArray = typeof editing.options === 'string' 
          ? editing.options.split(',').map(opt => opt.trim()).filter(Boolean)
          : JSON.parse(editing.options);
        data.options = JSON.stringify(optionsArray);
      }
    }

    await window.electronAPI.customField.update(editing.id, data);

    setEditing(null);
    loadFields();
    onFieldsChange?.();
  };

  const handleDeleteField = async (fieldId: number) => {
    if (!confirm('Delete this custom field? All values for this field will be lost.')) return;

    await window.electronAPI.customField.delete(fieldId);
    loadFields();
    onFieldsChange?.();
  };

  const getFieldTypeLabel = (type: CustomFieldType): string => {
    const labels = {
      [CustomFieldType.Text]: 'Text',
      [CustomFieldType.Number]: 'Number',
      [CustomFieldType.Date]: 'Date',
      [CustomFieldType.Checkbox]: 'Checkbox',
      [CustomFieldType.Select]: 'Select (Dropdown)',
      [CustomFieldType.MultiSelect]: 'Multi-Select',
    };
    return labels[type] || type;
  };

  const parseOptions = (options: string | null): string => {
    if (!options) return '';
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.join(', ') : options;
    } catch {
      return options;
    }
  };

  const needsOptions = (type: CustomFieldType): boolean => {
    return type === CustomFieldType.Select || type === CustomFieldType.MultiSelect;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Manage Custom Fields</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Field List */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Project Custom Fields
            </Typography>
            {fields.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No custom fields defined. Create one below.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {fields.map(field => (
                  <Paper
                    key={field.id}
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    {editing?.id === field.id ? (
                      <Box sx={{ flex: 1, display: 'flex', gap: 2, flexDirection: 'column' }}>
                        <TextField
                          size="small"
                          label="Field Name"
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          fullWidth
                          autoFocus
                        />
                        {needsOptions(editing.fieldType) && (
                          <TextField
                            size="small"
                            label="Options (comma-separated)"
                            value={parseOptions(editing.options)}
                            onChange={(e) => setEditing({ ...editing, options: e.target.value })}
                            fullWidth
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        )}
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editing.required}
                              onChange={(e) => setEditing({ ...editing, required: e.target.checked })}
                            />
                          }
                          label="Required field"
                        />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained" onClick={handleUpdateField}>
                            Save
                          </Button>
                          <Button size="small" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {field.name}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
                            <Chip
                              label={getFieldTypeLabel(field.fieldType)}
                              size="small"
                              variant="outlined"
                            />
                            {field.required && (
                              <Chip label="Required" size="small" color="primary" />
                            )}
                            {needsOptions(field.fieldType) && field.options && (
                              <Typography variant="caption" color="text.secondary">
                                Options: {parseOptions(field.options)}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <Box>
                          <IconButton size="small" onClick={() => setEditing(field)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteField(field.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          {/* Create New Field */}
          <Box>
            {creating ? (
              <Paper sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <TextField
                    label="Field Name"
                    size="small"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    fullWidth
                    autoFocus
                    placeholder="e.g., Sprint Number, Estimated Hours"
                  />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Field Type</InputLabel>
                    <Select
                      value={newField.fieldType}
                      label="Field Type"
                      onChange={(e) => setNewField({ ...newField, fieldType: e.target.value as CustomFieldType })}
                    >
                      <MenuItem value={CustomFieldType.Text}>Text</MenuItem>
                      <MenuItem value={CustomFieldType.Number}>Number</MenuItem>
                      <MenuItem value={CustomFieldType.Date}>Date</MenuItem>
                      <MenuItem value={CustomFieldType.Checkbox}>Checkbox</MenuItem>
                      <MenuItem value={CustomFieldType.Select}>Select (Dropdown)</MenuItem>
                      <MenuItem value={CustomFieldType.MultiSelect}>Multi-Select</MenuItem>
                    </Select>
                  </FormControl>
                  {needsOptions(newField.fieldType) && (
                    <TextField
                      label="Options (comma-separated)"
                      size="small"
                      value={newField.options}
                      onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                      fullWidth
                      placeholder="Option 1, Option 2, Option 3"
                      helperText="Enter options separated by commas"
                    />
                  )}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={newField.required}
                        onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                      />
                    }
                    label="Required field"
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" onClick={handleCreateField}>
                      Create Field
                    </Button>
                    <Button onClick={() => setCreating(false)}>
                      Cancel
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            ) : (
              <Button
                startIcon={<AddIcon />}
                onClick={() => setCreating(true)}
                variant="outlined"
                fullWidth
              >
                Add Custom Field
              </Button>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
