import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getDatabase } from './database/Database';
import { ProjectRepository } from './repositories/ProjectRepository';
import { TaskRepository } from './repositories/TaskRepository';
import { CommentRepository } from './repositories/CommentRepository';
import { LabelRepository } from './repositories/LabelRepository';
import { AttachmentRepository } from './repositories/AttachmentRepository';
import { CustomFieldRepository } from './repositories/CustomFieldRepository';
import { TaskDependencyRepository } from './repositories/TaskDependencyRepository';
import { UserRepository } from './repositories/UserRepository';
import { RoleRepository } from './repositories/RoleRepository';
import { PermissionRepository } from './repositories/PermissionRepository';
import { ProjectMemberRepository } from './repositories/ProjectMemberRepository';
import { NotificationRepository } from './repositories/NotificationRepository';
import { ProjectTemplateRepository } from './repositories/ProjectTemplateRepository';
import { TaskTemplateRepository } from './repositories/TaskTemplateRepository';
import { TimeEntryRepository } from './repositories/TimeEntryRepository';
import { AutomationRuleRepository } from './repositories/AutomationRuleRepository';
import { TemplateService } from './services/TemplateService';
import { AutomationEngine } from './services/AutomationEngine';
import { AnalyticsService } from './services/AnalyticsService';
import { SettingsManager } from './services/SettingsManager';
import { SecurityManager } from './services/SecurityManager';
import { AuditLogger } from './services/AuditLogger';
import { AdminManager } from './services/AdminManager';
import { IntegrationManager } from './services/IntegrationManager';
import { WhiteLabelManager } from './services/WhiteLabelManager';
import { ComplianceManager } from './services/ComplianceManager';
import { VisionBoardManager } from './services/VisionBoardManager';
import { ApiServer } from './ApiServer';
import { seedDatabase } from './utils/seed';
import { seedRolesAndPermissions } from './utils/seedRolesAndPermissions';
import { seedDefaultUser } from './utils/seedUser';
import './utils/seed'; // Import to register IPC handlers

let mainWindow: BrowserWindow | null = null;
let apiServer: ApiServer | null = null;
let settingsManager: SettingsManager;
let securityManager: SecurityManager;
let auditLogger: AuditLogger;
let adminManager: AdminManager;
let integrationManager: IntegrationManager;
let whiteLabelManager: WhiteLabelManager;
let complianceManager: ComplianceManager;
let visionBoardManager: VisionBoardManager;

// Helper function to validate numeric IPC parameters
function validateId(id: any, paramName = 'ID'): number {
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid ${paramName}: must be a positive integer`);
  }
  return id;
}

// Initialize database and repositories
const database = getDatabase();
let projectRepo: ProjectRepository;
let taskRepo: TaskRepository;
let commentRepo: CommentRepository;
let labelRepo: LabelRepository;
let attachmentRepo: AttachmentRepository;
let customFieldRepo: CustomFieldRepository;
let dependencyRepo: TaskDependencyRepository;
let userRepo: UserRepository;
let roleRepo: RoleRepository;
let permissionRepo: PermissionRepository;
let projectMemberRepo: ProjectMemberRepository;
let notificationRepo: NotificationRepository;
let projectTemplateRepo: ProjectTemplateRepository;
let taskTemplateRepo: TaskTemplateRepository;
let timeEntryRepo: TimeEntryRepository;
let automationRuleRepo: AutomationRuleRepository;
let templateService: TemplateService;
let automationEngine: AutomationEngine;
let analyticsService: AnalyticsService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hidden',
    frame: false,
  });

  // Load the renderer HTML file directly
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize database
  console.log('Initializing DevTrack database...');
  database.initialize();

  // Create repository instances
  const db = database.getDb();
  projectRepo = new ProjectRepository(db);
  taskRepo = new TaskRepository(db);
  commentRepo = new CommentRepository(db);
  labelRepo = new LabelRepository(db);
  attachmentRepo = new AttachmentRepository(db);
  customFieldRepo = new CustomFieldRepository(db);
  dependencyRepo = new TaskDependencyRepository(db);
  userRepo = new UserRepository(db);
  roleRepo = new RoleRepository(db);
  permissionRepo = new PermissionRepository(db);
  projectMemberRepo = new ProjectMemberRepository(db);
  notificationRepo = new NotificationRepository(db);
  projectTemplateRepo = new ProjectTemplateRepository(db);
  taskTemplateRepo = new TaskTemplateRepository(db);
  timeEntryRepo = new TimeEntryRepository(db);
  automationRuleRepo = new AutomationRuleRepository(db);
  templateService = new TemplateService(db);
  automationEngine = new AutomationEngine(db, automationRuleRepo, taskRepo, notificationRepo, commentRepo, labelRepo);
  analyticsService = new AnalyticsService(db);
  settingsManager = new SettingsManager();
  securityManager = new SecurityManager(db);
  auditLogger = new AuditLogger(db);
  adminManager = new AdminManager(db);
  integrationManager = new IntegrationManager(db);
  whiteLabelManager = new WhiteLabelManager(db);
  complianceManager = new ComplianceManager(db);
  visionBoardManager = new VisionBoardManager(db);
  visionBoardManager.initializeTables(); // Initialize vision board tables after main database

  console.log('Database initialized successfully');
  console.log('Security manager initialized');
  console.log('Audit logger initialized');
  console.log('Admin manager initialized');
  console.log('Integration manager initialized');
  console.log('White label manager initialized');
  console.log('Compliance manager initialized');

  // Seed roles and permissions on first run
  seedRolesAndPermissions(db);

  // Seed default user on first run
  seedDefaultUser(db);

  // Seed database with sample data on first run
  const projects = projectRepo.findAll();
  if (projects.length === 0) {
    // seedDatabase(); // Disabled to allow for empty database
  }

  // Start REST API server if enabled
  const enableApi = process.env.ENABLE_API === 'true';
  if (enableApi) {
    apiServer = new ApiServer(db);
    apiServer.start();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  database.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  database.close();
});

// Window control handlers
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

// Project IPC handlers
ipcMain.handle('project:create', async (_, data) => {
  return projectRepo.create(data);
});

ipcMain.handle('project:findById', async (_, id: number) => {
  validateId(id, 'Project ID');
  return projectRepo.findById(id);
});

ipcMain.handle('project:findAll', async () => {
  return projectRepo.findAll();
});

ipcMain.handle('project:update', async (_, id: number, data) => {
  validateId(id, 'Project ID');
  return projectRepo.update(id, data);
});

ipcMain.handle('project:delete', async (_, id: number) => {
  validateId(id, 'Project ID');
  return projectRepo.delete(id);
});

// Task IPC handlers
ipcMain.handle('task:create', async (_, data) => {
  return taskRepo.create(data);
});

ipcMain.handle('task:findById', async (_, id: number) => {
  validateId(id, 'Task ID');
  return taskRepo.findById(id);
});

ipcMain.handle('task:findByProjectId', async (_, projectId: number) => {
  validateId(projectId, 'Project ID');
  return taskRepo.findByProjectId(projectId);
});

ipcMain.handle('task:update', async (_, id: number, data) => {
  validateId(id, 'Task ID');
  return taskRepo.update(id, data);
});

ipcMain.handle('task:delete', async (_, id: number) => {
  validateId(id, 'Task ID');
  return taskRepo.delete(id);
});

ipcMain.handle('task:addLabel', async (_, taskId: number, labelId: number) => {
  validateId(taskId, 'Task ID');
  validateId(labelId, 'Label ID');
  taskRepo.addLabel(taskId, labelId);
});

ipcMain.handle('task:removeLabel', async (_, taskId: number, labelId: number) => {
  validateId(taskId, 'Task ID');
  validateId(labelId, 'Label ID');
  taskRepo.removeLabel(taskId, labelId);
});

ipcMain.handle('task:getLabelIds', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return taskRepo.getLabelIds(taskId);
});

// Comment IPC handlers
ipcMain.handle('comment:create', async (_, data) => {
  return commentRepo.create(data);
});

ipcMain.handle('comment:findByTaskId', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return commentRepo.findByTaskId(taskId);
});

ipcMain.handle('comment:update', async (_, id: number, data) => {
  validateId(id, 'Comment ID');
  return commentRepo.update(id, data);
});

ipcMain.handle('comment:delete', async (_, id: number) => {
  validateId(id, 'Comment ID');
  return commentRepo.delete(id);
});

// Label IPC handlers
ipcMain.handle('label:create', async (_, data) => {
  return labelRepo.create(data);
});

ipcMain.handle('label:findByProjectId', async (_, projectId: number) => {
  validateId(projectId, 'Project ID');
  return labelRepo.findByProjectId(projectId);
});

ipcMain.handle('label:update', async (_, id: number, data) => {
  validateId(id, 'Label ID');
  return labelRepo.update(id, data);
});

ipcMain.handle('label:delete', async (_, id: number) => {
  validateId(id, 'Label ID');
  return labelRepo.delete(id);
});

ipcMain.handle('label:addToTask', async (_, taskId: number, labelId: number) => {
  validateId(taskId, 'Task ID');
  validateId(labelId, 'Label ID');
  return labelRepo.addToTask(taskId, labelId);
});

ipcMain.handle('label:removeFromTask', async (_, taskId: number, labelId: number) => {
  validateId(taskId, 'Task ID');
  validateId(labelId, 'Label ID');
  return labelRepo.removeFromTask(taskId, labelId);
});

ipcMain.handle('label:findByTaskId', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return labelRepo.findByTaskId(taskId);
});

// Attachment IPC handlers
ipcMain.handle('attachment:create', async (_, data) => {
  return attachmentRepo.create(data);
});

ipcMain.handle('attachment:findByTaskId', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return attachmentRepo.findByTaskId(taskId);
});

ipcMain.handle('attachment:delete', async (_, id: number) => {
  validateId(id, 'Attachment ID');
  return attachmentRepo.delete(id);
});

// File upload handler
ipcMain.handle('file:upload', async (_, taskId: number) => {
  // Validate task ID
  validateId(taskId, 'Task ID');

  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'md'] },
      { name: 'Archives', extensions: ['zip', 'tar', 'gz', 'rar'] },
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return [];
  }

  // Create attachments directory in userData (atomic operation with try-catch)
  const userDataPath = app.getPath('userData');
  const attachmentsDir = path.join(userDataPath, 'attachments');
  try {
    fs.mkdirSync(attachmentsDir, { recursive: true });
  } catch (error: any) {
    // Ignore error if directory already exists
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }

  const attachments = [];
  const failedUploads: Array<{ filePath: string; error: string }> = [];

  for (const filePath of result.filePaths) {
    try {
      // Get original filename and sanitize it
      const fileName = path.basename(filePath);

      // Sanitize filename: remove/replace unsafe characters
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      if (sanitizedName.length === 0 || sanitizedName === '.' || sanitizedName === '..') {
        throw new Error('Invalid filename');
      }

      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;

      // Enforce file size limit (100MB)
      if (fileSize > 100 * 1024 * 1024) {
        throw new Error('File size exceeds 100MB limit');
      }

      // Generate unique filename using crypto to avoid timestamp collisions
      const crypto = require('crypto');
      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}-${randomSuffix}-${sanitizedName}`;
      const destPath = path.join(attachmentsDir, uniqueFileName);

      // Security check: verify destination path is within attachments directory
      const realDestPath = path.resolve(destPath);
      const realAttachmentsDir = path.resolve(attachmentsDir);
      if (!realDestPath.startsWith(realAttachmentsDir + path.sep)) {
        throw new Error('Invalid destination path - potential path traversal attack');
      }

      // Copy file to attachments directory
      fs.copyFileSync(filePath, destPath);

      // Get mime type (simple detection based on extension)
      const ext = path.extname(sanitizedName).toLowerCase();
      let mimeType = 'application/octet-stream';
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
        '.pdf': 'application/pdf', '.txt': 'text/plain', '.md': 'text/markdown',
        '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.zip': 'application/zip', '.tar': 'application/x-tar', '.gz': 'application/gzip',
      };
      if (mimeTypes[ext]) {
        mimeType = mimeTypes[ext];
      }

      // Create attachment record
      const attachment = attachmentRepo.create({
        taskId,
        fileName: sanitizedName,
        filePath: destPath,
        fileSize,
        mimeType,
        uploadedBy: 'You', // TODO: Use actual user when auth is implemented
      });

      attachments.push(attachment);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to upload file:', filePath, errorMessage);
      failedUploads.push({ filePath, error: errorMessage });
    }
  }

  // Log warning if some uploads failed
  if (failedUploads.length > 0) {
    console.warn(`${failedUploads.length} file(s) failed to upload:`, failedUploads);
  }

  return attachments;
});

