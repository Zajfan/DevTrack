import type { 
  Project, CreateProjectData, UpdateProjectData,
  Task, CreateTaskData, UpdateTaskData,
  Comment, CreateCommentData, UpdateCommentData,
  Label, CreateLabelData, UpdateLabelData,
  Attachment, CreateAttachmentData,
  CustomField, CreateCustomFieldData, UpdateCustomFieldData,
  TaskCustomValue
} from '../types';

/**
 * API Service using Electron IPC instead of HTTP
 * All operations go through the preload bridge to the main process
 */
class ApiService {
  private get api() {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI;
  }

  // Project APIs
  async getAllProjects(): Promise<Project[]> {
    return this.api.project.findAll();
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.api.project.findById(id);
  }

  async createProject(project: CreateProjectData): Promise<Project> {
    return this.api.project.create(project);
  }

  async updateProject(id: number, data: UpdateProjectData): Promise<Project | undefined> {
    return this.api.project.update(id, data);
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.api.project.delete(id);
  }

  // Task APIs
  async getTasksByProject(projectId: number): Promise<Task[]> {
    return this.api.task.findByProjectId(projectId);
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.api.task.findById(id);
  }

  async createTask(task: CreateTaskData): Promise<Task> {
    return this.api.task.create(task);
  }

  async updateTask(id: number, data: UpdateTaskData): Promise<Task | undefined> {
    return this.api.task.update(id, data);
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.api.task.delete(id);
  }

  async addTaskLabel(taskId: number, labelId: number): Promise<void> {
    return this.api.task.addLabel(taskId, labelId);
  }

  async removeTaskLabel(taskId: number, labelId: number): Promise<void> {
    return this.api.task.removeLabel(taskId, labelId);
  }

  async getTaskLabels(taskId: number): Promise<number[]> {
    return this.api.task.getLabelIds(taskId);
  }

  // Comment APIs
  async getCommentsByTask(taskId: number): Promise<Comment[]> {
    return this.api.comment.findByTaskId(taskId);
  }

  async createComment(comment: CreateCommentData): Promise<Comment> {
    return this.api.comment.create(comment);
  }

  async updateComment(id: number, data: UpdateCommentData): Promise<Comment | undefined> {
    return this.api.comment.update(id, data);
  }

  async deleteComment(id: number): Promise<boolean> {
    return this.api.comment.delete(id);
  }

  // Label APIs
  async getLabelsByProject(projectId: number): Promise<Label[]> {
    return this.api.label.findByProjectId(projectId);
  }

  async createLabel(label: CreateLabelData): Promise<Label> {
    return this.api.label.create(label);
  }

  async updateLabel(id: number, data: UpdateLabelData): Promise<Label | undefined> {
    return this.api.label.update(id, data);
  }

  async deleteLabel(id: number): Promise<boolean> {
    return this.api.label.delete(id);
  }

  // Attachment APIs
  async getAttachmentsByTask(taskId: number): Promise<Attachment[]> {
    return this.api.attachment.findByTaskId(taskId);
  }

  async createAttachment(attachment: CreateAttachmentData): Promise<Attachment> {
    return this.api.attachment.create(attachment);
  }

  async deleteAttachment(id: number): Promise<boolean> {
    return this.api.attachment.delete(id);
  }

  // Custom Field APIs
  async getCustomFieldsByProject(projectId: number): Promise<CustomField[]> {
    return this.api.customField.findByProjectId(projectId);
  }

  async createCustomField(field: CreateCustomFieldData): Promise<CustomField> {
    return this.api.customField.create(field);
  }

  async updateCustomField(id: number, data: UpdateCustomFieldData): Promise<CustomField | undefined> {
    return this.api.customField.update(id, data);
  }

  async deleteCustomField(id: number): Promise<boolean> {
    return this.api.customField.delete(id);
  }

  async setTaskCustomValue(taskId: number, customFieldId: number, value: string): Promise<void> {
    return this.api.customField.setTaskValue(taskId, customFieldId, value);
  }

  async getTaskCustomValue(taskId: number, customFieldId: number): Promise<string | undefined> {
    return this.api.customField.getTaskValue(taskId, customFieldId);
  }

  async getTaskCustomValues(taskId: number): Promise<TaskCustomValue[]> {
    return this.api.customField.getTaskValues(taskId);
  }
}

export const apiService = new ApiService();

