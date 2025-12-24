import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  IconButton,
  Switch,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material';
import {
  AutomationRule,
  AutomationRuleWithDetails,
  AutomationLog,
  CreateAutomationRuleData,
  UpdateAutomationRuleData,
  Label
} from '../types';
import AutomationRuleEditor from '../components/AutomationRuleEditor';

interface AutomationRulesProps {
  projectId?: number;
}

const AutomationRules: React.FC<AutomationRulesProps> = ({ projectId }) => {
  const [rules, setRules] = useState<AutomationRuleWithDetails[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | undefined>(undefined);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedRuleLogs, setSelectedRuleLogs] = useState<AutomationLog[]>([]);
  const [ruleStats, setRuleStats] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRules = async () => {
      try {
        const loadedRules = projectId
          ? await window.electronAPI.automationRule.findByProjectIdWithDetails(projectId)
          : await window.electronAPI.automationRule.findAllWithDetails();
        if (isMounted) {
          setRules(loadedRules);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load automation rules:', error);
        }
      }
    };

    const loadLabels = async () => {
      if (!projectId) return;
      try {
        const loadedLabels = await window.electronAPI.label.findByProjectId(projectId);
        if (isMounted) {
          setLabels(loadedLabels);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load labels:', error);
        }
      }
    };

    loadRules();
    if (projectId) {
      loadLabels();
    }

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const loadRules = async () => {
    try {
      const loadedRules = projectId
        ? await window.electronAPI.automationRule.findByProjectIdWithDetails(projectId)
        : await window.electronAPI.automationRule.findAllWithDetails();
      setRules(loadedRules);
    } catch (error) {
      console.error('Failed to load automation rules:', error);
    }
  };

  const loadLabels = async () => {
    if (!projectId) return;
    try {
      const loadedLabels = await window.electronAPI.label.findByProjectId(projectId);
      setLabels(loadedLabels);
    } catch (error) {
      console.error('Failed to load labels:', error);
    }
  };

  const handleCreateRule = () => {
    setSelectedRule(undefined);
    setEditorOpen(true);
  };

  const handleEditRule = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setEditorOpen(true);
  };

  const handleSaveRule = async (ruleData: CreateAutomationRuleData | UpdateAutomationRuleData) => {
    try {
      if (selectedRule) {
        await window.electronAPI.automationRule.update(selectedRule.id, ruleData);
      } else {
        await window.electronAPI.automationRule.create(ruleData as CreateAutomationRuleData);
      }
      await loadRules();
      setEditorOpen(false);
    } catch (error) {
      console.error('Failed to save automation rule:', error);
      throw error;
    }
  };

  const handleToggleActive = async (ruleId: number) => {
    try {
      await window.electronAPI.automationRule.toggleActive(ruleId);
      await loadRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleDeleteClick = (ruleId: number) => {
    setRuleToDelete(ruleId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (ruleToDelete === null) return;
    
    try {
      await window.electronAPI.automationRule.delete(ruleToDelete);
      await loadRules();
      setDeleteConfirmOpen(false);
      setRuleToDelete(null);
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleViewLogs = async (ruleId: number) => {
    try {
      const logs = await window.electronAPI.automationRule.findLogsByRuleId(ruleId, 50);
      const stats = await window.electronAPI.automationRule.getRuleStats(ruleId);
      setSelectedRuleLogs(logs);
      setRuleStats(stats);
      setLogsDialogOpen(true);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const formatTrigger = (rule: AutomationRuleWithDetails): string => {
    const triggers: Record<string, string> = {
      'status_change': 'Status changes',
      'priority_change': 'Priority changes',
      'task_created': 'Task created',
      'task_assigned': 'Task assigned',
      'label_added': 'Label added',
      'comment_added': 'Comment added',
      'attachment_added': 'Attachment added',
      'field_update': 'Field updated',
      'due_date_approaching': 'Due date approaching',
      'date_based': 'Date based'
    };
    return triggers[rule.triggerType] || rule.triggerType;
  };

  const formatAction = (rule: AutomationRuleWithDetails): string => {
    const actions: Record<string, string> = {
      'send_notification': 'Send notification',
      'update_status': 'Update status',
      'update_priority': 'Update priority',
      'add_comment': 'Add comment',
      'create_task': 'Create task',
      'add_label': 'Add label',
      'assign_user': 'Assign user',
      'set_due_date': 'Set due date',
      'update_field': 'Update field'
    };
    return actions[rule.actionType] || rule.actionType;
  };

  const formatLogStatus = (status: string): { color: 'success' | 'error' | 'warning'; label: string } => {
    switch (status) {
      case 'success':
        return { color: 'success', label: 'Success' };
      case 'error':
        return { color: 'error', label: 'Error' };
      case 'skipped':
        return { color: 'warning', label: 'Skipped' };
      default:
        return { color: 'warning', label: status };
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          {projectId ? 'Project Automation Rules' : 'Global Automation Rules'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateRule}
        >
          Create Rule
        </Button>
      </Box>

      {rules.length === 0 ? (
        <Alert severity="info">
          No automation rules configured yet. Create your first rule to automate workflows!
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {rules.map((rule) => (
            <Grid item xs={12} md={6} lg={4} key={rule.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      {rule.name}
                    </Typography>
                    <Switch
                      checked={rule.isActive}
                      onChange={() => handleToggleActive(rule.id)}
                      size="small"
                    />
                  </Box>

                  {rule.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {rule.description}
                    </Typography>
                  )}

                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Trigger:
                      </Typography>
                      <Typography variant="body2">
                        {formatTrigger(rule)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Action:
                      </Typography>
                      <Typography variant="body2">
                        {formatAction(rule)}
                      </Typography>
                    </Box>

                    <Box>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {rule.projectName && (
                          <Chip label={`Project: ${rule.projectName}`} size="small" />
                        )}
                        {!rule.projectId && (
                          <Chip label="Global" size="small" color="primary" />
                        )}
                        <Chip 
                          label={`${rule.executionCount} executions`} 
                          size="small" 
                          variant="outlined"
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions>
                  <IconButton size="small" onClick={() => handleEditRule(rule)} title="Edit">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleViewLogs(rule.id)} title="View Logs">
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => handleDeleteClick(rule.id)}
                    title="Delete"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Automation Rule Editor Dialog */}
      <AutomationRuleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveRule}
        rule={selectedRule}
        projectId={projectId}
        labels={labels}
      />

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onClose={() => setLogsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Execution Logs</DialogTitle>
        <DialogContent>
          {ruleStats && (
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">Total</Typography>
                  <Typography variant="h6">{ruleStats.totalExecutions}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">Success</Typography>
                  <Typography variant="h6" color="success.main">{ruleStats.successCount}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">Errors</Typography>
                  <Typography variant="h6" color="error.main">{ruleStats.errorCount}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">Skipped</Typography>
                  <Typography variant="h6" color="warning.main">{ruleStats.skippedCount}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
            </Box>
          )}

          {selectedRuleLogs.length === 0 ? (
            <Alert severity="info">No execution logs yet</Alert>
          ) : (
            <List>
              {selectedRuleLogs.map((log, index) => {
                const statusInfo = formatLogStatus(log.status);
                return (
                  <React.Fragment key={log.id}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(log.executedAt).toLocaleString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            {log.errorMessage && (
                              <Typography variant="body2" color="error">
                                Error: {log.errorMessage}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                              Trigger: {JSON.stringify(log.triggerData)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Delete Automation Rule</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this automation rule? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutomationRules;
