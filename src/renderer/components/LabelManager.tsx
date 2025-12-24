import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Chip,
  IconButton,
  Typography,
  Stack,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Label, CreateLabelData } from '../types';

interface LabelManagerProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  taskId?: number;
  taskLabels?: Label[];
  onLabelsChange?: () => void;
}

export default function LabelManager({
  open,
  onClose,
  projectId,
  taskId,
  taskLabels = [],
  onLabelsChange,
}: LabelManagerProps) {
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Label | null>(null);
  const [newLabel, setNewLabel] = useState<CreateLabelData>({
    projectId,
    name: '',
    color: '#2196F3',
    description: '',
  });

  useEffect(() => {
    if (open) {
      loadLabels();
    }
  }, [open, projectId]);

  const loadLabels = async () => {
    const labels = await window.electronAPI.label.findByProjectId(projectId);
    setAllLabels(labels);
  };

  const handleCreateLabel = async () => {
    if (!newLabel.name.trim()) return;

    await window.electronAPI.label.create({
      ...newLabel,
      projectId,
    });

    setNewLabel({ projectId, name: '', color: '#2196F3', description: '' });
    setCreating(false);
    loadLabels();
    onLabelsChange?.();
  };

  const handleUpdateLabel = async () => {
    if (!editing || !editing.name.trim()) return;

    await window.electronAPI.label.update(editing.id, {
      name: editing.name,
      color: editing.color,
      description: editing.description || undefined,
    });

    setEditing(null);
    loadLabels();
    onLabelsChange?.();
  };

  const handleDeleteLabel = async (labelId: number) => {
    if (!confirm('Delete this label? It will be removed from all tasks.')) return;

    await window.electronAPI.label.delete(labelId);
    loadLabels();
    onLabelsChange?.();
  };

  const handleToggleTaskLabel = async (labelId: number) => {
    if (!taskId) return;

    const hasLabel = taskLabels.some(l => l.id === labelId);
    
    if (hasLabel) {
      await window.electronAPI.label.removeFromTask(taskId, labelId);
    } else {
      await window.electronAPI.label.addToTask(taskId, labelId);
    }
    
    onLabelsChange?.();
  };

  const isLabelActive = (labelId: number) => {
    return taskLabels.some(l => l.id === labelId);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {taskId ? 'Manage Task Labels' : 'Manage Project Labels'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Label List */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              {taskId ? 'Available Labels' : 'Project Labels'}
            </Typography>
            <Stack spacing={1}>
              {allLabels.map(label => (
                <Paper
                  key={label.id}
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    border: taskId && isLabelActive(label.id) ? `2px solid ${label.color}` : '1px solid #e0e0e0',
                    cursor: taskId ? 'pointer' : 'default',
                  }}
                  onClick={() => taskId && handleToggleTaskLabel(label.id)}
                >
                  {editing?.id === label.id ? (
                    <Box sx={{ flex: 1, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        size="small"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        placeholder="Label name"
                        sx={{ flex: 1 }}
                        autoFocus
                      />
                      <input
                        type="color"
                        value={editing.color}
                        onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                        style={{ width: 40, height: 40, border: 'none', cursor: 'pointer' }}
                      />
                      <Button size="small" onClick={handleUpdateLabel}>Save</Button>
                      <Button size="small" onClick={() => setEditing(null)}>Cancel</Button>
                    </Box>
                  ) : (
                    <>
                      <Chip
                        label={label.name}
                        size="small"
                        sx={{
                          backgroundColor: `${label.color}20`,
                          color: label.color,
                          fontWeight: 600,
                        }}
                      />
                      {label.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                          {label.description}
                        </Typography>
                      )}
                      {!taskId && (
                        <Box>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditing(label);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLabel(label.id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </>
                  )}
                </Paper>
              ))}
            </Stack>
          </Box>

          {/* Create New Label */}
          {!taskId && (
            <Box>
              {creating ? (
                <Paper sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <TextField
                      label="Label Name"
                      size="small"
                      value={newLabel.name}
                      onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })}
                      fullWidth
                      autoFocus
                    />
                    <TextField
                      label="Description (optional)"
                      size="small"
                      value={newLabel.description}
                      onChange={(e) => setNewLabel({ ...newLabel, description: e.target.value })}
                      fullWidth
                    />
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="body2">Color:</Typography>
                      <input
                        type="color"
                        value={newLabel.color}
                        onChange={(e) => setNewLabel({ ...newLabel, color: e.target.value })}
                        style={{ width: 50, height: 40, border: 'none', cursor: 'pointer' }}
                      />
                      <Box sx={{ flex: 1 }} />
                      <Button onClick={() => setCreating(false)}>Cancel</Button>
                      <Button variant="contained" onClick={handleCreateLabel}>
                        Create
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
                  Create New Label
                </Button>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