// File download/open handler
ipcMain.handle('file:open', async (_, attachmentId: number) => {
  validateId(attachmentId, 'Attachment ID');
  const attachment = attachmentRepo.findById(attachmentId);
  if (!attachment) {
    throw new Error('Attachment not found');
  }

  if (!fs.existsSync(attachment.filePath)) {
    throw new Error('File not found on disk');
  }

  // Open file with default application
  const { shell } = require('electron');
  await shell.openPath(attachment.filePath);
  return true;
});

// File delete with cleanup handler
ipcMain.handle('file:deleteWithCleanup', async (_, attachmentId: number) => {
  validateId(attachmentId, 'Attachment ID');
  const attachment = attachmentRepo.findById(attachmentId);
  if (!attachment) {
    return false;
  }

  // Delete file from disk
  try {
    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
    }
  } catch (error) {
    console.error('Failed to delete file from disk:', error);
  }

  // Delete database record
  return attachmentRepo.delete(attachmentId);
});

// Custom Field IPC handlers
ipcMain.handle('customField:create', async (_, data) => {
  return customFieldRepo.create(data);
});

ipcMain.handle('customField:findByProjectId', async (_, projectId: number) => {
  validateId(projectId, 'Project ID');
  return customFieldRepo.findByProjectId(projectId);
});

ipcMain.handle('customField:update', async (_, id: number, data) => {
  validateId(id, 'Custom Field ID');
  return customFieldRepo.update(id, data);
});

ipcMain.handle('customField:delete', async (_, id: number) => {
  validateId(id, 'Custom Field ID');
  return customFieldRepo.delete(id);
});

ipcMain.handle('customField:setTaskValue', async (_, taskId: number, customFieldId: number, value: string) => {
  validateId(taskId, 'Task ID');
  validateId(customFieldId, 'Custom Field ID');
  customFieldRepo.setTaskValue(taskId, customFieldId, value);
});

ipcMain.handle('customField:getTaskValue', async (_, taskId: number, customFieldId: number) => {
  validateId(taskId, 'Task ID');
  validateId(customFieldId, 'Custom Field ID');
  return customFieldRepo.getTaskValue(taskId, customFieldId);
});

ipcMain.handle('customField:getTaskValues', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return customFieldRepo.getTaskValues(taskId);
});

ipcMain.handle('customField:deleteTaskValue', async (_, taskId: number, customFieldId: number) => {
  validateId(taskId, 'Task ID');
  validateId(customFieldId, 'Custom Field ID');
  return customFieldRepo.deleteTaskValue(taskId, customFieldId);
});

// ============================================================================
// Task Dependency IPC Handlers
// ============================================================================

ipcMain.handle('dependency:create', async (_, data) => {
  return dependencyRepo.create(data);
});

ipcMain.handle('dependency:findByTaskId', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return dependencyRepo.findByTaskId(taskId);
});

ipcMain.handle('dependency:findByProjectId', async (_, projectId: number) => {
  validateId(projectId, 'Project ID');
  return dependencyRepo.findByProjectId(projectId);
});

ipcMain.handle('dependency:findByTaskIdWithDetails', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return dependencyRepo.findByTaskIdWithDetails(taskId);
});

ipcMain.handle('dependency:findDependentTasks', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return dependencyRepo.findDependentTasks(taskId);
});

ipcMain.handle('dependency:findDependentTasksWithDetails', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return dependencyRepo.findDependentTasksWithDetails(taskId);
});

ipcMain.handle('dependency:delete', async (_, id: number) => {
  validateId(id, 'Dependency ID');
  return dependencyRepo.delete(id);
});

// ============================================================================
// User IPC Handlers
// ============================================================================

ipcMain.handle('user:create', async (_, data) => {
  return userRepo.create(data);
});

ipcMain.handle('user:findById', async (_, id: number) => {
  validateId(id, 'User ID');
  return userRepo.findById(id);
});

ipcMain.handle('user:findByUsername', async (_, username: string) => {
  return userRepo.findByUsername(username);
});

ipcMain.handle('user:findByEmail', async (_, email: string) => {
  return userRepo.findByEmail(email);
});

ipcMain.handle('user:findAll', async () => {
  return userRepo.findAll();
});

ipcMain.handle('user:findActive', async () => {
  return userRepo.findActive();
});

ipcMain.handle('user:update', async (_, id: number, data) => {
  validateId(id, 'User ID');
  return userRepo.update(id, data);
});

