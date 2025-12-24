import Database from 'better-sqlite3';
import {
  AutomationRule,
  TriggerType,
  ActionType,
  TriggerConfig,
  ActionConfig,
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
  SetDueDateAction
} from '../models/AutomationRule';
import { AutomationRuleRepository } from '../repositories/AutomationRuleRepository';
import { TaskRepository } from '../repositories/TaskRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { CommentRepository } from '../repositories/CommentRepository';
import { LabelRepository } from '../repositories/LabelRepository';
import { Task, TaskStatus, TaskPriority } from '../models/Task';
import { NotificationType } from '../models/Notification';

/**
 * Automation engine for executing automation rules
 */
export class AutomationEngine {
  constructor(
    private db: Database.Database,
    private automationRepo: AutomationRuleRepository,
    private taskRepo: TaskRepository,
    private notificationRepo: NotificationRepository,
    private commentRepo: CommentRepository,
    private labelRepo: LabelRepository
  ) {}

  /**
   * Execute automation rules for a specific trigger
   */
  async executeRulesForTrigger(
    triggerType: TriggerType,
    triggerData: Record<string, any>,
    projectId?: number
  ): Promise<void> {
    const rules = this.automationRepo.findActiveByTriggerType(triggerType, projectId);
    
    for (const rule of rules) {
      try {
        // Check if trigger conditions match
        if (this.evaluateTrigger(rule, triggerData)) {
          // Execute the action
          await this.executeAction(rule, triggerData);
          
          // Record successful execution
          this.automationRepo.recordExecution(rule.id);
          this.automationRepo.createLog({
            ruleId: rule.id,
            triggerData,
            actionData: rule.actionConfig,
            status: 'success'
          });
        } else {
          // Record skipped execution
          this.automationRepo.createLog({
            ruleId: rule.id,
            triggerData,
            actionData: rule.actionConfig,
            status: 'skipped'
          });
        }
      } catch (error) {
        // Record error
        this.automationRepo.createLog({
          ruleId: rule.id,
          triggerData,
          actionData: rule.actionConfig,
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`Error executing automation rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Evaluate if trigger conditions match
   */
  private evaluateTrigger(rule: AutomationRule, triggerData: Record<string, any>): boolean {
    switch (rule.triggerType) {
      case TriggerType.StatusChange:
        return this.evaluateStatusChangeTrigger(rule.triggerConfig as StatusChangeTrigger, triggerData);
      
      case TriggerType.FieldUpdate:
        return this.evaluateFieldUpdateTrigger(rule.triggerConfig as FieldUpdateTrigger, triggerData);
      
      case TriggerType.PriorityChange:
        return this.evaluatePriorityChangeTrigger(rule.triggerConfig as PriorityChangeTrigger, triggerData);
      
      case TriggerType.LabelAdded:
        return this.evaluateLabelAddedTrigger(rule.triggerConfig as LabelAddedTrigger, triggerData);
      
      case TriggerType.TaskCreated:
      case TriggerType.TaskAssigned:
      case TriggerType.CommentAdded:
      case TriggerType.AttachmentAdded:
        // These triggers don't need additional condition checking
        return true;
      
      default:
        return false;
    }
  }

  private evaluateStatusChangeTrigger(config: StatusChangeTrigger, data: Record<string, any>): boolean {
    if (config.fromStatus && data.oldStatus !== config.fromStatus) {
      return false;
    }
    return data.newStatus === config.toStatus;
  }

  private evaluateFieldUpdateTrigger(config: FieldUpdateTrigger, data: Record<string, any>): boolean {
    if (data.fieldName !== config.fieldName) {
      return false;
    }
    if (config.oldValue !== undefined && data.oldValue !== config.oldValue) {
      return false;
    }
    if (config.newValue !== undefined && data.newValue !== config.newValue) {
      return false;
    }
    return true;
  }

  private evaluatePriorityChangeTrigger(config: PriorityChangeTrigger, data: Record<string, any>): boolean {
    if (config.fromPriority && data.oldPriority !== config.fromPriority) {
      return false;
    }
    return data.newPriority === config.toPriority;
  }

  private evaluateLabelAddedTrigger(config: LabelAddedTrigger, data: Record<string, any>): boolean {
    if (config.labelId && data.labelId !== config.labelId) {
      return false;
    }
    if (config.labelName && data.labelName !== config.labelName) {
      return false;
    }
    return true;
  }

  /**
   * Execute automation action
   */
  private async executeAction(rule: AutomationRule, triggerData: Record<string, any>): Promise<void> {
    switch (rule.actionType) {
      case ActionType.UpdateField:
        await this.executeUpdateFieldAction(rule.actionConfig as UpdateFieldAction, triggerData);
        break;
      
      case ActionType.SendNotification:
        await this.executeSendNotificationAction(rule.actionConfig as SendNotificationAction, triggerData);
        break;
      
      case ActionType.CreateTask:
        await this.executeCreateTaskAction(rule.actionConfig as CreateTaskAction, triggerData);
        break;
      
      case ActionType.AssignUser:
        await this.executeAssignUserAction(rule.actionConfig as AssignUserAction, triggerData);
        break;
      
      case ActionType.AddLabel:
        await this.executeAddLabelAction(rule.actionConfig as AddLabelAction, triggerData);
        break;
      
      case ActionType.AddComment:
        await this.executeAddCommentAction(rule.actionConfig as AddCommentAction, triggerData);
        break;
      
      case ActionType.UpdateStatus:
        await this.executeUpdateStatusAction(rule.actionConfig as UpdateStatusAction, triggerData);
        break;
      
      case ActionType.UpdatePriority:
        await this.executeUpdatePriorityAction(rule.actionConfig as UpdatePriorityAction, triggerData);
        break;
      
      case ActionType.SetDueDate:
        await this.executeSetDueDateAction(rule.actionConfig as SetDueDateAction, triggerData);
        break;
    }
  }

  private async executeUpdateFieldAction(config: UpdateFieldAction, data: Record<string, any>): Promise<void> {
    if (!data.taskId) return;
    
    const updateData: any = {};
    updateData[config.fieldName] = config.value;
    
    this.taskRepo.update(data.taskId, updateData);
  }

  private async executeSendNotificationAction(config: SendNotificationAction, data: Record<string, any>): Promise<void> {
    let userIds: number[] = [];
    
    if (config.userId) {
      userIds = [config.userId];
    } else if (config.userRole) {
      // Determine users based on role
      if (config.userRole === 'assignee' && data.assignedTo) {
        userIds = [data.assignedTo];
      } else if (config.userRole === 'creator' && data.createdBy) {
        userIds = [data.createdBy];
      }
      // Add project_members logic here if needed
    }
    
    // Create notification for each user
    for (const userId of userIds) {
      this.notificationRepo.create({
        userId,
        type: NotificationType.System,
        title: config.title,
        message: config.message,
        relatedProjectId: data.projectId,
        relatedTaskId: data.taskId
      });
    }
  }

  private async executeCreateTaskAction(config: CreateTaskAction, data: Record<string, any>): Promise<void> {
    const projectId = config.projectId || data.projectId;
    if (!projectId) return;
    
    this.taskRepo.create({
      projectId,
      title: config.title,
      description: config.description,
      status: (config.status as TaskStatus) || TaskStatus.Todo,
      priority: (config.priority as TaskPriority) || TaskPriority.Medium,
      assignedTo: config.assignedTo ? String(config.assignedTo) : undefined
    });
  }

  private async executeAssignUserAction(config: AssignUserAction, data: Record<string, any>): Promise<void> {
    if (!data.taskId) return;
    
    this.taskRepo.update(data.taskId, {
      assignedTo: String(config.userId)
    });
  }

  private async executeAddLabelAction(config: AddLabelAction, data: Record<string, any>): Promise<void> {
    if (!data.taskId) return;
    
    // Add label to task (this would use task_labels junction table)
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO task_labels (task_id, label_id)
      VALUES (?, ?)
    `);
    stmt.run(data.taskId, config.labelId);
  }

  private async executeAddCommentAction(config: AddCommentAction, data: Record<string, any>): Promise<void> {
    if (!data.taskId) return;
    
    this.commentRepo.create({
      taskId: data.taskId,
      content: config.content,
      author: config.author ? String(config.author) : '1' // System user
    });
  }

  private async executeUpdateStatusAction(config: UpdateStatusAction, data: Record<string, any>): Promise<void> {
    if (!data.taskId) return;
    
    this.taskRepo.update(data.taskId, {
      status: config.status as TaskStatus
    });
  }

  private async executeUpdatePriorityAction(config: UpdatePriorityAction, data: Record<string, any>): Promise<void> {
    if (!data.taskId) return;
    
    this.taskRepo.update(data.taskId, {
      priority: config.priority as TaskPriority
    });
  }

  private async executeSetDueDateAction(config: SetDueDateAction, data: Record<string, any>): Promise<void> {
    if (!data.taskId) return;
    
    let dueDate: string;
    
    if (config.specificDate) {
      dueDate = config.specificDate;
    } else if (config.daysFromNow) {
      const date = new Date();
      date.setDate(date.getDate() + config.daysFromNow);
      dueDate = date.toISOString().split('T')[0];
    } else {
      return;
    }
    
    this.taskRepo.update(data.taskId, {
      dueDate
    });
  }

  /**
   * Helper method to trigger automation on task status change
   */
  async onTaskStatusChange(taskId: number, oldStatus: TaskStatus, newStatus: TaskStatus): Promise<void> {
    const task = this.taskRepo.findById(taskId);
    if (!task) return;
    
    await this.executeRulesForTrigger(
      TriggerType.StatusChange,
      {
        taskId,
        projectId: task.projectId,
        oldStatus,
        newStatus,
        assignedTo: task.assignedTo,
        createdBy: 1 // Would need to track this
      },
      task.projectId
    );
  }

  /**
   * Helper method to trigger automation on task priority change
   */
  async onTaskPriorityChange(taskId: number, oldPriority: TaskPriority, newPriority: TaskPriority): Promise<void> {
    const task = this.taskRepo.findById(taskId);
    if (!task) return;
    
    await this.executeRulesForTrigger(
      TriggerType.PriorityChange,
      {
        taskId,
        projectId: task.projectId,
        oldPriority,
        newPriority,
        assignedTo: task.assignedTo
      },
      task.projectId
    );
  }

  /**
   * Helper method to trigger automation on task creation
   */
  async onTaskCreated(taskId: number): Promise<void> {
    const task = this.taskRepo.findById(taskId);
    if (!task) return;
    
    await this.executeRulesForTrigger(
      TriggerType.TaskCreated,
      {
        taskId,
        projectId: task.projectId,
        assignedTo: task.assignedTo
      },
      task.projectId
    );
  }

  /**
   * Helper method to trigger automation on task assignment
   */
  async onTaskAssigned(taskId: number, userId: number): Promise<void> {
    const task = this.taskRepo.findById(taskId);
    if (!task) return;
    
    await this.executeRulesForTrigger(
      TriggerType.TaskAssigned,
      {
        taskId,
        projectId: task.projectId,
        assignedTo: userId
      },
      task.projectId
    );
  }

  /**
   * Helper method to trigger automation on label added
   */
  async onLabelAdded(taskId: number, labelId: number): Promise<void> {
    const task = this.taskRepo.findById(taskId);
    if (!task) return;
    
    const label = this.labelRepo.findById(labelId);
    
    await this.executeRulesForTrigger(
      TriggerType.LabelAdded,
      {
        taskId,
        projectId: task.projectId,
        labelId,
        labelName: label?.name
      },
      task.projectId
    );
  }

  /**
   * Helper method to trigger automation on comment added
   */
  async onCommentAdded(taskId: number, commentId: number): Promise<void> {
    const task = this.taskRepo.findById(taskId);
    if (!task) return;
    
    await this.executeRulesForTrigger(
      TriggerType.CommentAdded,
      {
        taskId,
        projectId: task.projectId,
        commentId
      },
      task.projectId
    );
  }

  /**
   * Helper method to trigger automation on attachment added
   */
  async onAttachmentAdded(taskId: number, attachmentId: number): Promise<void> {
    const task = this.taskRepo.findById(taskId);
    if (!task) return;
    
    await this.executeRulesForTrigger(
      TriggerType.AttachmentAdded,
      {
        taskId,
        projectId: task.projectId,
        attachmentId
      },
      task.projectId
    );
  }
}
