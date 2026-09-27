import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Project, type Task, type SubTask, type TimeEntry, type TimeLogSummary, type DashboardSummary, type CreateProjectRequest, type UpdateProjectRequest, type CreateTaskRequest, type UpdateTaskRequest, type CreateSubTaskRequest, type UpdateSubTaskRequest, type NotesRequest, type ActiveTimerResponse, type GitInfo, type TimeLogEntry } from '../api/client';

export const useProjects = (archived = false) =>
  useQuery<Project[]>({
    queryKey: ['projects', archived],
    queryFn: () => api.projects.list(archived),
  });

export const useProject = (id: number | null) =>
  useQuery<Project>({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(id!),
    enabled: id !== null,
  });

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRequest) => api.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectRequest }) =>
      api.projects.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useProjectGit = (id: number | null) =>
  useQuery<GitInfo>({
    queryKey: ['project-git', id],
    queryFn: () => api.projects.git(id!),
    enabled: id !== null,
  });

export const useProjectOpenPath = () => {
  return useMutation({
    mutationFn: (id: number) => api.projects.openPath(id),
  });
};

export const useProjectOpenTerminal = () => {
  return useMutation({
    mutationFn: (id: number) => api.projects.openTerminal(id),
  });
};

export const useProjectScan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => api.projects.scan(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useTasks = (projectId: number | null) =>
  useQuery<Task[]>({
    queryKey: ['tasks', projectId],
    queryFn: () => api.tasks.list(projectId!),
    enabled: projectId !== null,
  });

export const useGlobalTasks = () =>
  useQuery<Task[]>({
    queryKey: ['tasks', 'global'],
    queryFn: () => api.tasks.global(),
  });

export const useTask = (id: number | null) =>
  useQuery<Task>({
    queryKey: ['task', id],
    queryFn: () => api.tasks.get(id!),
    enabled: id !== null,
  });

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: CreateTaskRequest }) =>
      api.tasks.create(projectId, data),
    onSuccess: () => {
      // prefix-match: invalidates ['tasks', projectId] AND ['tasks', 'global']
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTaskRequest }) =>
      api.tasks.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.tasks.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });
};

export const useToggleTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.tasks.toggle(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    },
  });
};

export const useSubtasks = (taskId: number | null) =>
  useQuery<SubTask[]>({
    queryKey: ['subtasks', taskId],
    queryFn: () => api.subtasks.list(taskId!),
    enabled: taskId !== null,
  });

export const useCreateSubtask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: CreateSubTaskRequest }) =>
      api.subtasks.create(taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', taskId] });
    },
  });
};

export const useUpdateSubtask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSubTaskRequest }) =>
      api.subtasks.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', id] });
    },
  });
};

export const useDeleteSubtask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.subtasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks'] });
    },
  });
};

export const useNotes = (projectId: number | null) =>
  useQuery<string>({
    queryKey: ['notes', projectId],
    queryFn: () => api.notes.get(projectId!),
    enabled: projectId !== null,
  });

export const useUpdateNotes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, content }: { projectId: number; content: string }) =>
      api.notes.update(projectId, content),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['notes', projectId] });
    },
  });
};

export const useTimeEntries = (period = 'today') =>
  useQuery<TimeEntry[]>({
    queryKey: ['time-entries', period],
    queryFn: () => api.timeEntries.list(period),
  });

export const useTimeReport = (period = 'today') =>
  useQuery<TimeLogSummary>({
    queryKey: ['time-report', period],
    queryFn: () => api.timeEntries.report(period),
  });

export const useActiveTimer = () =>
  useQuery<ActiveTimerResponse | null>({
    queryKey: ['active-timer'],
    queryFn: () => api.timer.active(),
    refetchInterval: 1000,
  });

export const useStartTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => api.timer.start(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
    },
  });
};

export const useStopTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) => api.timer.stop(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
    },
  });
};

export const useDashboardSummary = () =>
  useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.system.dashboardSummary(),
    refetchInterval: 5000,
  });

export const useBackup = () =>
  useMutation({
    mutationFn: () => api.system.backup(),
  });

export const useExportData = () =>
  useMutation({
    mutationFn: () => api.system.exportData(),
  });

export const useImportData = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (path: string) => api.system.importData(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });
};

export const useDataDir = () =>
  useQuery<string>({
    queryKey: ['data-dir'],
    queryFn: () => api.system.getDataDir(),
    staleTime: Infinity,
  });