ipcMain.handle('user:delete', async (_, id: number) => {
  validateId(id, 'User ID');
  return userRepo.delete(id);
});

// ============================================================================
// Role IPC Handlers
// ============================================================================

ipcMain.handle('role:create', async (_, data) => {
  return roleRepo.create(data);
});

ipcMain.handle('role:findById', async (_, id: number) => {
  validateId(id, 'Role ID');
  return roleRepo.findById(id);
});

ipcMain.handle('role:findByName', async (_, name: string) => {
  return roleRepo.findByName(name);
});

ipcMain.handle('role:findAll', async () => {
  return roleRepo.findAll();
});

ipcMain.handle('role:getPermissions', async (_, roleId: number) => {
  validateId(roleId, 'Role ID');
  return roleRepo.getPermissions(roleId);
});

ipcMain.handle('role:addPermission', async (_, roleId: number, permissionId: number) => {
  validateId(roleId, 'Role ID');
  validateId(permissionId, 'Permission ID');
  return roleRepo.addPermission(roleId, permissionId);
});

ipcMain.handle('role:removePermission', async (_, roleId: number, permissionId: number) => {
  validateId(roleId, 'Role ID');
  validateId(permissionId, 'Permission ID');
  return roleRepo.removePermission(roleId, permissionId);
});

ipcMain.handle('role:update', async (_, id: number, data) => {
  validateId(id, 'Role ID');
  return roleRepo.update(id, data);
});

ipcMain.handle('role:delete', async (_, id: number) => {
  validateId(id, 'Role ID');
  return roleRepo.delete(id);
});

// ============================================================================
// Permission IPC Handlers
// ============================================================================

ipcMain.handle('permission:create', async (_, data) => {
  return permissionRepo.create(data);
});

ipcMain.handle('permission:findById', async (_, id: number) => {
  validateId(id, 'Permission ID');
  return permissionRepo.findById(id);
});

ipcMain.handle('permission:findByName', async (_, name: string) => {
  return permissionRepo.findByName(name);
});

ipcMain.handle('permission:findAll', async () => {
  return permissionRepo.findAll();
});

ipcMain.handle('permission:findByResource', async (_, resource: string) => {
  return permissionRepo.findByResource(resource);
});

ipcMain.handle('permission:delete', async (_, id: number) => {
  validateId(id, 'Permission ID');
  return permissionRepo.delete(id);
});

// ============================================================================
// Project Member IPC Handlers
// ============================================================================

ipcMain.handle('projectMember:create', async (_, data) => {
  return projectMemberRepo.create(data);
});

ipcMain.handle('projectMember:findById', async (_, id: number) => {
  validateId(id, 'Project Member ID');
  return projectMemberRepo.findById(id);
});

ipcMain.handle('projectMember:findByProjectId', async (_, projectId: number) => {
  validateId(projectId, 'Project ID');
  return projectMemberRepo.findByProjectId(projectId);
});

ipcMain.handle('projectMember:findByUserId', async (_, userId: number) => {
  validateId(userId, 'User ID');
  return projectMemberRepo.findByUserId(userId);
});

ipcMain.handle('projectMember:findByIdWithDetails', async (_, id: number) => {
  validateId(id, 'Project Member ID');
  return projectMemberRepo.findByIdWithDetails(id);
});

ipcMain.handle('projectMember:findByProjectIdWithDetails', async (_, projectId: number) => {
  validateId(projectId, 'Project ID');
  return projectMemberRepo.findByProjectIdWithDetails(projectId);
});

ipcMain.handle('projectMember:getUserRole', async (_, projectId: number, userId: number) => {
  validateId(projectId, 'Project ID');
  validateId(userId, 'User ID');
  return projectMemberRepo.getUserRole(projectId, userId);
});

ipcMain.handle('projectMember:updateRole', async (_, id: number, roleId: number) => {
  validateId(id, 'Project Member ID');
  validateId(roleId, 'Role ID');
  return projectMemberRepo.updateRole(id, roleId);
});

ipcMain.handle('projectMember:delete', async (_, id: number) => {
  validateId(id, 'Project Member ID');
  return projectMemberRepo.delete(id);
});

ipcMain.handle('projectMember:removeUserFromProject', async (_, projectId: number, userId: number) => {
  validateId(projectId, 'Project ID');
  validateId(userId, 'User ID');
  return projectMemberRepo.removeUserFromProject(projectId, userId);
});

ipcMain.handle('projectMember:isMember', async (_, projectId: number, userId: number) => {
  validateId(projectId, 'Project ID');
  validateId(userId, 'User ID');
  return projectMemberRepo.isMember(projectId, userId);
});


ipcMain.handle('dependency:deleteByTaskIds', async (_, taskId: number, dependsOnTaskId: number) => {
  validateId(taskId, 'Task ID');
  validateId(dependsOnTaskId, 'Depends On Task ID');
  return dependencyRepo.deleteByTaskIds(taskId, dependsOnTaskId);
});

ipcMain.handle('dependency:getBlockingTasks', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return dependencyRepo.getBlockingTasks(taskId);
});

ipcMain.handle('dependency:getBlockedTasks', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return dependencyRepo.getBlockedTasks(taskId);
});

ipcMain.handle('dependency:hasBlockingDependencies', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return dependencyRepo.hasBlockingDependencies(taskId);
});

// ============================================================================
// Notification IPC Handlers
// ============================================================================

ipcMain.handle('notification:create', async (_, data) => {
  return notificationRepo.create(data);
});

ipcMain.handle('notification:createBulk', async (_, notifications) => {
  return notificationRepo.createBulk(notifications);
});

ipcMain.handle('notification:findById', async (_, id: number) => {
  validateId(id, 'Notification ID');
  return notificationRepo.findById(id);
});

ipcMain.handle('notification:findByUserId', async (_, userId: number, limit?: number) => {
  validateId(userId, 'User ID');
  return notificationRepo.findByUserId(userId, limit);
});

ipcMain.handle('notification:findUnreadByUserId', async (_, userId: number, limit?: number) => {
  validateId(userId, 'User ID');
  return notificationRepo.findUnreadByUserId(userId, limit);
});

ipcMain.handle('notification:getUnreadCount', async (_, userId: number) => {
  validateId(userId, 'User ID');
  return notificationRepo.getUnreadCount(userId);
});

ipcMain.handle('notification:markAsRead', async (_, id: number) => {
  validateId(id, 'Notification ID');
  return notificationRepo.markAsRead(id);
});

ipcMain.handle('notification:markAllAsRead', async (_, userId: number) => {
  validateId(userId, 'User ID');
  return notificationRepo.markAllAsRead(userId);
});

ipcMain.handle('notification:markAsUnread', async (_, id: number) => {
  validateId(id, 'Notification ID');
  return notificationRepo.markAsUnread(id);
});

ipcMain.handle('notification:delete', async (_, id: number) => {
  validateId(id, 'Notification ID');
  return notificationRepo.delete(id);
});

ipcMain.handle('notification:deleteAllByUserId', async (_, userId: number) => {
  validateId(userId, 'User ID');
  return notificationRepo.deleteAllByUserId(userId);
});

ipcMain.handle('notification:deleteOldReadNotifications', async (_, daysOld: number) => {
  return notificationRepo.deleteOldReadNotifications(daysOld);
});

ipcMain.handle('notification:findByType', async (_, userId: number, type: string, limit?: number) => {
  validateId(userId, 'User ID');
  return notificationRepo.findByType(userId, type as any, limit);
});

ipcMain.handle('notification:findByProjectId', async (_, userId: number, projectId: number, limit?: number) => {
  validateId(userId, 'User ID');
  validateId(projectId, 'Project ID');
  return notificationRepo.findByProjectId(userId, projectId, limit);
});

ipcMain.handle('notification:findByTaskId', async (_, userId: number, taskId: number, limit?: number) => {
  validateId(userId, 'User ID');
  validateId(taskId, 'Task ID');
  return notificationRepo.findByTaskId(userId, taskId, limit);
});

// Project Template IPC Handlers
ipcMain.handle('projectTemplate:create', async (_, data) => {
  return projectTemplateRepo.create(data);
});

ipcMain.handle('projectTemplate:findById', async (_, id: number) => {
  validateId(id, 'Project Template ID');
  return projectTemplateRepo.findById(id);
});

ipcMain.handle('projectTemplate:findByIdWithTasks', async (_, id: number) => {
  validateId(id, 'Project Template ID');
  return projectTemplateRepo.findByIdWithTasks(id);
});

ipcMain.handle('projectTemplate:findAll', async () => {
  return projectTemplateRepo.findAll();
});

