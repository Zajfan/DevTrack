export enum ProjectStatus {
  Active = 'Active',
  OnHold = 'OnHold',
  Completed = 'Completed',
  Archived = 'Archived',
}

export enum TaskStatus {
  ToDo = 'ToDo',
  InProgress = 'InProgress',
  UnderReview = 'UnderReview',
  Blocked = 'Blocked',
  Completed = 'Completed',
}

export enum TaskPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export interface Project {
  id: number;
  name: string;
  description: string;
  createdDate: string;
  dueDate?: string;
  status: ProjectStatus;
  conceptWhat?: string;
  conceptHow?: string;
  conceptWhere?: string;
  conceptWithWhat?: string;
  conceptWhen?: string;
  conceptWhy?: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  createdDate: string;
  dueDate?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  estimatedHours: number;
  actualHours: number;
  isCompleted: boolean;
  isOverdue?: boolean;
}

export interface Concept {
  id: number;
  projectId: number;
  name: string;
  description: string;
  conceptType: string;
  createdDate: string;
}

export interface ConceptRelationship {
  id: number;
  sourceConceptId: number;
  targetConceptId: number;
  relationshipType: string;
}

export interface CreateProjectDTO {
  name: string;
  description: string;
  dueDate?: string;
  status?: ProjectStatus;
}

export interface UpdateProjectDTO extends Partial<CreateProjectDTO> {
  id: number;
}

export interface CreateTaskDTO {
  projectId: number;
  title: string;
  description: string;
  dueDate?: string;
  priority?: TaskPriority;
  assignedTo?: string;
  estimatedHours?: number;
}

export interface UpdateTaskDTO extends Partial<CreateTaskDTO> {
  id: number;
  status?: TaskStatus;
  actualHours?: number;
  isCompleted?: boolean;
}
