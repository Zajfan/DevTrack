import Database from 'better-sqlite3';
import { ProjectTemplateRepository } from '../repositories/ProjectTemplateRepository';
import { TaskTemplateRepository } from '../repositories/TaskTemplateRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { TaskRepository } from '../repositories/TaskRepository';
import { Project, ProjectStatus } from '../models/Project';
import { Task, TaskStatus, TaskPriority } from '../models/Task';

/**
 * Service for creating projects and tasks from templates
 */
export class TemplateService {
  private projectTemplateRepo: ProjectTemplateRepository;
  private taskTemplateRepo: TaskTemplateRepository;
  private projectRepo: ProjectRepository;
  private taskRepo: TaskRepository;

  constructor(private db: Database.Database) {
    this.projectTemplateRepo = new ProjectTemplateRepository(db);
    this.taskTemplateRepo = new TaskTemplateRepository(db);
    this.projectRepo = new ProjectRepository(db);
    this.taskRepo = new TaskRepository(db);
  }

  /**
   * Create a project from a template
   */
  createProjectFromTemplate(
    templateId: number,
    customName?: string,
    customDescription?: string
  ): Project {
    const template = this.projectTemplateRepo.findByIdWithTasks(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create the project
    const project = this.projectRepo.create({
      name: customName || template.name,
      description: customDescription || template.description || undefined,
      status: ProjectStatus.Active,
      color: template.color || undefined,
      icon: template.icon || undefined,
      conceptWhat: template.conceptWhat || undefined,
      conceptHow: template.conceptHow || undefined,
      conceptWhere: template.conceptWhere || undefined,
      conceptWithWhat: template.conceptWithWhat || undefined,
      conceptWhen: template.conceptWhen || undefined,
      conceptWhy: template.conceptWhy || undefined,
    });

    // Create tasks from template
    for (const taskTemplate of template.tasks) {
      this.taskRepo.create({
        projectId: project.id,
        title: taskTemplate.title,
        description: taskTemplate.description || undefined,
        priority: taskTemplate.priority as TaskPriority,
        status: TaskStatus.Todo,
        position: taskTemplate.position,
      });
    }

    return project;
  }

  /**
   * Create a task from a standalone task template
   */
  createTaskFromTemplate(
    templateId: number,
    projectId: number,
    customTitle?: string
  ): Task {
    const template = this.taskTemplateRepo.findById(templateId);
    if (!template) {
      throw new Error('Task template not found');
    }

    return this.taskRepo.create({
      projectId,
      title: customTitle || template.title,
      description: template.description || undefined,
      priority: template.priority as TaskPriority,
      status: TaskStatus.Todo,
      position: template.position,
    });
  }

  /**
   * Save a project as a template
   */
  saveProjectAsTemplate(
    projectId: number,
    templateName: string,
    category?: string,
    isPublic = false,
    createdBy?: number
  ): number {
    const project = this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const tasks = this.taskRepo.findByProjectId(projectId);

    // Create the template
    const template = this.projectTemplateRepo.create({
      name: templateName,
      description: project.description || undefined,
      icon: project.icon || undefined,
      color: project.color || undefined,
      category,
      isPublic,
      createdBy,
      conceptWhat: project.conceptWhat || undefined,
      conceptHow: project.conceptHow || undefined,
      conceptWhere: project.conceptWhere || undefined,
      conceptWithWhat: project.conceptWithWhat || undefined,
      conceptWhen: project.conceptWhen || undefined,
      conceptWhy: project.conceptWhy || undefined,
    });

    // Create task templates
    for (const task of tasks) {
      this.taskTemplateRepo.create({
        projectTemplateId: template.id,
        title: task.title,
        description: task.description || undefined,
        priority: task.priority as any, // Type conversion for template priority
        position: task.position,
      });
    }

    return template.id;
  }

  /**
   * Save a task as a standalone template
   */
  saveTaskAsTemplate(taskId: number, templateName?: string): number {
    const task = this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const template = this.taskTemplateRepo.create({
      title: templateName || task.title,
      description: task.description || undefined,
      priority: task.priority as any, // Type conversion for template priority
    });

    return template.id;
  }
}