ipcMain.handle('projectTemplate:findPublic', async () => {
  return projectTemplateRepo.findPublic();
});

ipcMain.handle('projectTemplate:findByCategory', async (_, category: string) => {
  return projectTemplateRepo.findByCategory(category);
});

ipcMain.handle('projectTemplate:findByCreator', async (_, userId: number) => {
  validateId(userId, 'User ID');
  return projectTemplateRepo.findByCreator(userId);
});

ipcMain.handle('projectTemplate:update', async (_, id: number, data) => {
  validateId(id, 'Project Template ID');
  return projectTemplateRepo.update(id, data);
});

ipcMain.handle('projectTemplate:delete', async (_, id: number) => {
  validateId(id, 'Project Template ID');
  return projectTemplateRepo.delete(id);
});

ipcMain.handle('projectTemplate:duplicate', async (_, id: number, newName?: string) => {
  validateId(id, 'Project Template ID');
  return projectTemplateRepo.duplicate(id, newName);
});

// Task Template IPC Handlers
ipcMain.handle('taskTemplate:create', async (_, data) => {
  return taskTemplateRepo.create(data);
});

ipcMain.handle('taskTemplate:findById', async (_, id: number) => {
  validateId(id, 'Task Template ID');
  return taskTemplateRepo.findById(id);
});

ipcMain.handle('taskTemplate:findByProjectTemplateId', async (_, projectTemplateId: number) => {
  validateId(projectTemplateId, 'Project Template ID');
  return taskTemplateRepo.findByProjectTemplateId(projectTemplateId);
});

ipcMain.handle('taskTemplate:findStandalone', async () => {
  return taskTemplateRepo.findStandalone();
});

ipcMain.handle('taskTemplate:update', async (_, id: number, data) => {
  validateId(id, 'Task Template ID');
  return taskTemplateRepo.update(id, data);
});

ipcMain.handle('taskTemplate:delete', async (_, id: number) => {
  validateId(id, 'Task Template ID');
  return taskTemplateRepo.delete(id);
});

ipcMain.handle('taskTemplate:reorder', async (_, taskIds: number[]) => {
  return taskTemplateRepo.reorder(taskIds);
});

// Template Service IPC Handlers
ipcMain.handle('template:createProjectFromTemplate', async (_, templateId: number, customName?: string, customDescription?: string) => {
  validateId(templateId, 'Template ID');
  return templateService.createProjectFromTemplate(templateId, customName, customDescription);
});

ipcMain.handle('template:createTaskFromTemplate', async (_, templateId: number, projectId: number, customTitle?: string) => {
  validateId(templateId, 'Template ID');
  validateId(projectId, 'Project ID');
  return templateService.createTaskFromTemplate(templateId, projectId, customTitle);
});

ipcMain.handle('template:saveProjectAsTemplate', async (_, projectId: number, templateName: string, category?: string, isPublic = false, createdBy?: number) => {
  validateId(projectId, 'Project ID');
  if (createdBy !== undefined) {
    validateId(createdBy, 'Created By User ID');
  }
  return templateService.saveProjectAsTemplate(projectId, templateName, category, isPublic, createdBy);
});

ipcMain.handle('template:saveTaskAsTemplate', async (_, taskId: number, templateName?: string) => {
  validateId(taskId, 'Task ID');
  return templateService.saveTaskAsTemplate(taskId, templateName);
});

// ============================================================================
// Time Entry IPC Handlers
// ============================================================================

ipcMain.handle('timeEntry:create', async (_, data) => {
  return timeEntryRepo.create(data);
});

ipcMain.handle('timeEntry:findById', async (_, id: number) => {
  validateId(id, 'Time Entry ID');
  return timeEntryRepo.findById(id);
});

ipcMain.handle('timeEntry:findByTaskId', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return timeEntryRepo.findByTaskId(taskId);
});

ipcMain.handle('timeEntry:findByUserId', async (_, userId: number) => {
  validateId(userId, 'User ID');
  return timeEntryRepo.findByUserId(userId);
});

ipcMain.handle('timeEntry:findByTaskIdWithDetails', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return timeEntryRepo.findByTaskIdWithDetails(taskId);
});

ipcMain.handle('timeEntry:findByUserIdWithDetails', async (_, userId: number) => {
  validateId(userId, 'User ID');
  return timeEntryRepo.findByUserIdWithDetails(userId);
});

ipcMain.handle('timeEntry:findByDateRange', async (_, startDate: string, endDate: string, userId?: number) => {
  if (userId !== undefined) {
    validateId(userId, 'User ID');
  }
  return timeEntryRepo.findByDateRange(startDate, endDate, userId);
});

ipcMain.handle('timeEntry:findActiveByUserId', async (_, userId: number) => {
  validateId(userId, 'User ID');
  return timeEntryRepo.findActiveByUserId(userId);
});

ipcMain.handle('timeEntry:update', async (_, id: number, data) => {
  validateId(id, 'Time Entry ID');
  return timeEntryRepo.update(id, data);
});

ipcMain.handle('timeEntry:stop', async (_, id: number, endTime?: string) => {
  validateId(id, 'Time Entry ID');
  return timeEntryRepo.stop(id, endTime);
});

ipcMain.handle('timeEntry:delete', async (_, id: number) => {
  validateId(id, 'Time Entry ID');
  return timeEntryRepo.delete(id);
});

ipcMain.handle('timeEntry:getTaskStats', async (_, taskId: number) => {
  validateId(taskId, 'Task ID');
  return timeEntryRepo.getTaskStats(taskId);
});

ipcMain.handle('timeEntry:getUserStats', async (_, userId: number, startDate?: string, endDate?: string) => {
  validateId(userId, 'User ID');
  return timeEntryRepo.getUserStats(userId, startDate, endDate);
});

// ===== AUTOMATION RULE IPC HANDLERS =====

ipcMain.handle('automationRule:create', async (_, data) => {
  return automationRuleRepo.create(data);
});

ipcMain.handle('automationRule:findById', async (_, id: number) => {
  validateId(id, 'Automation Rule ID');
  return automationRuleRepo.findById(id);
});

ipcMain.handle('automationRule:findAll', async () => {
  return automationRuleRepo.findAll();
});

ipcMain.handle('automationRule:findByProjectId', async (_, projectId: number) => {
  validateId(projectId, 'Project ID');
  return automationRuleRepo.findByProjectId(projectId);
});

ipcMain.handle('automationRule:findGlobalRules', async () => {
  return automationRuleRepo.findGlobalRules();
});

ipcMain.handle('automationRule:findByIdWithDetails', async (_, id: number) => {
  validateId(id, 'Automation Rule ID');
  return automationRuleRepo.findByIdWithDetails(id);
});

ipcMain.handle('automationRule:findAllWithDetails', async () => {
  return automationRuleRepo.findAllWithDetails();
});

ipcMain.handle('automationRule:findByProjectIdWithDetails', async (_, projectId: number) => {
  validateId(projectId, 'Project ID');
  return automationRuleRepo.findByProjectIdWithDetails(projectId);
});

ipcMain.handle('automationRule:update', async (_, id: number, data) => {
  validateId(id, 'Automation Rule ID');
  return automationRuleRepo.update(id, data);
});

ipcMain.handle('automationRule:toggleActive', async (_, id: number) => {
  validateId(id, 'Automation Rule ID');
  return automationRuleRepo.toggleActive(id);
});

ipcMain.handle('automationRule:delete', async (_, id: number) => {
  validateId(id, 'Automation Rule ID');
  return automationRuleRepo.delete(id);
});

ipcMain.handle('automationRule:findLogsByRuleId', async (_, ruleId: number, limit?: number) => {
  validateId(ruleId, 'Automation Rule ID');
  return automationRuleRepo.findLogsByRuleId(ruleId, limit);
});

ipcMain.handle('automationRule:findRecentLogs', async (_, limit?: number) => {
  return automationRuleRepo.findRecentLogs(limit);
});

ipcMain.handle('automationRule:getRuleStats', async (_, ruleId: number) => {
  validateId(ruleId, 'Automation Rule ID');
  return automationRuleRepo.getRuleStats(ruleId);
});

// ===== ANALYTICS IPC HANDLERS =====

ipcMain.handle('analytics:getTaskStatusReport', async (_, filters) => {
  return analyticsService.getTaskStatusReport(filters);
});

ipcMain.handle('analytics:getTaskPriorityReport', async (_, filters) => {
  return analyticsService.getTaskPriorityReport(filters);
});

ipcMain.handle('analytics:getProjectProgressReport', async (_, projectIds) => {
  return analyticsService.getProjectProgressReport(projectIds);
});

