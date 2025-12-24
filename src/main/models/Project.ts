/**
 * Project status enum
 */
export enum ProjectStatus {
  Active = 'active',
  Archived = 'archived',
  OnHold = 'on_hold',
  Completed = 'completed'
}

/**
 * Project model with 5W1H concept fields
 */
export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  
  // 5W1H Concept Fields
  conceptWhat: string | null;      // What is being built
  conceptHow: string | null;       // Implementation approach
  conceptWhere: string | null;     // Deployment/location
  conceptWithWhat: string | null;  // Tools/technologies
  conceptWhen: string | null;      // Timeline/schedule
  conceptWhy: string | null;       // Purpose/justification
}

/**
 * Data for creating a new project
 */
export interface CreateProjectData {
  name: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  icon?: string;
  conceptWhat?: string;
  conceptHow?: string;
  conceptWhere?: string;
  conceptWithWhat?: string;
  conceptWhen?: string;
  conceptWhy?: string;
}

/**
 * Data for updating a project
 */
export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  icon?: string;
  conceptWhat?: string;
  conceptHow?: string;
  conceptWhere?: string;
  conceptWithWhat?: string;
  conceptWhen?: string;
  conceptWhy?: string;
}
