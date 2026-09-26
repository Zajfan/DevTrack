import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Task, TimeEntry } from '../types';

interface AppState {
  // Projects
  projects: Project[];
  selectedProjectId: number | null;
  setProjects: (projects: Project[]) => void;
  setSelectedProject: (id: number | null) => void;
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  removeProject: (id: number) => void;

  // Tasks
  tasks: Task[];
  selectedTaskId: number | null;
  setTasks: (tasks: Task[]) => void;
  setSelectedTask: (id: number | null) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  removeTask: (id: number) => void;

  // Time tracking
  activeTimer: { taskId: number; startTime: number; taskTitle: string } | null;
  setActiveTimer: (timer: { taskId: number; startTime: number; taskTitle: string } | null) => void;

  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  viewMode: 'dashboard' | 'projects' | 'tasks' | 'notes' | 'timer' | 'reports' | 'settings';
  setViewMode: (mode: AppState['viewMode']) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Projects
      projects: [],
      selectedProjectId: null,
      setProjects: (projects) => set({ projects }),
      setSelectedProject: (id) => set({ selectedProjectId: id }),
      addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
      updateProject: (project) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === project.id ? project : p)),
        })),
      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
        })),

      // Tasks
      tasks: [],
      selectedTaskId: null,
      setTasks: (tasks) => set({ tasks }),
      setSelectedTask: (id) => set({ selectedTaskId: id }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (task) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
        })),
      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        })),

      // Timer
      activeTimer: null,
      setActiveTimer: (timer) => set({ activeTimer: timer }),

      // UI
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      viewMode: 'dashboard',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: 'devtrack-web-store',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        viewMode: state.viewMode,
      }),
    }
  )
);