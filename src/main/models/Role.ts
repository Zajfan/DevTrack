/**
 * Role model
 */
export interface Role {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  isSystem?: boolean;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
}

/**
 * Standard system roles
 */
export enum SystemRole {
  Admin = 'admin',
  Member = 'member',
  Viewer = 'viewer',
}
