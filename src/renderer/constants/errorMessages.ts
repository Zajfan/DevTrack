/**
 * Centralized error messages for the application
 *
 * This file contains all standardized error messages used across React components.
 * Using constants ensures consistency and makes it easier to update error messages globally.
 */

export const ERROR_MESSAGES = {
  // Data loading errors
  LOAD_PROJECTS_FAILED: 'Failed to load projects',
  LOAD_TASKS_FAILED: 'Failed to load tasks',
  LOAD_COMMENTS_FAILED: 'Failed to load comments',
  LOAD_LABELS_FAILED: 'Failed to load labels',
  LOAD_ATTACHMENTS_FAILED: 'Failed to load attachments',
  LOAD_USERS_FAILED: 'Failed to load users',
  LOAD_TEMPLATES_FAILED: 'Failed to load templates',
  LOAD_DASHBOARD_DATA_FAILED: 'Failed to load dashboard data',
  LOAD_DATA_FAILED: 'Failed to load data',
  LOAD_TASK_FAILED: 'Failed to load task',
  LOAD_PROJECT_FAILED: 'Failed to load project',
  LOAD_SETTINGS_FAILED: 'Failed to load settings',
  LOAD_ANALYTICS_FAILED: 'Failed to load analytics',
  LOAD_BOARD_FAILED: 'Failed to load board',
  LOAD_TEMPLATE_DETAILS_FAILED: 'Failed to load template details',
  LOAD_TASKS_AND_DEPENDENCIES_FAILED: 'Failed to load tasks and dependencies',

  // CRUD operation errors - Projects
  CREATE_PROJECT_FAILED: 'Failed to create project',
  UPDATE_PROJECT_FAILED: 'Failed to update project',
  DELETE_PROJECT_FAILED: 'Failed to delete project',
  CREATE_PROJECT_FROM_TEMPLATE_FAILED: 'Failed to create project from template',

  // CRUD operation errors - Tasks
  CREATE_TASK_FAILED: 'Failed to create task',
  UPDATE_TASK_FAILED: 'Failed to update task',
  DELETE_TASK_FAILED: 'Failed to delete task',
  UPDATE_TASK_STATUS_FAILED: 'Failed to update task status',
  UPDATE_TASK_DATES_FAILED: 'Failed to update task dates',
  SAVE_TASK_DATES_FAILED: 'Failed to save task dates',

  // CRUD operation errors - Comments
  CREATE_COMMENT_FAILED: 'Failed to add comment',
  UPDATE_COMMENT_FAILED: 'Failed to update comment',
  DELETE_COMMENT_FAILED: 'Failed to delete comment',

  // CRUD operation errors - Templates
  CREATE_TEMPLATE_FAILED: 'Failed to create template',
  UPDATE_TEMPLATE_FAILED: 'Failed to update template',
  DELETE_TEMPLATE_FAILED: 'Failed to delete template',
  DUPLICATE_TEMPLATE_FAILED: 'Failed to duplicate template',

  // CRUD operation errors - Users
  SAVE_USER_FAILED: 'Failed to save user',
  DELETE_USER_FAILED: 'Failed to delete user',

  // File operation errors
  UPLOAD_FILE_FAILED: 'Failed to upload file',
  OPEN_FILE_FAILED: 'Failed to open file',
  DELETE_FILE_FAILED: 'Failed to delete file',

  // Settings errors
  UPDATE_THEME_FAILED: 'Failed to update theme',
  UPDATE_BRANDING_FAILED: 'Failed to update branding',
  UPDATE_WORKSPACE_SETTINGS_FAILED: 'Failed to update workspace settings',
  UPDATE_SHORTCUT_FAILED: 'Failed to update shortcut',
  DELETE_SHORTCUT_FAILED: 'Failed to delete shortcut',
  RESET_SECTION_FAILED: 'Failed to reset section',
  RESET_SETTINGS_FAILED: 'Failed to reset settings',
  EXPORT_SETTINGS_FAILED: 'Failed to export settings',
  IMPORT_SETTINGS_FAILED: 'Failed to import settings',

  // Validation errors
  PROJECT_NAME_REQUIRED: 'Project name is required',
  TASK_TITLE_REQUIRED: 'Title and project are required',
  COMMENT_EMPTY: 'Comment cannot be empty',
  USER_FIELDS_REQUIRED: 'Username, email, and display name are required',

  // Generic errors
  OPERATION_FAILED: 'Operation failed',
  UNKNOWN_ERROR: 'An unknown error occurred',
  TASK_NOT_FOUND: 'Task not found',
  PROJECT_NOT_FOUND: 'Project not found',
} as const;

// Export type for TypeScript autocompletion
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
