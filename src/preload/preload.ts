import { contextBridge, ipcRenderer } from 'electron';

// Import types from main process models
import type { 
  Project, CreateProjectData, UpdateProjectData,
  Task, CreateTaskData, UpdateTaskData,
  Comment, CreateCommentData, UpdateCommentData,
  Label, CreateLabelData, UpdateLabelData,
  Attachment, CreateAttachmentData,
  CustomField, CreateCustomFieldData, UpdateCustomFieldData, TaskCustomValue,
  TaskDependency, CreateTaskDependencyData, TaskDependencyWithDetails,
  User, CreateUserData, UpdateUserData,
  Role, CreateRoleData, UpdateRoleData,
  Permission, CreatePermissionData,
  ProjectMember, CreateProjectMemberData, ProjectMemberWithDetails,
  Notification, CreateNotificationData, NotificationType,
  ProjectTemplate, CreateProjectTemplateData, UpdateProjectTemplateData, ProjectTemplateWithTasks,
  TaskTemplate, CreateTaskTemplateData, UpdateTaskTemplateData,
  TimeEntry, CreateTimeEntryData, UpdateTimeEntryData, TimeEntryWithDetails, TimeTrackingStats,
  AutomationRule, CreateAutomationRuleData, UpdateAutomationRuleData, AutomationRuleWithDetails,
  AutomationLog, TriggerType, ActionType,
  TaskStatusReport, TaskPriorityReport, ProjectProgressReport, UserWorkloadReport,
  TimeTrackingReport, TaskCompletionTrend, ProjectStatistics, UserStatistics, TimeStatistics,
  DateRange, ReportFilters,
  AppSettings,
  VisionBoard, VisionBoardNode, VisionBoardConnection, VisionBoardGroup,
  CreateVisionBoardData, UpdateVisionBoardData,
  CreateVisionBoardNodeData, UpdateVisionBoardNodeData,
  CreateVisionBoardConnectionData, UpdateVisionBoardConnectionData,
  CreateVisionBoardGroupData, UpdateVisionBoardGroupData,
  VisionBoardTemplate, VisionBoardType, VisionBoardStatus
} from '../main/models';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  
  // Test/Debug operations
  test: {
    database: () => ipcRenderer.invoke('test:database'),
  },

  // Project operations
  project: {
    create: (data: CreateProjectData) => ipcRenderer.invoke('project:create', data),
    findById: (id: number) => ipcRenderer.invoke('project:findById', id),
    findAll: () => ipcRenderer.invoke('project:findAll'),
    update: (id: number, data: UpdateProjectData) => ipcRenderer.invoke('project:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('project:delete', id),
  },

  // Task operations
  task: {
    create: (data: CreateTaskData) => ipcRenderer.invoke('task:create', data),
    findById: (id: number) => ipcRenderer.invoke('task:findById', id),
    findByProjectId: (projectId: number) => ipcRenderer.invoke('task:findByProjectId', projectId),
    update: (id: number, data: UpdateTaskData) => ipcRenderer.invoke('task:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('task:delete', id),
    addLabel: (taskId: number, labelId: number) => ipcRenderer.invoke('task:addLabel', taskId, labelId),
    removeLabel: (taskId: number, labelId: number) => ipcRenderer.invoke('task:removeLabel', taskId, labelId),
    getLabelIds: (taskId: number) => ipcRenderer.invoke('task:getLabelIds', taskId),
  },

  // Comment operations
  comment: {
    create: (data: CreateCommentData) => ipcRenderer.invoke('comment:create', data),
    findByTaskId: (taskId: number) => ipcRenderer.invoke('comment:findByTaskId', taskId),
    update: (id: number, data: UpdateCommentData) => ipcRenderer.invoke('comment:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('comment:delete', id),
  },

  // Label operations
  label: {
    create: (data: CreateLabelData) => ipcRenderer.invoke('label:create', data),
    findByProjectId: (projectId: number) => ipcRenderer.invoke('label:findByProjectId', projectId),
    findByTaskId: (taskId: number) => ipcRenderer.invoke('label:findByTaskId', taskId),
    update: (id: number, data: UpdateLabelData) => ipcRenderer.invoke('label:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('label:delete', id),
    addToTask: (taskId: number, labelId: number) => ipcRenderer.invoke('label:addToTask', taskId, labelId),
    removeFromTask: (taskId: number, labelId: number) => ipcRenderer.invoke('label:removeFromTask', taskId, labelId),
  },

  // Attachment operations
  attachment: {
    create: (data: CreateAttachmentData) => ipcRenderer.invoke('attachment:create', data),
    findByTaskId: (taskId: number) => ipcRenderer.invoke('attachment:findByTaskId', taskId),
    delete: (id: number) => ipcRenderer.invoke('attachment:delete', id),
  },

  // File operations
  file: {
    upload: (taskId: number) => ipcRenderer.invoke('file:upload', taskId),
    open: (attachmentId: number) => ipcRenderer.invoke('file:open', attachmentId),
    deleteWithCleanup: (attachmentId: number) => ipcRenderer.invoke('file:deleteWithCleanup', attachmentId),
  },

  // Custom field operations
  customField: {
    create: (data: CreateCustomFieldData) => ipcRenderer.invoke('customField:create', data),
    findByProjectId: (projectId: number) => ipcRenderer.invoke('customField:findByProjectId', projectId),
    update: (id: number, data: UpdateCustomFieldData) => ipcRenderer.invoke('customField:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('customField:delete', id),
    setTaskValue: (taskId: number, customFieldId: number, value: string) => 
      ipcRenderer.invoke('customField:setTaskValue', taskId, customFieldId, value),
    getTaskValue: (taskId: number, customFieldId: number) => 
      ipcRenderer.invoke('customField:getTaskValue', taskId, customFieldId),
    getTaskValues: (taskId: number) => ipcRenderer.invoke('customField:getTaskValues', taskId),
    deleteTaskValue: (taskId: number, customFieldId: number) =>
      ipcRenderer.invoke('customField:deleteTaskValue', taskId, customFieldId),
  },

  // Task dependency operations
  dependency: {
    create: (data: CreateTaskDependencyData) => ipcRenderer.invoke('dependency:create', data),
    findByTaskId: (taskId: number) => ipcRenderer.invoke('dependency:findByTaskId', taskId),
    findByProjectId: (projectId: number) => ipcRenderer.invoke('dependency:findByProjectId', projectId),
    findByTaskIdWithDetails: (taskId: number) => ipcRenderer.invoke('dependency:findByTaskIdWithDetails', taskId),
    findDependentTasks: (taskId: number) => ipcRenderer.invoke('dependency:findDependentTasks', taskId),
    findDependentTasksWithDetails: (taskId: number) => ipcRenderer.invoke('dependency:findDependentTasksWithDetails', taskId),
    delete: (id: number) => ipcRenderer.invoke('dependency:delete', id),
    deleteByTaskIds: (taskId: number, dependsOnTaskId: number) => 
      ipcRenderer.invoke('dependency:deleteByTaskIds', taskId, dependsOnTaskId),
    getBlockingTasks: (taskId: number) => ipcRenderer.invoke('dependency:getBlockingTasks', taskId),
    getBlockedTasks: (taskId: number) => ipcRenderer.invoke('dependency:getBlockedTasks', taskId),
    hasBlockingDependencies: (taskId: number) => ipcRenderer.invoke('dependency:hasBlockingDependencies', taskId),
  },

  // User operations
  user: {
    create: (data: CreateUserData) => ipcRenderer.invoke('user:create', data),
    findById: (id: number) => ipcRenderer.invoke('user:findById', id),
    findByUsername: (username: string) => ipcRenderer.invoke('user:findByUsername', username),
    findByEmail: (email: string) => ipcRenderer.invoke('user:findByEmail', email),
    findAll: () => ipcRenderer.invoke('user:findAll'),
    findActive: () => ipcRenderer.invoke('user:findActive'),
    update: (id: number, data: UpdateUserData) => ipcRenderer.invoke('user:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('user:delete', id),
  },

  // Role operations
  role: {
    create: (data: CreateRoleData) => ipcRenderer.invoke('role:create', data),
    findById: (id: number) => ipcRenderer.invoke('role:findById', id),
    findByName: (name: string) => ipcRenderer.invoke('role:findByName', name),
    findAll: () => ipcRenderer.invoke('role:findAll'),
    getPermissions: (roleId: number) => ipcRenderer.invoke('role:getPermissions', roleId),
    addPermission: (roleId: number, permissionId: number) => ipcRenderer.invoke('role:addPermission', roleId, permissionId),
    removePermission: (roleId: number, permissionId: number) => ipcRenderer.invoke('role:removePermission', roleId, permissionId),
    update: (id: number, data: UpdateRoleData) => ipcRenderer.invoke('role:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('role:delete', id),
  },

  // Permission operations
  permission: {
    create: (data: CreatePermissionData) => ipcRenderer.invoke('permission:create', data),
    findById: (id: number) => ipcRenderer.invoke('permission:findById', id),
    findByName: (name: string) => ipcRenderer.invoke('permission:findByName', name),
    findAll: () => ipcRenderer.invoke('permission:findAll'),
    findByResource: (resource: string) => ipcRenderer.invoke('permission:findByResource', resource),
    delete: (id: number) => ipcRenderer.invoke('permission:delete', id),
  },

  // Project member operations
  projectMember: {
    create: (data: CreateProjectMemberData) => ipcRenderer.invoke('projectMember:create', data),
    findById: (id: number) => ipcRenderer.invoke('projectMember:findById', id),
    findByProjectId: (projectId: number) => ipcRenderer.invoke('projectMember:findByProjectId', projectId),
    findByUserId: (userId: number) => ipcRenderer.invoke('projectMember:findByUserId', userId),
    findByIdWithDetails: (id: number) => ipcRenderer.invoke('projectMember:findByIdWithDetails', id),
    findByProjectIdWithDetails: (projectId: number) => ipcRenderer.invoke('projectMember:findByProjectIdWithDetails', projectId),
    getUserRole: (projectId: number, userId: number) => ipcRenderer.invoke('projectMember:getUserRole', projectId, userId),
    updateRole: (id: number, roleId: number) => ipcRenderer.invoke('projectMember:updateRole', id, roleId),
    delete: (id: number) => ipcRenderer.invoke('projectMember:delete', id),
    removeUserFromProject: (projectId: number, userId: number) => ipcRenderer.invoke('projectMember:removeUserFromProject', projectId, userId),
    isMember: (projectId: number, userId: number) => ipcRenderer.invoke('projectMember:isMember', projectId, userId),
  },

  // Notification operations
  notification: {
    create: (data: CreateNotificationData) => ipcRenderer.invoke('notification:create', data),
    createBulk: (notifications: CreateNotificationData[]) => ipcRenderer.invoke('notification:createBulk', notifications),
    findById: (id: number) => ipcRenderer.invoke('notification:findById', id),
    findByUserId: (userId: number, limit?: number) => ipcRenderer.invoke('notification:findByUserId', userId, limit),
    findUnreadByUserId: (userId: number, limit?: number) => ipcRenderer.invoke('notification:findUnreadByUserId', userId, limit),
    getUnreadCount: (userId: number) => ipcRenderer.invoke('notification:getUnreadCount', userId),
    markAsRead: (id: number) => ipcRenderer.invoke('notification:markAsRead', id),
    markAllAsRead: (userId: number) => ipcRenderer.invoke('notification:markAllAsRead', userId),
    markAsUnread: (id: number) => ipcRenderer.invoke('notification:markAsUnread', id),
    delete: (id: number) => ipcRenderer.invoke('notification:delete', id),
    deleteAllByUserId: (userId: number) => ipcRenderer.invoke('notification:deleteAllByUserId', userId),
    deleteOldReadNotifications: (daysOld: number) => ipcRenderer.invoke('notification:deleteOldReadNotifications', daysOld),
    findByType: (userId: number, type: NotificationType, limit?: number) => ipcRenderer.invoke('notification:findByType', userId, type, limit),
    findByProjectId: (userId: number, projectId: number, limit?: number) => ipcRenderer.invoke('notification:findByProjectId', userId, projectId, limit),
    findByTaskId: (userId: number, taskId: number, limit?: number) => ipcRenderer.invoke('notification:findByTaskId', userId, taskId, limit),
  },

  // Time entry operations
  timeEntry: {
    create: (data: CreateTimeEntryData) => ipcRenderer.invoke('timeEntry:create', data),
    findById: (id: number) => ipcRenderer.invoke('timeEntry:findById', id),
    findByTaskId: (taskId: number) => ipcRenderer.invoke('timeEntry:findByTaskId', taskId),
    findByUserId: (userId: number) => ipcRenderer.invoke('timeEntry:findByUserId', userId),
    findByTaskIdWithDetails: (taskId: number) => ipcRenderer.invoke('timeEntry:findByTaskIdWithDetails', taskId),
    findByUserIdWithDetails: (userId: number) => ipcRenderer.invoke('timeEntry:findByUserIdWithDetails', userId),
    findByDateRange: (startDate: string, endDate: string, userId?: number) => ipcRenderer.invoke('timeEntry:findByDateRange', startDate, endDate, userId),
    findActiveByUserId: (userId: number) => ipcRenderer.invoke('timeEntry:findActiveByUserId', userId),
    update: (id: number, data: UpdateTimeEntryData) => ipcRenderer.invoke('timeEntry:update', id, data),
    stop: (id: number, endTime?: string) => ipcRenderer.invoke('timeEntry:stop', id, endTime),
    delete: (id: number) => ipcRenderer.invoke('timeEntry:delete', id),
    getTaskStats: (taskId: number) => ipcRenderer.invoke('timeEntry:getTaskStats', taskId),
    getUserStats: (userId: number, startDate?: string, endDate?: string) => ipcRenderer.invoke('timeEntry:getUserStats', userId, startDate, endDate),
  },

  // Automation rule operations
  automationRule: {
    create: (data: CreateAutomationRuleData) => ipcRenderer.invoke('automationRule:create', data),
    findById: (id: number) => ipcRenderer.invoke('automationRule:findById', id),
    findAll: () => ipcRenderer.invoke('automationRule:findAll'),
    findByProjectId: (projectId: number) => ipcRenderer.invoke('automationRule:findByProjectId', projectId),
    findGlobalRules: () => ipcRenderer.invoke('automationRule:findGlobalRules'),
    findByIdWithDetails: (id: number) => ipcRenderer.invoke('automationRule:findByIdWithDetails', id),
    findAllWithDetails: () => ipcRenderer.invoke('automationRule:findAllWithDetails'),
    findByProjectIdWithDetails: (projectId: number) => ipcRenderer.invoke('automationRule:findByProjectIdWithDetails', projectId),
    update: (id: number, data: UpdateAutomationRuleData) => ipcRenderer.invoke('automationRule:update', id, data),
    toggleActive: (id: number) => ipcRenderer.invoke('automationRule:toggleActive', id),
    delete: (id: number) => ipcRenderer.invoke('automationRule:delete', id),
    findLogsByRuleId: (ruleId: number, limit?: number) => ipcRenderer.invoke('automationRule:findLogsByRuleId', ruleId, limit),
    findRecentLogs: (limit?: number) => ipcRenderer.invoke('automationRule:findRecentLogs', limit),
    getRuleStats: (ruleId: number) => ipcRenderer.invoke('automationRule:getRuleStats', ruleId),
  },

  // Analytics operations
  analytics: {
    getTaskStatusReport: (filters?: ReportFilters) => ipcRenderer.invoke('analytics:getTaskStatusReport', filters),
    getTaskPriorityReport: (filters?: ReportFilters) => ipcRenderer.invoke('analytics:getTaskPriorityReport', filters),
    getProjectProgressReport: (projectIds?: number[]) => ipcRenderer.invoke('analytics:getProjectProgressReport', projectIds),
    getUserWorkloadReport: (userIds?: number[]) => ipcRenderer.invoke('analytics:getUserWorkloadReport', userIds),
    getTimeTrackingReport: (dateRange?: DateRange, filters?: ReportFilters) => ipcRenderer.invoke('analytics:getTimeTrackingReport', dateRange, filters),
    getTaskCompletionTrend: (dateRange?: DateRange, projectId?: number) => ipcRenderer.invoke('analytics:getTaskCompletionTrend', dateRange, projectId),
    getProjectStatistics: () => ipcRenderer.invoke('analytics:getProjectStatistics'),
    getUserStatistics: () => ipcRenderer.invoke('analytics:getUserStatistics'),
    getTimeStatistics: (dateRange?: DateRange) => ipcRenderer.invoke('analytics:getTimeStatistics', dateRange),
  },

  // Settings operations
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    get: <K extends keyof AppSettings>(key: K) => ipcRenderer.invoke('settings:get', key),
    set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => ipcRenderer.invoke('settings:set', key, value),
    setMany: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:setMany', settings),
    reset: () => ipcRenderer.invoke('settings:reset'),
    resetSection: <K extends keyof AppSettings>(key: K) => ipcRenderer.invoke('settings:resetSection', key),
    export: () => ipcRenderer.invoke('settings:export'),
    import: (settingsJson: string) => ipcRenderer.invoke('settings:import', settingsJson),
  },

  // Project Template operations
  projectTemplate: {
    create: (data: CreateProjectTemplateData) => ipcRenderer.invoke('projectTemplate:create', data),
    findById: (id: number) => ipcRenderer.invoke('projectTemplate:findById', id),
    findByIdWithTasks: (id: number) => ipcRenderer.invoke('projectTemplate:findByIdWithTasks', id),
    findAll: () => ipcRenderer.invoke('projectTemplate:findAll'),
    findPublic: () => ipcRenderer.invoke('projectTemplate:findPublic'),
    findByCategory: (category: string) => ipcRenderer.invoke('projectTemplate:findByCategory', category),
    findByCreator: (userId: number) => ipcRenderer.invoke('projectTemplate:findByCreator', userId),
    update: (id: number, data: UpdateProjectTemplateData) => ipcRenderer.invoke('projectTemplate:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('projectTemplate:delete', id),
    duplicate: (id: number, newName?: string) => ipcRenderer.invoke('projectTemplate:duplicate', id, newName),
  },

  // Task Template operations
  taskTemplate: {
    create: (data: CreateTaskTemplateData) => ipcRenderer.invoke('taskTemplate:create', data),
    findById: (id: number) => ipcRenderer.invoke('taskTemplate:findById', id),
    findByProjectTemplateId: (projectTemplateId: number) => ipcRenderer.invoke('taskTemplate:findByProjectTemplateId', projectTemplateId),
    findStandalone: () => ipcRenderer.invoke('taskTemplate:findStandalone'),
    update: (id: number, data: UpdateTaskTemplateData) => ipcRenderer.invoke('taskTemplate:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('taskTemplate:delete', id),
    reorder: (taskIds: number[]) => ipcRenderer.invoke('taskTemplate:reorder', taskIds),
  },

  // Template Service operations
  template: {
    createProjectFromTemplate: (templateId: number, customName?: string, customDescription?: string) => 
      ipcRenderer.invoke('template:createProjectFromTemplate', templateId, customName, customDescription),
    createTaskFromTemplate: (templateId: number, projectId: number, customTitle?: string) => 
      ipcRenderer.invoke('template:createTaskFromTemplate', templateId, projectId, customTitle),
    saveProjectAsTemplate: (projectId: number, templateName: string, category?: string, isPublic = false, createdBy?: number) => 
      ipcRenderer.invoke('template:saveProjectAsTemplate', projectId, templateName, category, isPublic, createdBy),
    saveTaskAsTemplate: (taskId: number, templateName?: string) => 
      ipcRenderer.invoke('template:saveTaskAsTemplate', taskId, templateName),
  },

  // Vision Board operations
  visionBoard: {
    create: (data: CreateVisionBoardData, userId: number) => ipcRenderer.invoke('visionBoard:create', data, userId),
    createFromTemplate: (template: VisionBoardTemplate, name: string, userId: number, projectId?: number) => 
      ipcRenderer.invoke('visionBoard:createFromTemplate', template, name, userId, projectId),
    getById: (id: number) => ipcRenderer.invoke('visionBoard:getById', id),
    getAll: (filters?: { type?: VisionBoardType; status?: VisionBoardStatus; projectId?: number; createdBy?: number }) => 
      ipcRenderer.invoke('visionBoard:getAll', filters),
    getByProject: (projectId: number) => ipcRenderer.invoke('visionBoard:getByProject', projectId),
    update: (id: number, data: UpdateVisionBoardData) => ipcRenderer.invoke('visionBoard:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('visionBoard:delete', id),
    duplicate: (id: number, newName: string, userId: number) => ipcRenderer.invoke('visionBoard:duplicate', id, newName, userId),
    
    // Nodes
    createNode: (data: CreateVisionBoardNodeData) => ipcRenderer.invoke('visionBoard:createNode', data),
    getNode: (id: number) => ipcRenderer.invoke('visionBoard:getNode', id),
    getNodesByBoard: (boardId: number) => ipcRenderer.invoke('visionBoard:getNodesByBoard', boardId),
    updateNode: (id: number, data: UpdateVisionBoardNodeData) => ipcRenderer.invoke('visionBoard:updateNode', id, data),
    deleteNode: (id: number) => ipcRenderer.invoke('visionBoard:deleteNode', id),
    bulkUpdateNodePositions: (updates: Array<{ id: number; x: number; y: number }>) => 
      ipcRenderer.invoke('visionBoard:bulkUpdateNodePositions', updates),
    
    // Connections
    createConnection: (data: CreateVisionBoardConnectionData) => ipcRenderer.invoke('visionBoard:createConnection', data),
    getConnection: (id: number) => ipcRenderer.invoke('visionBoard:getConnection', id),
    getConnectionsByBoard: (boardId: number) => ipcRenderer.invoke('visionBoard:getConnectionsByBoard', boardId),
    updateConnection: (id: number, data: UpdateVisionBoardConnectionData) => 
      ipcRenderer.invoke('visionBoard:updateConnection', id, data),
    deleteConnection: (id: number) => ipcRenderer.invoke('visionBoard:deleteConnection', id),
    
    // Groups
    createGroup: (data: CreateVisionBoardGroupData) => ipcRenderer.invoke('visionBoard:createGroup', data),
    getGroup: (id: number) => ipcRenderer.invoke('visionBoard:getGroup', id),
    getGroupsByBoard: (boardId: number) => ipcRenderer.invoke('visionBoard:getGroupsByBoard', boardId),
    updateGroup: (id: number, data: UpdateVisionBoardGroupData) => ipcRenderer.invoke('visionBoard:updateGroup', id, data),
    deleteGroup: (id: number) => ipcRenderer.invoke('visionBoard:deleteGroup', id),
    
    // Helpers
    getBoardData: (boardId: number) => ipcRenderer.invoke('visionBoard:getBoardData', boardId),
    exportToJSON: (boardId: number) => ipcRenderer.invoke('visionBoard:exportToJSON', boardId),
    importFromJSON: (json: string, userId: number, newName?: string) => 
      ipcRenderer.invoke('visionBoard:importFromJSON', json, userId, newName),
  },
});


// Type definitions for TypeScript
export interface ElectronAPI {
  // Window controls
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  
  // Test/Debug operations
  test: {
    database: () => Promise<{ success: boolean; projectCount?: number; projects?: any[]; error?: string }>;
  };

  // Project operations
  project: {
    create: (data: CreateProjectData) => Promise<Project>;
    findById: (id: number) => Promise<Project | undefined>;
    findAll: () => Promise<Project[]>;
    update: (id: number, data: UpdateProjectData) => Promise<Project | undefined>;
    delete: (id: number) => Promise<boolean>;
  };

  // Task operations
  task: {
    create: (data: CreateTaskData) => Promise<Task>;
    findById: (id: number) => Promise<Task | undefined>;
    findByProjectId: (projectId: number) => Promise<Task[]>;
    update: (id: number, data: UpdateTaskData) => Promise<Task | undefined>;
    delete: (id: number) => Promise<boolean>;
    addLabel: (taskId: number, labelId: number) => Promise<void>;
    removeLabel: (taskId: number, labelId: number) => Promise<void>;
    getLabelIds: (taskId: number) => Promise<number[]>;
  };

  // Comment operations
  comment: {
    create: (data: CreateCommentData) => Promise<Comment>;
    findByTaskId: (taskId: number) => Promise<Comment[]>;
    update: (id: number, data: UpdateCommentData) => Promise<Comment | undefined>;
    delete: (id: number) => Promise<boolean>;
  };

  // Label operations
  label: {
    create: (data: CreateLabelData) => Promise<Label>;
    findByProjectId: (projectId: number) => Promise<Label[]>;
    findByTaskId: (taskId: number) => Promise<Label[]>;
    update: (id: number, data: UpdateLabelData) => Promise<Label | undefined>;
    delete: (id: number) => Promise<boolean>;
    addToTask: (taskId: number, labelId: number) => Promise<boolean>;
    removeFromTask: (taskId: number, labelId: number) => Promise<boolean>;
  };

  // Attachment operations
  attachment: {
    create: (data: CreateAttachmentData) => Promise<Attachment>;
    findByTaskId: (taskId: number) => Promise<Attachment[]>;
    delete: (id: number) => Promise<boolean>;
  };

  // File operations
  file: {
    upload: (taskId: number) => Promise<Attachment[]>;
    open: (attachmentId: number) => Promise<boolean>;
    deleteWithCleanup: (attachmentId: number) => Promise<boolean>;
  };

  // Custom field operations
  customField: {
    create: (data: CreateCustomFieldData) => Promise<CustomField>;
    findByProjectId: (projectId: number) => Promise<CustomField[]>;
    update: (id: number, data: UpdateCustomFieldData) => Promise<CustomField | undefined>;
    delete: (id: number) => Promise<boolean>;
    setTaskValue: (taskId: number, customFieldId: number, value: string) => Promise<void>;
    getTaskValue: (taskId: number, customFieldId: number) => Promise<string | undefined>;
    getTaskValues: (taskId: number) => Promise<TaskCustomValue[]>;
    deleteTaskValue: (taskId: number, customFieldId: number) => Promise<void>;
  };

  // Task dependency operations
  dependency: {
    create: (data: CreateTaskDependencyData) => Promise<TaskDependency>;
    findByTaskId: (taskId: number) => Promise<TaskDependency[]>;
    findByProjectId: (projectId: number) => Promise<TaskDependency[]>;
    findByTaskIdWithDetails: (taskId: number) => Promise<TaskDependencyWithDetails[]>;
    findDependentTasks: (taskId: number) => Promise<TaskDependency[]>;
    findDependentTasksWithDetails: (taskId: number) => Promise<TaskDependencyWithDetails[]>;
    delete: (id: number) => Promise<boolean>;
    deleteByTaskIds: (taskId: number, dependsOnTaskId: number) => Promise<boolean>;
    getBlockingTasks: (taskId: number) => Promise<number[]>;
    getBlockedTasks: (taskId: number) => Promise<number[]>;
    hasBlockingDependencies: (taskId: number) => Promise<boolean>;
  };

  // User operations
  user: {
    create: (data: CreateUserData) => Promise<User>;
    findById: (id: number) => Promise<User | undefined>;
    findByUsername: (username: string) => Promise<User | undefined>;
    findByEmail: (email: string) => Promise<User | undefined>;
    findAll: () => Promise<User[]>;
    findActive: () => Promise<User[]>;
    update: (id: number, data: UpdateUserData) => Promise<User | undefined>;
    delete: (id: number) => Promise<boolean>;
  };

  // Role operations
  role: {
    create: (data: CreateRoleData) => Promise<Role>;
    findById: (id: number) => Promise<Role | undefined>;
    findByName: (name: string) => Promise<Role | undefined>;
    findAll: () => Promise<Role[]>;
    getPermissions: (roleId: number) => Promise<Permission[]>;
    addPermission: (roleId: number, permissionId: number) => Promise<boolean>;
    removePermission: (roleId: number, permissionId: number) => Promise<boolean>;
    update: (id: number, data: UpdateRoleData) => Promise<Role | undefined>;
    delete: (id: number) => Promise<boolean>;
  };

  // Permission operations
  permission: {
    create: (data: CreatePermissionData) => Promise<Permission>;
    findById: (id: number) => Promise<Permission | undefined>;
    findByName: (name: string) => Promise<Permission | undefined>;
    findAll: () => Promise<Permission[]>;
    findByResource: (resource: string) => Promise<Permission[]>;
    delete: (id: number) => Promise<boolean>;
  };

  // Project member operations
  projectMember: {
    create: (data: CreateProjectMemberData) => Promise<ProjectMember>;
    findById: (id: number) => Promise<ProjectMember | undefined>;
    findByProjectId: (projectId: number) => Promise<ProjectMember[]>;
    findByUserId: (userId: number) => Promise<ProjectMember[]>;
    findByIdWithDetails: (id: number) => Promise<ProjectMemberWithDetails | undefined>;
    findByProjectIdWithDetails: (projectId: number) => Promise<ProjectMemberWithDetails[]>;
    getUserRole: (projectId: number, userId: number) => Promise<Role | undefined>;
    updateRole: (id: number, roleId: number) => Promise<ProjectMember | undefined>;
    delete: (id: number) => Promise<boolean>;
    removeUserFromProject: (projectId: number, userId: number) => Promise<boolean>;
    isMember: (projectId: number, userId: number) => Promise<boolean>;
  };

  // Notification operations
  notification: {
    create: (data: CreateNotificationData) => Promise<Notification>;
    createBulk: (notifications: CreateNotificationData[]) => Promise<Notification[]>;
    findById: (id: number) => Promise<Notification | undefined>;
    findByUserId: (userId: number, limit?: number) => Promise<Notification[]>;
    findUnreadByUserId: (userId: number, limit?: number) => Promise<Notification[]>;
    getUnreadCount: (userId: number) => Promise<number>;
    markAsRead: (id: number) => Promise<Notification>;
    markAllAsRead: (userId: number) => Promise<void>;
    markAsUnread: (id: number) => Promise<Notification>;
    delete: (id: number) => Promise<boolean>;
    deleteAllByUserId: (userId: number) => Promise<void>;
    deleteOldReadNotifications: (daysOld: number) => Promise<void>;
    findByType: (userId: number, type: NotificationType, limit?: number) => Promise<Notification[]>;
    findByProjectId: (userId: number, projectId: number, limit?: number) => Promise<Notification[]>;
    findByTaskId: (userId: number, taskId: number) => Promise<Notification[]>;
  };

  // Project Template operations
  projectTemplate: {
    create: (data: CreateProjectTemplateData) => Promise<ProjectTemplate>;
    findById: (id: number) => Promise<ProjectTemplate | undefined>;
    findByIdWithTasks: (id: number) => Promise<ProjectTemplateWithTasks | undefined>;
    findAll: () => Promise<ProjectTemplate[]>;
    findPublic: () => Promise<ProjectTemplate[]>;
    findByCategory: (category: string) => Promise<ProjectTemplate[]>;
    findByCreator: (userId: number) => Promise<ProjectTemplate[]>;
    update: (id: number, data: UpdateProjectTemplateData) => Promise<ProjectTemplate>;
    delete: (id: number) => Promise<boolean>;
    duplicate: (id: number, newName?: string) => Promise<ProjectTemplate>;
  };

  // Task Template operations
  taskTemplate: {
    create: (data: CreateTaskTemplateData) => Promise<TaskTemplate>;
    findById: (id: number) => Promise<TaskTemplate | undefined>;
    findByProjectTemplateId: (projectTemplateId: number) => Promise<TaskTemplate[]>;
    findStandalone: () => Promise<TaskTemplate[]>;
    update: (id: number, data: UpdateTaskTemplateData) => Promise<TaskTemplate>;
    delete: (id: number) => Promise<boolean>;
    reorder: (taskIds: number[]) => Promise<void>;
  };

  // Template Service operations
  template: {
    createProjectFromTemplate: (templateId: number, customName?: string, customDescription?: string) => Promise<Project>;
    createTaskFromTemplate: (templateId: number, projectId: number, customTitle?: string) => Promise<Task>;
    saveProjectAsTemplate: (projectId: number, templateName: string, category?: string, isPublic?: boolean, createdBy?: number) => Promise<number>;
    saveTaskAsTemplate: (taskId: number, templateName?: string) => Promise<number>;
  };

  // Time entry operations
  timeEntry: {
    create: (data: CreateTimeEntryData) => Promise<TimeEntry>;
    findById: (id: number) => Promise<TimeEntry | undefined>;
    findByTaskId: (taskId: number) => Promise<TimeEntry[]>;
    findByUserId: (userId: number) => Promise<TimeEntry[]>;
    findByTaskIdWithDetails: (taskId: number) => Promise<TimeEntryWithDetails[]>;
    findByUserIdWithDetails: (userId: number) => Promise<TimeEntryWithDetails[]>;
    findByDateRange: (startDate: string, endDate: string, userId?: number) => Promise<TimeEntry[]>;
    findActiveByUserId: (userId: number) => Promise<TimeEntry | undefined>;
    update: (id: number, data: UpdateTimeEntryData) => Promise<TimeEntry | undefined>;
    stop: (id: number, endTime?: string) => Promise<TimeEntry | undefined>;
    delete: (id: number) => Promise<boolean>;
    getTaskStats: (taskId: number) => Promise<TimeTrackingStats>;
    getUserStats: (userId: number, startDate?: string, endDate?: string) => Promise<TimeTrackingStats>;
  };

  // Automation rule operations
  automationRule: {
    create: (data: CreateAutomationRuleData) => Promise<AutomationRule>;
    findById: (id: number) => Promise<AutomationRule | undefined>;
    findAll: () => Promise<AutomationRule[]>;
    findByProjectId: (projectId: number) => Promise<AutomationRule[]>;
    findGlobalRules: () => Promise<AutomationRule[]>;
    findByIdWithDetails: (id: number) => Promise<AutomationRuleWithDetails | undefined>;
    findAllWithDetails: () => Promise<AutomationRuleWithDetails[]>;
    findByProjectIdWithDetails: (projectId: number) => Promise<AutomationRuleWithDetails[]>;
    update: (id: number, data: UpdateAutomationRuleData) => Promise<AutomationRule | undefined>;
    toggleActive: (id: number) => Promise<AutomationRule | undefined>;
    delete: (id: number) => Promise<boolean>;
    findLogsByRuleId: (ruleId: number, limit?: number) => Promise<AutomationLog[]>;
    findRecentLogs: (limit?: number) => Promise<AutomationLog[]>;
    getRuleStats: (ruleId: number) => Promise<{
      totalExecutions: number;
      successCount: number;
      errorCount: number;
      skippedCount: number;
      lastExecutedAt: string | null;
    }>;
  };

  // Analytics operations
  analytics: {
    getTaskStatusReport: (filters?: ReportFilters) => Promise<TaskStatusReport[]>;
    getTaskPriorityReport: (filters?: ReportFilters) => Promise<TaskPriorityReport[]>;
    getProjectProgressReport: (projectIds?: number[]) => Promise<ProjectProgressReport[]>;
    getUserWorkloadReport: (userIds?: number[]) => Promise<UserWorkloadReport[]>;
    getTimeTrackingReport: (dateRange?: DateRange, filters?: ReportFilters) => Promise<TimeTrackingReport[]>;
    getTaskCompletionTrend: (dateRange?: DateRange, projectId?: number) => Promise<TaskCompletionTrend[]>;
    getProjectStatistics: () => Promise<ProjectStatistics>;
    getUserStatistics: () => Promise<UserStatistics>;
    getTimeStatistics: (dateRange?: DateRange) => Promise<TimeStatistics>;
  };

  // Settings operations
  settings: {
    getAll: () => Promise<AppSettings>;
    get: <K extends keyof AppSettings>(key: K) => Promise<AppSettings[K]>;
    set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<AppSettings>;
    setMany: (settings: Partial<AppSettings>) => Promise<AppSettings>;
    reset: () => Promise<AppSettings>;
    resetSection: <K extends keyof AppSettings>(key: K) => Promise<AppSettings>;
    export: () => Promise<string>;
    import: (settingsJson: string) => Promise<AppSettings>;
  };

  // Vision Board operations
  visionBoard: {
    create: (data: CreateVisionBoardData, userId: number) => Promise<VisionBoard>;
    createFromTemplate: (template: VisionBoardTemplate, name: string, userId: number, projectId?: number) => 
      Promise<{ board: VisionBoard; nodes: VisionBoardNode[]; connections: VisionBoardConnection[] }>;
    getById: (id: number) => Promise<VisionBoard | null>;
    getAll: (filters?: { type?: VisionBoardType; status?: VisionBoardStatus; projectId?: number; createdBy?: number }) => 
      Promise<VisionBoard[]>;
    getByProject: (projectId: number) => Promise<VisionBoard[]>;
    update: (id: number, data: UpdateVisionBoardData) => Promise<VisionBoard | null>;
    delete: (id: number) => Promise<boolean>;
    duplicate: (id: number, newName: string, userId: number) => Promise<VisionBoard | null>;
    
    // Nodes
    createNode: (data: CreateVisionBoardNodeData) => Promise<VisionBoardNode>;
    getNode: (id: number) => Promise<VisionBoardNode | null>;
    getNodesByBoard: (boardId: number) => Promise<VisionBoardNode[]>;
    updateNode: (id: number, data: UpdateVisionBoardNodeData) => Promise<VisionBoardNode | null>;
    deleteNode: (id: number) => Promise<boolean>;
    bulkUpdateNodePositions: (updates: Array<{ id: number; x: number; y: number }>) => Promise<void>;
    
    // Connections
    createConnection: (data: CreateVisionBoardConnectionData) => Promise<VisionBoardConnection>;
    getConnection: (id: number) => Promise<VisionBoardConnection | null>;
    getConnectionsByBoard: (boardId: number) => Promise<VisionBoardConnection[]>;
    updateConnection: (id: number, data: UpdateVisionBoardConnectionData) => Promise<VisionBoardConnection | null>;
    deleteConnection: (id: number) => Promise<boolean>;
    
    // Groups
    createGroup: (data: CreateVisionBoardGroupData) => Promise<VisionBoardGroup>;
    getGroup: (id: number) => Promise<VisionBoardGroup | null>;
    getGroupsByBoard: (boardId: number) => Promise<VisionBoardGroup[]>;
    updateGroup: (id: number, data: UpdateVisionBoardGroupData) => Promise<VisionBoardGroup | null>;
    deleteGroup: (id: number) => Promise<boolean>;
    
    // Helpers
    getBoardData: (boardId: number) => Promise<{
      board: VisionBoard;
      nodes: VisionBoardNode[];
      connections: VisionBoardConnection[];
      groups: VisionBoardGroup[];
    } | null>;
    exportToJSON: (boardId: number) => Promise<string | null>;
    importFromJSON: (json: string, userId: number, newName?: string) => Promise<VisionBoard | null>;
  };
}
