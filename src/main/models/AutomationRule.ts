/**
 * Automation rule model and related types
 */

export interface AutomationRule {
  id: number;
  name: string;
  description: string | null;
  projectId: number | null;
  isActive: boolean;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  actionType: ActionType;
  actionConfig: ActionConfig;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt: string | null;
  executionCount: number;
}

export interface CreateAutomationRuleData {
  name: string;
  description?: string;
  projectId?: number;
  isActive?: boolean;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  actionType: ActionType;
  actionConfig: ActionConfig;
  createdBy: number;
}

export interface UpdateAutomationRuleData {
  name?: string;
  description?: string;
  isActive?: boolean;
  triggerType?: TriggerType;
  triggerConfig?: TriggerConfig;
  actionType?: ActionType;
  actionConfig?: ActionConfig;
}

// Trigger types
export enum TriggerType {
  StatusChange = 'status_change',
  FieldUpdate = 'field_update',
  TaskCreated = 'task_created',
  TaskAssigned = 'task_assigned',
  DueDateApproaching = 'due_date_approaching',
  DateBased = 'date_based',
  PriorityChange = 'priority_change',
  LabelAdded = 'label_added',
  CommentAdded = 'comment_added',
  AttachmentAdded = 'attachment_added'
}

// Action types
export enum ActionType {
  UpdateField = 'update_field',
  SendNotification = 'send_notification',
  CreateTask = 'create_task',
  AssignUser = 'assign_user',
  AddLabel = 'add_label',
  AddComment = 'add_comment',
  UpdateStatus = 'update_status',
  UpdatePriority = 'update_priority',
  SetDueDate = 'set_due_date'
}

// Trigger configuration types
export interface StatusChangeTrigger {
  fromStatus?: string;
  toStatus: string;
}

export interface FieldUpdateTrigger {
  fieldName: string;
  oldValue?: any;
  newValue?: any;
}

export interface DueDateApproachingTrigger {
  daysBefore: number;
}

export interface DateBasedTrigger {
  schedule: string; // cron-like format
  timeZone: string;
}

export interface PriorityChangeTrigger {
  fromPriority?: string;
  toPriority: string;
}

export interface LabelAddedTrigger {
  labelId?: number;
  labelName?: string;
}

export type TriggerConfig = 
  | StatusChangeTrigger 
  | FieldUpdateTrigger 
  | DueDateApproachingTrigger 
  | DateBasedTrigger
  | PriorityChangeTrigger
  | LabelAddedTrigger
  | Record<string, any>;

// Action configuration types
export interface UpdateFieldAction {
  fieldName: string;
  value: any;
}

export interface SendNotificationAction {
  userId?: number;
  userRole?: string; // 'assignee', 'creator', 'project_members'
  title: string;
  message: string;
}

export interface CreateTaskAction {
  title: string;
  description?: string;
  projectId?: number; // null means same project
  status?: string;
  priority?: string;
  assignedTo?: number;
}

export interface AssignUserAction {
  userId: number;
}

export interface AddLabelAction {
  labelId: number;
}

export interface AddCommentAction {
  content: string;
  author?: number; // null means system comment
}

export interface UpdateStatusAction {
  status: string;
}

export interface UpdatePriorityAction {
  priority: string;
}

export interface SetDueDateAction {
  daysFromNow?: number;
  specificDate?: string;
}

export type ActionConfig = 
  | UpdateFieldAction 
  | SendNotificationAction 
  | CreateTaskAction 
  | AssignUserAction
  | AddLabelAction
  | AddCommentAction
  | UpdateStatusAction
  | UpdatePriorityAction
  | SetDueDateAction
  | Record<string, any>;

// Automation execution log
export interface AutomationLog {
  id: number;
  ruleId: number;
  triggerData: Record<string, any>;
  actionData: Record<string, any>;
  status: 'success' | 'error' | 'skipped';
  errorMessage: string | null;
  executedAt: string;
}

export interface CreateAutomationLogData {
  ruleId: number;
  triggerData: Record<string, any>;
  actionData: Record<string, any>;
  status: 'success' | 'error' | 'skipped';
  errorMessage?: string;
}

// Extended automation rule with project details
export interface AutomationRuleWithDetails extends AutomationRule {
  projectName: string | null;
  creatorName: string | null;
}
