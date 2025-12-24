import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Chip,
  Stack,
  Alert
} from '@mui/material';
import {
  TriggerType,
  ActionType,
  CreateAutomationRuleData,
  UpdateAutomationRuleData,
  AutomationRule,
  StatusChangeTrigger,
  FieldUpdateTrigger,
  PriorityChangeTrigger,
  LabelAddedTrigger,
  UpdateFieldAction,
  SendNotificationAction,
  CreateTaskAction,
  AssignUserAction,
  AddLabelAction,
  AddCommentAction,
  UpdateStatusAction,
  UpdatePriorityAction,
  SetDueDateAction,
  TaskStatus,
  TaskPriority,
  Label
} from '../types';

interface AutomationRuleEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (rule: CreateAutomationRuleData | UpdateAutomationRuleData) => Promise<void>;
  rule?: AutomationRule;
  projectId?: number;
  labels?: Label[];
}

const AutomationRuleEditor: React.FC<AutomationRuleEditorProps> = ({
  open,
  onClose,
  onSave,
  rule,
  projectId,
  labels = []
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [triggerType, setTriggerType] = useState<TriggerType>(TriggerType.StatusChange);
  const [triggerConfig, setTriggerConfig] = useState<any>({});
  const [actionType, setActionType] = useState<ActionType>(ActionType.SendNotification);
  const [actionConfig, setActionConfig] = useState<any>({});
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDescription(rule.description || '');
      setIsActive(rule.isActive);
      setTriggerType(rule.triggerType);
      setTriggerConfig(rule.triggerConfig);
      setActionType(rule.actionType);
      setActionConfig(rule.actionConfig);
    } else {
      // Reset for new rule
      setName('');
      setDescription('');
      setIsActive(true);
      setTriggerType(TriggerType.StatusChange);
      setTriggerConfig({ toStatus: TaskStatus.Done });
      setActionType(ActionType.SendNotification);
      setActionConfig({ userRole: 'assignee', title: 'Task completed', message: 'Your task has been completed' });
    }
    setError('');
  }, [rule, open]);

  const handleSave = async () => {
    try {
      if (!name.trim()) {
        setError('Rule name is required');
        return;
      }

      const ruleData: CreateAutomationRuleData | UpdateAutomationRuleData = {
        name,
        description: description || undefined,
        isActive,
        triggerType,
        triggerConfig,
        actionType,
        actionConfig,
        ...(rule ? {} : { projectId, createdBy: 1 }) // Only for create
      };

      await onSave(ruleData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    }
  };

  const renderTriggerConfig = () => {
    switch (triggerType) {
      case TriggerType.StatusChange:
        return (
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>From Status (Optional)</InputLabel>
              <Select
                value={(triggerConfig as StatusChangeTrigger).fromStatus || ''}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, fromStatus: e.target.value || undefined })}
              >
                <MenuItem value="">Any Status</MenuItem>
                {Object.values(TaskStatus).map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>To Status</InputLabel>
              <Select
                value={(triggerConfig as StatusChangeTrigger).toStatus || ''}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, toStatus: e.target.value })}
              >
                {Object.values(TaskStatus).map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        );

      case TriggerType.PriorityChange:
        return (
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>From Priority (Optional)</InputLabel>
              <Select
                value={(triggerConfig as PriorityChangeTrigger).fromPriority || ''}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, fromPriority: e.target.value || undefined })}
              >
                <MenuItem value="">Any Priority</MenuItem>
                {Object.values(TaskPriority).map((priority) => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>To Priority</InputLabel>
              <Select
                value={(triggerConfig as PriorityChangeTrigger).toPriority || ''}
                onChange={(e) => setTriggerConfig({ ...triggerConfig, toPriority: e.target.value })}
              >
                {Object.values(TaskPriority).map((priority) => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        );

      case TriggerType.LabelAdded:
        return (
          <FormControl fullWidth>
            <InputLabel>Label (Optional)</InputLabel>
            <Select
              value={(triggerConfig as LabelAddedTrigger).labelId || ''}
              onChange={(e) => setTriggerConfig({ labelId: e.target.value ? Number(e.target.value) : undefined })}
            >
              <MenuItem value="">Any Label</MenuItem>
              {labels.map((label) => (
                <MenuItem key={label.id} value={label.id}>{label.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      default:
        return (
          <Alert severity="info">
            This trigger type doesn't require additional configuration.
          </Alert>
        );
    }
  };

  const renderActionConfig = () => {
    switch (actionType) {
      case ActionType.SendNotification:
        return (
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Send To</InputLabel>
              <Select
                value={(actionConfig as SendNotificationAction).userRole || ''}
                onChange={(e) => setActionConfig({ ...actionConfig, userRole: e.target.value })}
              >
                <MenuItem value="assignee">Task Assignee</MenuItem>
                <MenuItem value="creator">Task Creator</MenuItem>
                <MenuItem value="project_members">All Project Members</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              required
              label="Notification Title"
              value={(actionConfig as SendNotificationAction).title || ''}
              onChange={(e) => setActionConfig({ ...actionConfig, title: e.target.value })}
            />
            <TextField
              fullWidth
              required
              multiline
              rows={3}
              label="Notification Message"
              value={(actionConfig as SendNotificationAction).message || ''}
              onChange={(e) => setActionConfig({ ...actionConfig, message: e.target.value })}
            />
          </Stack>
        );

      case ActionType.UpdateStatus:
        return (
          <FormControl fullWidth required>
            <InputLabel>New Status</InputLabel>
            <Select
              value={(actionConfig as UpdateStatusAction).status || ''}
              onChange={(e) => setActionConfig({ status: e.target.value })}
            >
              {Object.values(TaskStatus).map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case ActionType.UpdatePriority:
        return (
          <FormControl fullWidth required>
            <InputLabel>New Priority</InputLabel>
            <Select
              value={(actionConfig as UpdatePriorityAction).priority || ''}
              onChange={(e) => setActionConfig({ priority: e.target.value })}
            >
              {Object.values(TaskPriority).map((priority) => (
                <MenuItem key={priority} value={priority}>{priority}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case ActionType.AddComment:
        return (
          <TextField
            fullWidth
            required
            multiline
            rows={4}
            label="Comment Content"
            value={(actionConfig as AddCommentAction).content || ''}
            onChange={(e) => setActionConfig({ content: e.target.value })}
          />
        );

      case ActionType.CreateTask:
        return (
          <Stack spacing={2}>
            <TextField
              fullWidth
              required
              label="Task Title"
              value={(actionConfig as CreateTaskAction).title || ''}
              onChange={(e) => setActionConfig({ ...actionConfig, title: e.target.value })}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Task Description"
              value={(actionConfig as CreateTaskAction).description || ''}
              onChange={(e) => setActionConfig({ ...actionConfig, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={(actionConfig as CreateTaskAction).priority || TaskPriority.Medium}
                onChange={(e) => setActionConfig({ ...actionConfig, priority: e.target.value })}
              >
                {Object.values(TaskPriority).map((priority) => (
                  <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        );

      case ActionType.AddLabel:
        return (
          <FormControl fullWidth required>
            <InputLabel>Label</InputLabel>
            <Select
              value={(actionConfig as AddLabelAction).labelId || ''}
              onChange={(e) => setActionConfig({ labelId: Number(e.target.value) })}
            >
              {labels.map((label) => (
                <MenuItem key={label.id} value={label.id}>{label.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case ActionType.SetDueDate:
        return (
          <TextField
            fullWidth
            type="number"
            label="Days from now"
            value={(actionConfig as SetDueDateAction).daysFromNow || ''}
            onChange={(e) => setActionConfig({ daysFromNow: Number(e.target.value) })}
            helperText="Number of days from trigger to set as due date"
          />
        );

      default:
        return (
          <Alert severity="info">
            This action type doesn't require additional configuration.
          </Alert>
        );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{rule ? 'Edit Automation Rule' : 'Create Automation Rule'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              fullWidth
              required
              label="Rule Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Notify assignee on completion"
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when this rule should trigger and what it does"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              }
              label="Active"
            />

            <Box>
              <Typography variant="h6" gutterBottom>Trigger</Typography>
              <Stack spacing={2}>
                <FormControl fullWidth required>
                  <InputLabel>When this happens...</InputLabel>
                  <Select
                    value={triggerType}
                    onChange={(e) => {
                      setTriggerType(e.target.value as TriggerType);
                      setTriggerConfig({}); // Reset config
                    }}
                  >
                    <MenuItem value={TriggerType.StatusChange}>Status changes</MenuItem>
                    <MenuItem value={TriggerType.PriorityChange}>Priority changes</MenuItem>
                    <MenuItem value={TriggerType.TaskCreated}>Task is created</MenuItem>
                    <MenuItem value={TriggerType.TaskAssigned}>Task is assigned</MenuItem>
                    <MenuItem value={TriggerType.LabelAdded}>Label is added</MenuItem>
                    <MenuItem value={TriggerType.CommentAdded}>Comment is added</MenuItem>
                    <MenuItem value={TriggerType.AttachmentAdded}>Attachment is added</MenuItem>
                  </Select>
                </FormControl>
                {renderTriggerConfig()}
              </Stack>
            </Box>

            <Box>
              <Typography variant="h6" gutterBottom>Action</Typography>
              <Stack spacing={2}>
                <FormControl fullWidth required>
                  <InputLabel>Then do this...</InputLabel>
                  <Select
                    value={actionType}
                    onChange={(e) => {
                      setActionType(e.target.value as ActionType);
                      setActionConfig({}); // Reset config
                    }}
                  >
                    <MenuItem value={ActionType.SendNotification}>Send notification</MenuItem>
                    <MenuItem value={ActionType.UpdateStatus}>Update status</MenuItem>
                    <MenuItem value={ActionType.UpdatePriority}>Update priority</MenuItem>
                    <MenuItem value={ActionType.AddComment}>Add comment</MenuItem>
                    <MenuItem value={ActionType.CreateTask}>Create new task</MenuItem>
                    <MenuItem value={ActionType.AddLabel}>Add label</MenuItem>
                    <MenuItem value={ActionType.SetDueDate}>Set due date</MenuItem>
                  </Select>
                </FormControl>
                {renderActionConfig()}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {rule ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutomationRuleEditor;