ipcMain.handle('analytics:getUserWorkloadReport', async (_, userIds) => {
  return analyticsService.getUserWorkloadReport(userIds);
});

ipcMain.handle('analytics:getTimeTrackingReport', async (_, dateRange, filters) => {
  return analyticsService.getTimeTrackingReport(dateRange, filters);
});

ipcMain.handle('analytics:getTaskCompletionTrend', async (_, dateRange, projectId) => {
  return analyticsService.getTaskCompletionTrend(dateRange, projectId);
});

ipcMain.handle('analytics:getProjectStatistics', async () => {
  return analyticsService.getProjectStatistics();
});

ipcMain.handle('analytics:getUserStatistics', async () => {
  return analyticsService.getUserStatistics();
});

ipcMain.handle('analytics:getTimeStatistics', async (_, dateRange) => {
  return analyticsService.getTimeStatistics(dateRange);
});

// Settings handlers
ipcMain.handle('settings:getAll', async () => {
  return settingsManager.getAll();
});

ipcMain.handle('settings:get', async (_, key) => {
  return settingsManager.get(key);
});

ipcMain.handle('settings:set', async (_, key, value) => {
  settingsManager.set(key, value);
  return settingsManager.getAll();
});

ipcMain.handle('settings:setMany', async (_, settings) => {
  settingsManager.setMany(settings);
  return settingsManager.getAll();
});

ipcMain.handle('settings:reset', async () => {
  settingsManager.reset();
  return settingsManager.getAll();
});

ipcMain.handle('settings:resetSection', async (_, key) => {
  settingsManager.resetSection(key);
  return settingsManager.getAll();
});

ipcMain.handle('settings:export', async () => {
  return settingsManager.export();
});

ipcMain.handle('settings:import', async (_, settingsJson) => {
  settingsManager.import(settingsJson);
  return settingsManager.getAll();
});

// ==================== Security IPC Handlers ====================

ipcMain.handle('security:setPassword', async (_, userId, password) => {
  await securityManager.setPassword(userId, password);
});

ipcMain.handle('security:verifyPassword', async (_, userId, password) => {
  return await securityManager.verifyPassword(userId, password);
});

ipcMain.handle('security:getPasswordPolicy', async () => {
  return securityManager.getPasswordPolicy();
});

ipcMain.handle('security:getSecurityEvents', async (_, filters) => {
  return securityManager.getSecurityEvents(filters);
});

ipcMain.handle('security:generateAPIKey', async (_, userId, name, scopes) => {
  return securityManager.generateAPIKey(userId, name, scopes);
});

ipcMain.handle('security:verifyAPIKey', async (_, key) => {
  return securityManager.verifyAPIKey(key);
});

ipcMain.handle('security:revokeAPIKey', async (_, keyId, revokedBy) => {
  securityManager.revokeAPIKey(keyId, revokedBy);
});

ipcMain.handle('security:cleanupExpiredSessions', async () => {
  return securityManager.cleanupExpiredSessions();
});

ipcMain.handle('security:cleanupOldSecurityEvents', async (_, retentionDays) => {
  return securityManager.cleanupOldSecurityEvents(retentionDays);
});

// ==================== Audit Log IPC Handlers ====================

ipcMain.handle('audit:log', async (_, entry) => {
  auditLogger.log(entry);
});

ipcMain.handle('audit:logAction', async (_, action, description, options) => {
  auditLogger.logAction(action, description, options);
});

ipcMain.handle('audit:logChange', async (_, action, entityType, entityId, entityName, changes, options) => {
  auditLogger.logChange(action, entityType, entityId, entityName, changes, options);
});

ipcMain.handle('audit:query', async (_, filters) => {
  return auditLogger.query(filters);
});

ipcMain.handle('audit:getById', async (_, id) => {
  validateId(id, 'Audit Log ID');
  return auditLogger.getById(id);
});

ipcMain.handle('audit:getEntityHistory', async (_, entityType, entityId, limit) => {
  validateId(entityId, 'Entity ID');
  return auditLogger.getEntityHistory(entityType, entityId, limit);
});

ipcMain.handle('audit:getUserActivity', async (_, userId, limit) => {
  validateId(userId, 'User ID');
  return auditLogger.getUserActivity(userId, limit);
});

ipcMain.handle('audit:generateReport', async (_, filters) => {
  return auditLogger.generateReport(filters);
});

ipcMain.handle('audit:generateComplianceReport', async (_, period) => {
  return auditLogger.generateComplianceReport(period);
});

ipcMain.handle('audit:deleteOldLogs', async (_, retentionDays) => {
  return auditLogger.deleteOldLogs(retentionDays);
});

ipcMain.handle('audit:exportToJson', async (_, filters) => {
  return auditLogger.exportToJson(filters);
});

ipcMain.handle('audit:exportToCsv', async (_, filters) => {
  return auditLogger.exportToCsv(filters);
});

// ==================== Admin IPC Handlers ====================

// User Provisioning
ipcMain.handle('admin:createProvisioningRequest', async (_, data, createdBy) => {
  return adminManager.createProvisioningRequest(data, createdBy);
});

ipcMain.handle('admin:getProvisioningRequest', async (_, id) => {
  validateId(id, 'Provisioning Request ID');
  return adminManager.getProvisioningRequest(id);
});

ipcMain.handle('admin:getAllProvisioningRequests', async (_, status) => {
  return adminManager.getAllProvisioningRequests(status);
});

ipcMain.handle('admin:updateProvisioningStatus', async (_, id, status) => {
  validateId(id, 'Provisioning Request ID');
  adminManager.updateProvisioningStatus(id, status);
});

ipcMain.handle('admin:sendInvitation', async (_, id) => {
  validateId(id, 'Provisioning Request ID');
  adminManager.sendInvitation(id);
});

ipcMain.handle('admin:deleteProvisioningRequest', async (_, id) => {
  validateId(id, 'Provisioning Request ID');
  return adminManager.deleteProvisioningRequest(id);
});

// Bulk Operations
ipcMain.handle('admin:createBulkOperation', async (_, data, createdBy) => {
  return adminManager.createBulkOperation(data, createdBy);
});

ipcMain.handle('admin:getBulkOperation', async (_, id) => {
  validateId(id, 'Bulk Operation ID');
  return adminManager.getBulkOperation(id);
});

ipcMain.handle('admin:updateBulkOperationProgress', async (_, id, processed, succeeded, failed) => {
  validateId(id, 'Bulk Operation ID');
  adminManager.updateBulkOperationProgress(id, processed, succeeded, failed);
});

ipcMain.handle('admin:startBulkOperation', async (_, id) => {
  validateId(id, 'Bulk Operation ID');
  adminManager.startBulkOperation(id);
});

ipcMain.handle('admin:completeBulkOperation', async (_, id, errors) => {
  validateId(id, 'Bulk Operation ID');
  adminManager.completeBulkOperation(id, errors);
});

// License Management
ipcMain.handle('admin:createLicense', async (_, data) => {
  return adminManager.createLicense(data);
});

ipcMain.handle('admin:getLicense', async (_, id) => {
  validateId(id, 'License ID');
  return adminManager.getLicense(id);
});

ipcMain.handle('admin:getActiveLicenseByOrganization', async (_, organizationId) => {
  validateId(organizationId, 'Organization ID');
  return adminManager.getActiveLicenseByOrganization(organizationId);
});

ipcMain.handle('admin:updateLicense', async (_, id, data) => {
  validateId(id, 'License ID');
  return adminManager.updateLicense(id, data);
});

ipcMain.handle('admin:checkExpiringLicenses', async (_, daysThreshold) => {
  return adminManager.checkExpiringLicenses(daysThreshold);
});

// Workspace Quotas
ipcMain.handle('admin:initializeQuotasForOrganization', async (_, organizationId, licenseType) => {
  validateId(organizationId, 'Organization ID');
  adminManager.initializeQuotasForOrganization(organizationId, licenseType);
});

ipcMain.handle('admin:getQuotaUsage', async (_, organizationId, quotaType) => {
  validateId(organizationId, 'Organization ID');
  return adminManager.getQuotaUsage(organizationId, quotaType);
});

ipcMain.handle('admin:getAllQuotaUsages', async (_, organizationId) => {
  validateId(organizationId, 'Organization ID');
  return adminManager.getAllQuotaUsages(organizationId);
});

ipcMain.handle('admin:updateQuotaUsage', async (_, organizationId, quotaType, used) => {
  validateId(organizationId, 'Organization ID');
  adminManager.updateQuotaUsage(organizationId, quotaType, used);
});

