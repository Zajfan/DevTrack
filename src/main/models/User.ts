/**
 * User model
 */
export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  isActive?: boolean;
}
