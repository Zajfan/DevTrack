import { User } from './User';
import { Role } from './Role';

/**
 * Project member model (user assigned to a project with a role)
 */
export interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  roleId: number;
  addedAt: string;
  addedBy: number | null;
}

export interface ProjectMemberWithDetails extends ProjectMember {
  user: User;
  role: Role;
  addedByUser?: User;
}

export interface CreateProjectMemberData {
  projectId: number;
  userId: number;
  roleId: number;
  addedBy?: number;
}