ipcMain.handle('admin:incrementQuotaUsage', async (_, organizationId, quotaType, increment) => {
  validateId(organizationId, 'Organization ID');
  adminManager.incrementQuotaUsage(organizationId, quotaType, increment);
});

ipcMain.handle('admin:decrementQuotaUsage', async (_, organizationId, quotaType, decrement) => {
  validateId(organizationId, 'Organization ID');
  adminManager.decrementQuotaUsage(organizationId, quotaType, decrement);
});

// System Health
ipcMain.handle('admin:recordHealthMetric', async (_, metric) => {
  adminManager.recordHealthMetric(metric);
});

ipcMain.handle('admin:getSystemHealth', async () => {
  return adminManager.getSystemHealth();
});

ipcMain.handle('admin:getHealthMetricHistory', async (_, metricName, hours) => {
  return adminManager.getHealthMetricHistory(metricName, hours);
});

ipcMain.handle('admin:cleanupOldHealthMetrics', async (_, retentionDays) => {
  return adminManager.cleanupOldHealthMetrics(retentionDays);
});

// Dashboard
ipcMain.handle('admin:getDashboardStats', async (_, organizationId) => {
  validateId(organizationId, 'Organization ID');
  return adminManager.getDashboardStats(organizationId);
});

// System Settings
ipcMain.handle('admin:getSystemSetting', async (_, key) => {
  return adminManager.getSystemSetting(key);
});

ipcMain.handle('admin:getAllSystemSettings', async (_, category, publicOnly) => {
  return adminManager.getAllSystemSettings(category, publicOnly);
});

ipcMain.handle('admin:updateSystemSetting', async (_, key, data) => {
  return adminManager.updateSystemSetting(key, data);
});

// Admin Activity Log
ipcMain.handle('admin:logAdminActivity', async (_, adminUserId, action, description, options) => {
  validateId(adminUserId, 'Admin User ID');
  adminManager.logAdminActivity(adminUserId, action, description, options);
});

ipcMain.handle('admin:getAdminActivityLog', async (_, adminUserId, limit) => {
  validateId(adminUserId, 'Admin User ID');
  return adminManager.getAdminActivityLog(adminUserId, limit);
});

// ==================== Integration IPC Handlers ====================

// Integrations
ipcMain.handle('integration:create', async (_, data, createdBy) => {
  return integrationManager.createIntegration(data, createdBy);
});

ipcMain.handle('integration:get', async (_, id) => {
  validateId(id, 'Integration ID');
  return integrationManager.getIntegration(id);
});

ipcMain.handle('integration:getAll', async (_, type, status) => {
  return integrationManager.getAllIntegrations(type, status);
});

ipcMain.handle('integration:update', async (_, id, data) => {
  validateId(id, 'Integration ID');
  return integrationManager.updateIntegration(id, data);
});

ipcMain.handle('integration:delete', async (_, id) => {
  validateId(id, 'Integration ID');
  return integrationManager.deleteIntegration(id);
});

ipcMain.handle('integration:updateLastSync', async (_, id) => {
  validateId(id, 'Integration ID');
  integrationManager.updateLastSync(id);
});

// Webhooks
ipcMain.handle('webhook:create', async (_, data, createdBy) => {
  return integrationManager.createWebhook(data, createdBy);
});

ipcMain.handle('webhook:get', async (_, id) => {
  validateId(id, 'Webhook ID');
  return integrationManager.getWebhook(id);
});

ipcMain.handle('webhook:getAll', async (_, activeOnly) => {
  return integrationManager.getAllWebhooks(activeOnly);
});

ipcMain.handle('webhook:getByEvent', async (_, event) => {
  return integrationManager.getWebhooksByEvent(event);
});

ipcMain.handle('webhook:update', async (_, id, data) => {
  validateId(id, 'Webhook ID');
  return integrationManager.updateWebhook(id, data);
});

ipcMain.handle('webhook:delete', async (_, id) => {
  validateId(id, 'Webhook ID');
  return integrationManager.deleteWebhook(id);
});

ipcMain.handle('webhook:recordDelivery', async (_, delivery) => {
  integrationManager.recordWebhookDelivery(delivery);
});

ipcMain.handle('webhook:getDeliveries', async (_, webhookId, limit) => {
  validateId(webhookId, 'Webhook ID');
  return integrationManager.getWebhookDeliveries(webhookId, limit);
});

// Sync Jobs
ipcMain.handle('sync:createJob', async (_, integrationId, direction) => {
  validateId(integrationId, 'Integration ID');
  return integrationManager.createSyncJob(integrationId, direction);
});

ipcMain.handle('sync:getJob', async (_, id) => {
  validateId(id, 'Sync Job ID');
  return integrationManager.getSyncJob(id);
});

ipcMain.handle('sync:queryJobs', async (_, filters) => {
  return integrationManager.querySyncJobs(filters);
});

ipcMain.handle('sync:updateProgress', async (_, id, processed, created, updated, failed) => {
  validateId(id, 'Sync Job ID');
  integrationManager.updateSyncJobProgress(id, processed, created, updated, failed);
});

ipcMain.handle('sync:completeJob', async (_, id, status, errors, summary) => {
  validateId(id, 'Sync Job ID');
  integrationManager.completeSyncJob(id, status, errors, summary);
});

// Rate Limiting
ipcMain.handle('rateLimit:createConfig', async (_, data) => {
  return integrationManager.createRateLimitConfig(data);
});

ipcMain.handle('rateLimit:getConfig', async (_, id) => {
  validateId(id, 'Rate Limit Config ID');
  return integrationManager.getRateLimitConfig(id);
});

ipcMain.handle('rateLimit:getByApiKey', async (_, apiKeyId) => {
  validateId(apiKeyId, 'API Key ID');
  return integrationManager.getRateLimitByApiKey(apiKeyId);
});

ipcMain.handle('rateLimit:check', async (_, configId) => {
  validateId(configId, 'Rate Limit Config ID');
  return integrationManager.checkRateLimit(configId);
});

// Import/Export
ipcMain.handle('importExport:createJob', async (_, data, createdBy) => {
  return integrationManager.createImportExportJob(data, createdBy);
});

ipcMain.handle('importExport:getJob', async (_, id) => {
  validateId(id, 'Import/Export Job ID');
  return integrationManager.getImportExportJob(id);
});

ipcMain.handle('importExport:startJob', async (_, id, totalRecords) => {
  validateId(id, 'Import/Export Job ID');
  integrationManager.startImportExportJob(id, totalRecords);
});

ipcMain.handle('importExport:updateProgress', async (_, id, processed, succeeded, failed) => {
  validateId(id, 'Import/Export Job ID');
  integrationManager.updateImportExportProgress(id, processed, succeeded, failed);
});

ipcMain.handle('importExport:completeJob', async (_, id, errors) => {
  validateId(id, 'Import/Export Job ID');
  integrationManager.completeImportExportJob(id, errors);
});

// Integration Events
ipcMain.handle('integration:logEvent', async (_, integrationId, eventType, eventData, status, message) => {
  validateId(integrationId, 'Integration ID');
  integrationManager.logIntegrationEvent(integrationId, eventType, eventData, status, message);
});

ipcMain.handle('integration:getEvents', async (_, integrationId, limit) => {
  validateId(integrationId, 'Integration ID');
  return integrationManager.getIntegrationEvents(integrationId, limit);
});

// ==================== White Label IPC Handlers ====================

// Tenants
ipcMain.handle('tenant:create', async (_, data) => {
  return whiteLabelManager.createTenant(data);
});

ipcMain.handle('tenant:get', async (_, id) => {
  validateId(id, 'Tenant ID');
  return whiteLabelManager.getTenant(id);
});

ipcMain.handle('tenant:getBySlug', async (_, slug) => {
  return whiteLabelManager.getTenantBySlug(slug);
});

ipcMain.handle('tenant:getByDomain', async (_, domain) => {
  return whiteLabelManager.getTenantByDomain(domain);
});

ipcMain.handle('tenant:getAll', async (_, status) => {
  return whiteLabelManager.getAllTenants(status);
});

ipcMain.handle('tenant:update', async (_, id, data) => {
  validateId(id, 'Tenant ID');
  return whiteLabelManager.updateTenant(id, data);
});

ipcMain.handle('tenant:delete', async (_, id) => {
  validateId(id, 'Tenant ID');
  return whiteLabelManager.deleteTenant(id);
});

// Custom Domains
ipcMain.handle('customDomain:create', async (_, data) => {
  return whiteLabelManager.createCustomDomain(data);
});

ipcMain.handle('customDomain:get', async (_, id) => {
  validateId(id, 'Custom Domain ID');
  return whiteLabelManager.getCustomDomain(id);
});

