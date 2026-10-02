import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { DirectoryListing, WorkHistory, PlannedIssues } from "../types/repository";

export const useProjectDirectory = (id: number, path: string) =>
  useQuery({
    queryKey: ["project-directory", id, path],
    queryFn: () => invoke<DirectoryListing>("project_directory", { id, path }),
    enabled: Number.isSafeInteger(id) && id > 0,
  });
export const useProjectFile = (id: number, path: string | null) =>
  useQuery({
    queryKey: ["project-file", id, path],
    queryFn: () => invoke<string>("project_file", { id, path }),
    enabled: !!path,
  });
export const useProjectHistory = (id: number, enabled: boolean) =>
  useQuery({
    queryKey: ["project-history", id],
    queryFn: () =>
      invoke<WorkHistory>("project_history", { id, refresh: false }),
    enabled,
  });
export const useSyncProjectHistory = (id: number) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (page: number = 1) =>
      invoke<WorkHistory>("project_history", { id, refresh: true, page }),
    onSuccess: (data) => client.setQueryData(["project-history", id], data),
  });
};
export const openProjectGitHub = (id: number, sha?: string) =>
  invoke<void>("project_github_open", { id, sha });

export const useProjectIssues = (id: number | null, enabled: boolean) => useQuery({ queryKey: ['project-issues', id], queryFn: () => invoke<PlannedIssues>('project_issues', { id, refresh: false }), enabled: enabled && !!id });
export const useSyncProjectIssues = (id: number | null) => { const client = useQueryClient(); return useMutation({ mutationFn: (page: number = 1) => invoke<PlannedIssues>('project_issues', { id, refresh: true, page }), onSuccess: data => client.setQueryData(['project-issues', id], data) }); };
