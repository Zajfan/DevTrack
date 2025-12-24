import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { TimeEntry, TimeEntryWithDetails } from '../types';

interface TimeTrackerProps {
  taskId: number;
  userId: number;
  onEntryCreated?: () => void;
  onEntryUpdated?: () => void;
  onEntryDeleted?: () => void;
}

const TimeTracker: React.FC<TimeTrackerProps> = ({
  taskId,
  userId,
  onEntryCreated,
  onEntryUpdated,
  onEntryDeleted,
}) => {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [entries, setEntries] = useState<TimeEntryWithDetails[]>([]);
  const [manualEntryDialogOpen, setManualEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  
  // Manual entry form state
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isBillable, setIsBillable] = useState(false);
  const [hourlyRate, setHourlyRate] = useState('');

  // Load active entry and entries on mount
  useEffect(() => {
    loadActiveEntry();
    loadEntries();
  }, [taskId, userId]);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (activeEntry) {
      interval = setInterval(() => {
        const startMs = new Date(activeEntry.startTime).getTime();
        const nowMs = Date.now();
        const elapsedSeconds = Math.floor((nowMs - startMs) / 1000);
        setElapsedTime(elapsedSeconds);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeEntry]);

  const loadActiveEntry = async () => {
    try {
      const entry = await window.electronAPI.timeEntry.findActiveByUserId(userId);
      if (entry && entry.taskId === taskId) {
        setActiveEntry(entry);
        const startMs = new Date(entry.startTime).getTime();
        const nowMs = Date.now();
        setElapsedTime(Math.floor((nowMs - startMs) / 1000));
      }
    } catch (error) {
      console.error('Failed to load active entry:', error);
    }
  };

  const loadEntries = async () => {
    try {
      const taskEntries = await window.electronAPI.timeEntry.findByTaskIdWithDetails(taskId);
      setEntries(taskEntries);
    } catch (error) {
      console.error('Failed to load entries:', error);
    }
  };

  const handleStart = async () => {
    try {
      const entry = await window.electronAPI.timeEntry.create({
        taskId,
        userId,
        startTime: new Date().toISOString(),
        isBillable: false,
      });
      setActiveEntry(entry);
      setElapsedTime(0);
      onEntryCreated?.();
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handleStop = async () => {
    if (!activeEntry) return;
    
    try {
      await window.electronAPI.timeEntry.stop(activeEntry.id);
      setActiveEntry(null);
      setElapsedTime(0);
      await loadEntries();
      onEntryUpdated?.();
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  const handleOpenManualEntry = () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    
    setDescription('');
    setStartTime(formatDateTimeLocal(oneHourAgo));
    setEndTime(formatDateTimeLocal(now));
    setIsBillable(false);
    setHourlyRate('');
    setEditingEntry(null);
    setManualEntryDialogOpen(true);
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setDescription(entry.description || '');
    setStartTime(entry.startTime ? formatDateTimeLocal(new Date(entry.startTime)) : '');
    setEndTime(entry.endTime ? formatDateTimeLocal(new Date(entry.endTime)) : '');
    setIsBillable(entry.isBillable);
    setHourlyRate(entry.hourlyRate?.toString() || '');
    setEditingEntry(entry);
    setManualEntryDialogOpen(true);
  };

  const handleSaveManualEntry = async () => {
    if (!startTime || !endTime) return;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    try {
      if (editingEntry) {
        await window.electronAPI.timeEntry.update(editingEntry.id, {
          description: description || undefined,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration: durationSeconds,
          isBillable,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        });
        onEntryUpdated?.();
      } else {
        await window.electronAPI.timeEntry.create({
          taskId,
          userId,
          description,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          duration: durationSeconds,
          isBillable,
          hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        });
        onEntryCreated?.();
      }
      
      await loadEntries();
      setManualEntryDialogOpen(false);
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Are you sure you want to delete this time entry?')) return;
    
    try {
      await window.electronAPI.timeEntry.delete(id);
      await loadEntries();
      onEntryDeleted?.();
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDurationHours = (seconds: number): string => {
    const hours = (seconds / 3600).toFixed(2);
    return `${hours}h`;
  };

  return (
    <Box>
      {/* Timer Control */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">
              {activeEntry ? formatDuration(elapsedTime) : '00:00:00'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeEntry ? 'Timer running...' : 'Not tracking'}
            </Typography>
          </Box>
          
          {activeEntry ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<StopIcon />}
              onClick={handleStop}
            >
              Stop
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayIcon />}
                onClick={handleStart}
              >
                Start Timer
              </Button>
              <Button
                variant="outlined"
                onClick={handleOpenManualEntry}
              >
                Manual Entry
              </Button>
            </>
          )}
        </Stack>
      </Paper>

      {/* Time Entries List */}
      {entries.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Time Entries
          </Typography>
          
          <Stack spacing={1}>
            {entries.map(entry => {
              const duration = entry.duration || 0;
              const earnings = entry.isBillable && entry.hourlyRate 
                ? ((duration / 3600) * entry.hourlyRate).toFixed(2)
                : null;
              
              return (
                <Paper key={entry.id} sx={{ p: 2 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ flexGrow: 1 }}>
                      {entry.description && (
                        <Typography variant="body2" gutterBottom>
                          {entry.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {new Date(entry.startTime).toLocaleString()}
                        {entry.endTime && ` - ${new Date(entry.endTime).toLocaleString()}`}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Chip
                          label={formatDurationHours(duration)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {entry.isBillable && (
                          <Chip
                            label={earnings ? `$${earnings}` : 'Billable'}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Box>
                    
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEditEntry(entry)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteEntry(entry.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Manual Entry Dialog */}
      <Dialog open={manualEntryDialogOpen} onClose={() => setManualEntryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingEntry ? 'Edit Time Entry' : 'Add Manual Time Entry'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            
            <TextField
              label="Start Time"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <TextField
              label="End Time"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={isBillable}
                  onChange={(e) => setIsBillable(e.target.checked)}
                />
              }
              label="Billable"
            />
            
            {isBillable && (
              <TextField
                label="Hourly Rate"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                InputProps={{ startAdornment: '$' }}
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualEntryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveManualEntry} variant="contained" color="primary">
            {editingEntry ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TimeTracker;