ipcMain.handle('customDomain:getByDomain', async (_, domain) => {
  return whiteLabelManager.getCustomDomainByDomain(domain);
});

ipcMain.handle('customDomain:getTenantDomains', async (_, tenantId) => {
  validateId(tenantId, 'Tenant ID');
  return whiteLabelManager.getTenantCustomDomains(tenantId);
});

ipcMain.handle('customDomain:update', async (_, id, data) => {
  validateId(id, 'Custom Domain ID');
  return whiteLabelManager.updateCustomDomain(id, data);
});

ipcMain.handle('customDomain:verify', async (_, id) => {
  validateId(id, 'Custom Domain ID');
  return whiteLabelManager.verifyCustomDomain(id);
});

ipcMain.handle('customDomain:delete', async (_, id) => {
  validateId(id, 'Custom Domain ID');
  return whiteLabelManager.deleteCustomDomain(id);
});

// Email Templates
ipcMain.handle('emailTemplate:create', async (_, data, createdBy) => {
  return whiteLabelManager.createEmailTemplate(data, createdBy);
});

ipcMain.handle('emailTemplate:get', async (_, id) => {
  validateId(id, 'Email Template ID');
  return whiteLabelManager.getEmailTemplate(id);
});

ipcMain.handle('emailTemplate:getByType', async (_, tenantId, type) => {
  validateId(tenantId, 'Tenant ID');
  return whiteLabelManager.getEmailTemplateByType(tenantId, type);
});

ipcMain.handle('emailTemplate:getTenantTemplates', async (_, tenantId) => {
  validateId(tenantId, 'Tenant ID');
  return whiteLabelManager.getTenantEmailTemplates(tenantId);
});

ipcMain.handle('emailTemplate:update', async (_, id, data) => {
  validateId(id, 'Email Template ID');
  return whiteLabelManager.updateEmailTemplate(id, data);
});

ipcMain.handle('emailTemplate:delete', async (_, id) => {
  validateId(id, 'Email Template ID');
  return whiteLabelManager.deleteEmailTemplate(id);
});

// Login Page Configuration
ipcMain.handle('loginPageConfig:create', async (_, data) => {
  return whiteLabelManager.createLoginPageConfig(data);
});

ipcMain.handle('loginPageConfig:get', async (_, id) => {
  validateId(id, 'Login Page Config ID');
  return whiteLabelManager.getLoginPageConfig(id);
});

ipcMain.handle('loginPageConfig:getByTenant', async (_, tenantId) => {
  validateId(tenantId, 'Tenant ID');
  return whiteLabelManager.getLoginPageConfigByTenant(tenantId);
});

ipcMain.handle('loginPageConfig:update', async (_, id, data) => {
  validateId(id, 'Login Page Config ID');
  return whiteLabelManager.updateLoginPageConfig(id, data);
});

ipcMain.handle('loginPageConfig:delete', async (_, id) => {
  validateId(id, 'Login Page Config ID');
  return whiteLabelManager.deleteLoginPageConfig(id);
});

// Tenant Settings
ipcMain.handle('tenantSetting:create', async (_, data) => {
  return whiteLabelManager.createTenantSetting(data);
});

ipcMain.handle('tenantSetting:get', async (_, id) => {
  validateId(id, 'Tenant Setting ID');
  return whiteLabelManager.getTenantSetting(id);
});

ipcMain.handle('tenantSetting:getByKey', async (_, tenantId, key) => {
  validateId(tenantId, 'Tenant ID');
  return whiteLabelManager.getTenantSettingByKey(tenantId, key);
});

ipcMain.handle('tenantSetting:getAll', async (_, tenantId, category) => {
  validateId(tenantId, 'Tenant ID');
  return whiteLabelManager.getAllTenantSettings(tenantId, category);
});

ipcMain.handle('tenantSetting:update', async (_, id, data) => {
  validateId(id, 'Tenant Setting ID');
  return whiteLabelManager.updateTenantSetting(id, data);
});

ipcMain.handle('tenantSetting:delete', async (_, id) => {
  validateId(id, 'Tenant Setting ID');
  return whiteLabelManager.deleteTenantSetting(id);
});

// Tenant Assets
ipcMain.handle('tenantAsset:create', async (_, data, uploadedBy) => {
  return whiteLabelManager.createTenantAsset(data, uploadedBy);
});

ipcMain.handle('tenantAsset:get', async (_, id) => {
  validateId(id, 'Tenant Asset ID');
  return whiteLabelManager.getTenantAsset(id);
});

ipcMain.handle('tenantAsset:getTenantAssets', async (_, tenantId, assetType) => {
  validateId(tenantId, 'Tenant ID');
  return whiteLabelManager.getTenantAssets(tenantId, assetType);
});

ipcMain.handle('tenantAsset:delete', async (_, id) => {
  validateId(id, 'Tenant Asset ID');
  return whiteLabelManager.deleteTenantAsset(id);
});

// ==================== Compliance IPC Handlers ====================

// Data Subject Requests (GDPR)
ipcMain.handle('compliance:createDSR', async (_, data) => {
  return complianceManager.createDataSubjectRequest(data);
});

ipcMain.handle('compliance:getDSR', async (_, id) => {
  validateId(id, 'Data Subject Request ID');
  return complianceManager.getDataSubjectRequest(id);
});

ipcMain.handle('compliance:getUserDSRs', async (_, userId) => {
  validateId(userId, 'User ID');
  return complianceManager.getUserDataSubjectRequests(userId);
});

ipcMain.handle('compliance:getAllDSRs', async (_, status) => {
  return complianceManager.getAllDataSubjectRequests(status);
});

ipcMain.handle('compliance:updateDSR', async (_, id, data) => {
  validateId(id, 'Data Subject Request ID');
  return complianceManager.updateDataSubjectRequest(id, data);
});

ipcMain.handle('compliance:verifyDSR', async (_, id, token) => {
  validateId(id, 'Data Subject Request ID');
  return complianceManager.verifyDataSubjectRequest(id, token);
});

// Data Retention Policies
ipcMain.handle('compliance:createRetentionPolicy', async (_, data, createdBy) => {
  return complianceManager.createDataRetentionPolicy(data, createdBy);
});

ipcMain.handle('compliance:getRetentionPolicy', async (_, id) => {
  validateId(id, 'Data Retention Policy ID');
  return complianceManager.getDataRetentionPolicy(id);
});

ipcMain.handle('compliance:getAllRetentionPolicies', async (_, status) => {
  return complianceManager.getAllDataRetentionPolicies(status);
});

ipcMain.handle('compliance:updateRetentionPolicy', async (_, id, data) => {
  validateId(id, 'Data Retention Policy ID');
  return complianceManager.updateDataRetentionPolicy(id, data);
});

ipcMain.handle('compliance:deleteRetentionPolicy', async (_, id) => {
  validateId(id, 'Data Retention Policy ID');
  return complianceManager.deleteDataRetentionPolicy(id);
});

ipcMain.handle('compliance:logRetentionExecution', async (_, policyId, itemsProcessed, itemsDeleted, itemsArchived, itemsAnonymized, errors, summary) => {
  validateId(policyId, 'Data Retention Policy ID');
  return complianceManager.logRetentionExecution(policyId, itemsProcessed, itemsDeleted, itemsArchived, itemsAnonymized, errors, summary);
});

ipcMain.handle('compliance:getRetentionLogs', async (_, policyId, limit) => {
  validateId(policyId, 'Data Retention Policy ID');
  return complianceManager.getRetentionExecutionLogs(policyId, limit);
});

// User Consents
ipcMain.handle('compliance:createConsent', async (_, data) => {
  return complianceManager.createUserConsent(data);
});

ipcMain.handle('compliance:getConsent', async (_, id) => {
  validateId(id, 'User Consent ID');
  return complianceManager.getUserConsent(id);
});

ipcMain.handle('compliance:getUserConsents', async (_, userId, consentType) => {
  validateId(userId, 'User ID');
  return complianceManager.getUserConsents(userId, consentType);
});

ipcMain.handle('compliance:updateConsent', async (_, id, data) => {
  validateId(id, 'User Consent ID');
  return complianceManager.updateUserConsent(id, data);
});

ipcMain.handle('compliance:withdrawConsent', async (_, userId, consentType) => {
  validateId(userId, 'User ID');
  return complianceManager.withdrawUserConsent(userId, consentType);
});

// Legal Holds
ipcMain.handle('compliance:createLegalHold', async (_, data, createdBy) => {
  return complianceManager.createLegalHold(data, createdBy);
});

