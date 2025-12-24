/**
 * Project Template Model
 * Represents a reusable project template with predefined structure
 */
export interface ProjectTemplate {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category: string | null;
  isPublic: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  conceptWhat: string | null;
  conceptHow: string | null;
  conceptWhere: string | null;
  conceptWithWhat: string | null;
  conceptWhen: string | null;
  conceptWhy: string | null;
}

/**
 * Task Template Model
 * Represents a task that's part of a project template
 */
export interface TaskTemplate {
  id: number;
  projectTemplateId: number | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours: number | null;
  position: number;
}

/**
 * Data transfer object for creating a project template
 */
export interface CreateProjectTemplateData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  isPublic?: boolean;
  createdBy?: number;
  conceptWhat?: string;
  conceptHow?: string;
  conceptWhere?: string;
  conceptWithWhat?: string;
  conceptWhen?: string;
  conceptWhy?: string;
}

/**
 * Data transfer object for updating a project template
 */
export interface UpdateProjectTemplateData {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
  isPublic?: boolean;
  conceptWhat?: string;
  conceptHow?: string;
  conceptWhere?: string;
  conceptWithWhat?: string;
  conceptWhen?: string;
  conceptWhy?: string;
}

/**
 * Data transfer object for creating a task template
 */
export interface CreateTaskTemplateData {
  projectTemplateId?: number;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
  position?: number;
}

/**
 * Data transfer object for updating a task template
 */
export interface UpdateTaskTemplateData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedHours?: number;
  position?: number;
}

/**
 * Template category enum for organization
 */
export enum TemplateCategory {
  Software = 'software',
  Marketing = 'marketing',
  Design = 'design',
  Research = 'research',
  Planning = 'planning',
  Development = 'development',
  QA = 'qa',
  Deployment = 'deployment',
  Other = 'other',
}

/**
 * Complete template with tasks
 */
export interface ProjectTemplateWithTasks extends ProjectTemplate {
  tasks: TaskTemplate[];
}
