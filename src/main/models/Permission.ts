/**
 * Permission model
 */
export interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: string;
}

export interface CreatePermissionData {
  name: string;
  resource: string;
  action: string;
  description?: string;
}

/**
 * Resource types in the system
 */
export enum Resource {
  Project = 'project',
  Task = 'task',
  Comment = 'comment',
  Label = 'label',
  Attachment = 'attachment',
  CustomField = 'custom_field',
  Member = 'member',
}

/**
 * Action types
 */
export enum Action {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Manage = 'manage',
}

/**
 * Helper to build permission names
 */
export function buildPermissionName(resource: Resource, action: Action): string {
  return `${resource}:${action}`;
}