ipcMain.handle('compliance:getLegalHold', async (_, id) => {
  validateId(id, 'Legal Hold ID');
  return complianceManager.getLegalHold(id);
});

ipcMain.handle('compliance:getAllLegalHolds', async (_, status) => {
  return complianceManager.getAllLegalHolds(status);
});

ipcMain.handle('compliance:updateLegalHold', async (_, id, data) => {
  validateId(id, 'Legal Hold ID');
  return complianceManager.updateLegalHold(id, data);
});

ipcMain.handle('compliance:releaseLegalHold', async (_, id, releasedBy) => {
  validateId(id, 'Legal Hold ID');
  return complianceManager.releaseLegalHold(id, releasedBy);
});

ipcMain.handle('compliance:isEntityUnderHold', async (_, entityType, entityId) => {
  validateId(entityId, 'Entity ID');
  return complianceManager.isEntityUnderHold(entityType, entityId);
});

// Compliance Controls
ipcMain.handle('compliance:createControl', async (_, data) => {
  return complianceManager.createComplianceControl(data);
});

ipcMain.handle('compliance:getControl', async (_, id) => {
  validateId(id, 'Compliance Control ID');
  return complianceManager.getComplianceControl(id);
});

ipcMain.handle('compliance:getControlsByFramework', async (_, framework) => {
  return complianceManager.getComplianceControlsByFramework(framework);
});

ipcMain.handle('compliance:getAllControls', async () => {
  return complianceManager.getAllComplianceControls();
});

ipcMain.handle('compliance:updateControl', async (_, id, data) => {
  validateId(id, 'Compliance Control ID');
  return complianceManager.updateComplianceControl(id, data);
});

ipcMain.handle('compliance:deleteControl', async (_, id) => {
  validateId(id, 'Compliance Control ID');
  return complianceManager.deleteComplianceControl(id);
});

// Compliance Assessments
ipcMain.handle('compliance:createAssessment', async (_, data, createdBy) => {
  return complianceManager.createComplianceAssessment(data, createdBy);
});

ipcMain.handle('compliance:getAssessment', async (_, id) => {
  validateId(id, 'Compliance Assessment ID');
  return complianceManager.getComplianceAssessment(id);
});

ipcMain.handle('compliance:getAllAssessments', async (_, framework) => {
  return complianceManager.getAllComplianceAssessments(framework);
});

ipcMain.handle('compliance:updateAssessment', async (_, id, data) => {
  validateId(id, 'Compliance Assessment ID');
  return complianceManager.updateComplianceAssessment(id, data);
});

ipcMain.handle('compliance:deleteAssessment', async (_, id) => {
  validateId(id, 'Compliance Assessment ID');
  return complianceManager.deleteComplianceAssessment(id);
});

// Data Processing Activities
ipcMain.handle('compliance:createProcessingActivity', async (_, data, createdBy) => {
  return complianceManager.createDataProcessingActivity(data, createdBy);
});

ipcMain.handle('compliance:getProcessingActivity', async (_, id) => {
  validateId(id, 'Data Processing Activity ID');
  return complianceManager.getDataProcessingActivity(id);
});

ipcMain.handle('compliance:getAllProcessingActivities', async () => {
  return complianceManager.getAllDataProcessingActivities();
});

ipcMain.handle('compliance:updateProcessingActivity', async (_, id, data) => {
  validateId(id, 'Data Processing Activity ID');
  return complianceManager.updateDataProcessingActivity(id, data);
});

ipcMain.handle('compliance:deleteProcessingActivity', async (_, id) => {
  validateId(id, 'Data Processing Activity ID');
  return complianceManager.deleteDataProcessingActivity(id);
});

// Compliance Dashboard
ipcMain.handle('compliance:getDashboardStats', async () => {
  return complianceManager.getComplianceDashboardStats();
});

// ==================== VISION BOARDS ====================

// Vision Board CRUD
ipcMain.handle('visionBoard:create', async (_, data, userId) => {
  return visionBoardManager.createBoard(data, userId);
});

ipcMain.handle('visionBoard:createFromTemplate', async (_, template, name, userId, projectId) => {
  return visionBoardManager.createBoardFromTemplate(template, name, userId, projectId);
});

ipcMain.handle('visionBoard:getById', async (_, id) => {
  validateId(id, 'Vision Board ID');
  return visionBoardManager.getBoardById(id);
});

ipcMain.handle('visionBoard:getAll', async (_, filters) => {
  return visionBoardManager.getAllBoards(filters);
});

ipcMain.handle('visionBoard:getByProject', async (_, projectId) => {
  validateId(projectId, 'Project ID');
  return visionBoardManager.getBoardsByProject(projectId);
});

ipcMain.handle('visionBoard:update', async (_, id, data) => {
  validateId(id, 'Vision Board ID');
  return visionBoardManager.updateBoard(id, data);
});

ipcMain.handle('visionBoard:delete', async (_, id) => {
  validateId(id, 'Vision Board ID');
  return visionBoardManager.deleteBoard(id);
});

ipcMain.handle('visionBoard:duplicate', async (_, id, newName, userId) => {
  validateId(id, 'Vision Board ID');
  validateId(userId, 'User ID');
  return visionBoardManager.duplicateBoard(id, newName, userId);
});

// Vision Board Nodes
ipcMain.handle('visionBoard:createNode', async (_, data) => {
  return visionBoardManager.createNode(data);
});

ipcMain.handle('visionBoard:getNode', async (_, id) => {
  validateId(id, 'Vision Board Node ID');
  return visionBoardManager.getNodeById(id);
});

ipcMain.handle('visionBoard:getNodesByBoard', async (_, boardId) => {
  validateId(boardId, 'Vision Board ID');
  return visionBoardManager.getNodesByBoard(boardId);
});

ipcMain.handle('visionBoard:updateNode', async (_, id, data) => {
  validateId(id, 'Vision Board Node ID');
  return visionBoardManager.updateNode(id, data);
});

ipcMain.handle('visionBoard:deleteNode', async (_, id) => {
  validateId(id, 'Vision Board Node ID');
  return visionBoardManager.deleteNode(id);
});

ipcMain.handle('visionBoard:bulkUpdateNodePositions', async (_, updates) => {
  return visionBoardManager.bulkUpdateNodePositions(updates);
});

// Vision Board Connections
ipcMain.handle('visionBoard:createConnection', async (_, data) => {
  return visionBoardManager.createConnection(data);
});

ipcMain.handle('visionBoard:getConnection', async (_, id) => {
  validateId(id, 'Vision Board Connection ID');
  return visionBoardManager.getConnectionById(id);
});

ipcMain.handle('visionBoard:getConnectionsByBoard', async (_, boardId) => {
  validateId(boardId, 'Vision Board ID');
  return visionBoardManager.getConnectionsByBoard(boardId);
});

ipcMain.handle('visionBoard:updateConnection', async (_, id, data) => {
  validateId(id, 'Vision Board Connection ID');
  return visionBoardManager.updateConnection(id, data);
});

ipcMain.handle('visionBoard:deleteConnection', async (_, id) => {
  validateId(id, 'Vision Board Connection ID');
  return visionBoardManager.deleteConnection(id);
});

// Vision Board Groups
ipcMain.handle('visionBoard:createGroup', async (_, data) => {
  return visionBoardManager.createGroup(data);
});

ipcMain.handle('visionBoard:getGroup', async (_, id) => {
  validateId(id, 'Vision Board Group ID');
  return visionBoardManager.getGroupById(id);
});

ipcMain.handle('visionBoard:getGroupsByBoard', async (_, boardId) => {
  validateId(boardId, 'Vision Board ID');
  return visionBoardManager.getGroupsByBoard(boardId);
});

ipcMain.handle('visionBoard:updateGroup', async (_, id, data) => {
  validateId(id, 'Vision Board Group ID');
  return visionBoardManager.updateGroup(id, data);
});

ipcMain.handle('visionBoard:deleteGroup', async (_, id) => {
  validateId(id, 'Vision Board Group ID');
  return visionBoardManager.deleteGroup(id);
});

// Vision Board Helpers
ipcMain.handle('visionBoard:getBoardData', async (_, boardId) => {
  validateId(boardId, 'Vision Board ID');
  return visionBoardManager.getBoardData(boardId);
});

ipcMain.handle('visionBoard:exportToJSON', async (_, boardId) => {
  validateId(boardId, 'Vision Board ID');
  return visionBoardManager.exportBoardToJSON(boardId);
});

ipcMain.handle('visionBoard:importFromJSON', async (_, json, userId, newName) => {
  validateId(userId, 'User ID');
  return visionBoardManager.importBoardFromJSON(json, userId, newName);
});


