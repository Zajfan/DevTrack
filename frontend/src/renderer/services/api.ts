import axios, { AxiosInstance } from 'axios';
import type { Project, Task, CreateProjectDTO, UpdateProjectDTO, CreateTaskDTO, UpdateTaskDTO } from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string = 'http://localhost:3001';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async initialize() {
    try {
      if (window.electronAPI) {
        this.baseURL = await window.electronAPI.getBackendUrl();
        this.api.defaults.baseURL = this.baseURL;
      }
    } catch (error) {
      console.error('Failed to get backend URL:', error);
    }
  }

  // Project APIs
  async getAllProjects(): Promise<Project[]> {
    const response = await this.api.get<Project[]>('/api/projects');
    return response.data;
  }

  async getProject(id: number): Promise<Project> {
    const response = await this.api.get<Project>(`/api/projects/${id}`);
    return response.data;
  }

  async createProject(project: CreateProjectDTO): Promise<Project> {
    const response = await this.api.post<Project>('/api/projects', project);
    return response.data;
  }

  async updateProject(project: UpdateProjectDTO): Promise<Project> {
    const response = await this.api.put<Project>(`/api/projects/${project.id}`, project);
    return response.data;
  }

  async deleteProject(id: number): Promise<void> {
    await this.api.delete(`/api/projects/${id}`);
  }

  // Task APIs
  async getAllTasks(): Promise<Task[]> {
    const response = await this.api.get<Task[]>('/api/tasks');
    return response.data;
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    const response = await this.api.get<Task[]>(`/api/projects/${projectId}/tasks`);
    return response.data;
  }

  async getTask(id: number): Promise<Task> {
    const response = await this.api.get<Task>(`/api/tasks/${id}`);
    return response.data;
  }

  async createTask(task: CreateTaskDTO): Promise<Task> {
    const response = await this.api.post<Task>('/api/tasks', task);
    return response.data;
  }

  async updateTask(task: UpdateTaskDTO): Promise<Task> {
    const response = await this.api.put<Task>(`/api/tasks/${task.id}`, task);
    return response.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.api.delete(`/api/tasks/${id}`);
  }
}

export const apiService = new ApiService();
