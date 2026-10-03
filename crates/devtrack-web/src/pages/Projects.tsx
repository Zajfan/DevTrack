import { ProjectTag } from "../components/ProjectTag";
import { projectTags, hasProjectTag, prioritizeProjectTags } from "../utils/tags";
import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
  useGlobalTasks,
} from "@hooks/useApi";
import { api } from "@api/client";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { isTauri, invoke } from "@tauri-apps/api/core";
import type { WorkHistory } from "../types/repository";
import { cn } from "@utils/helpers";
import { selectProjectDirectory } from "../components/NativeDialogs";
import {
  Plus,
  Search,
  GitBranch,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  GitCommitHorizontal,
  FolderOpen,
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAppStore } from "@store/appStore";
import { useQueryClient } from "@tanstack/react-query";
import type { Project } from "../types";
import { ProjectEditDialog } from "../components/ProjectEditDialog";
import { groupProjectsByFolder, projectFolderGroup, sortProjects, type ProjectSortKey, type SortDirection } from "../utils/projectOrganization";

export function Projects() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: projects, isLoading, error } = useProjects(false);
  const { data: archivedProjects, isLoading: archivedLoading, error: archivedError } = useProjects(true);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const { selectedProjectId, setSelectedProject } = useAppStore();
  const { data: allTasks = [] } = useGlobalTasks();
  const queryClient = useQueryClient();

  const dialogRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const selectedTag = searchParams.get("tag")?.trim() ?? "";
  const [pickingDirectory, setPickingDirectory] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState(".");
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [commitProject, setCommitProject] = useState<{
    id: number;
    name: string;
    message: string;
    status: string | null;
  } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "archived">("all");
  const [groupBy, setGroupBy] = useState<"folder" | "status" | "none">("folder");
  const [sortKey, setSortKey] = useState<ProjectSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const activeTag = selectedTag;

  useEffect(() => {
    setSearch("");
    setFilter("all");
  }, [location.pathname]);

  const handleAddProject = () => {
    setDirectoryError(null);
    createProject.reset();
    setShowCreateModal(true);
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowCreateModal(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!showCreateModal) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled)",
        );
        if (controls?.length) {
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
      if (event.key === "Escape" && !createProject.isPending)
        setShowCreateModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previousFocus?.focus();
    };
  }, [showCreateModal, createProject.isPending]);

  const handleBrowse = async () => {
    setPickingDirectory(true);
    setDirectoryError(null);
    try {
      const path = await selectProjectDirectory();
      if (path) {
        setNewProjectPath(path);
        if (!newProjectName.trim())
          setNewProjectName(path.split(/[\\/]/).filter(Boolean).pop() ?? "");
      }
    } catch {
      setDirectoryError(
        "Could not open the folder picker. You can enter the folder path directly.",
      );
    } finally {
      setPickingDirectory(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createProject.mutate(
      { name: newProjectName.trim(), path: newProjectPath.trim() },
      {
        onSuccess: (project) => {
          setShowCreateModal(false);
          setNewProjectName("");
          setNewProjectPath(".");
          setSelectedProject(project.id);
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject.mutate(id);
    }
  };

  const handleArchive = (id: number, archive: boolean) => {
    updateProject.mutate({
      id,
      data: { status: archive ? "Archived" : "Active" },
    });
  };

  const sourceProjects = activeTag || filter === "archived" ? (archivedProjects ?? []) : (projects ?? []);
  const displayedProjects = sortProjects(sourceProjects
    .filter((project) => !activeTag || hasProjectTag(project.tags, activeTag))
    .filter((project) => filter === "all" || project.status.toLowerCase() === filter)
    .filter((project) =>
      `${project.name} ${project.path} ${project.tags}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ), sortKey, sortDirection);

  const taskCounts = new Map<number, number>();
  for (const task of allTasks) {
    if (!['done', 'completed', 'closed'].includes(task.status.toLowerCase())) {
      taskCounts.set(task.project_id, (taskCounts.get(task.project_id) ?? 0) + 1);
    }
  }
  const projectGroups: [string, Project[]][] = groupBy === "folder"
    ? groupProjectsByFolder(displayedProjects).map(([label, rows]) => [label, sortProjects(rows, sortKey, sortDirection)])
    : groupBy === "status"
      ? ["Active", "Paused", "Archived"].map(status => [status, displayedProjects.filter(project => project.status === status)] as [string, Project[]]).filter(([, rows]) => rows.length > 0)
      : [["Projects", displayedProjects]];

  const listLoading = activeTag || filter === "archived" ? archivedLoading : isLoading;
  const listError = activeTag || filter === "archived" ? archivedError : error;
  const changeSort = (key: ProjectSortKey) => {
    if (sortKey === key) setSortDirection(current => current === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDirection(key === "lastAccessed" ? "desc" : "asc"); }
  };
  const sortButton = (label: string, key: ProjectSortKey) => (
    <button className="project-sort-button" onClick={() => changeSort(key)} aria-label={`Sort by ${label}`}>
      {label}{sortKey === key ? (sortDirection === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ArrowDownUp size={12} />}
    </button>
  );

  return (
    <div className="space-y-6 projects-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Projects
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Search, sort, and group every project folder.
          </p>
        </div>
        <button onClick={handleAddProject} className="primary-button">
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Filters */}
      <div className="projects-controls">
        <div className="projects-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            placeholder="Search projects, locations, or tags…"
            aria-label="Filter projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="projects-search-input"
          />
        </div>
        <label className="projects-filter"><span>Status</span><select aria-label="Filter by status" value={filter} onChange={event => setFilter(event.target.value as typeof filter)}>
          <option value="all">All statuses</option><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option>
        </select></label>
        <label className="projects-filter"><span>Tag</span><select aria-label="Filter by tag" value={activeTag} onChange={event => { const value = event.target.value; const next = new URLSearchParams(searchParams); if (value) next.set("tag", value); else next.delete("tag"); setSearchParams(next); }}>
          <option value="">All tags</option>{[...new Set((archivedProjects ?? projects ?? []).flatMap(project => projectTags(project.tags)))].sort((a,b) => a.localeCompare(b, undefined, { sensitivity: "base" })).map(tag => <option key={tag.toLowerCase()} value={tag}>{tag}</option>)}
        </select></label>
        <label className="projects-filter"><span>Group</span><select aria-label="Group projects by" value={groupBy} onChange={event => setGroupBy(event.target.value as typeof groupBy)}>
          <option value="folder">Folder</option><option value="status">Status</option><option value="none">No grouping</option>
        </select></label>
      </div>

      <div className="projects-result-summary" role="status">
        <span><strong>{displayedProjects.length}</strong> of {sourceProjects.length} projects</span>
        {activeTag && <button className="text-action" onClick={() => { const next = new URLSearchParams(searchParams); next.delete("tag"); setSearchParams(next); }}>Clear “{activeTag}” filter ×</button>}
      </div>

      {listError && (
        <p role="alert" className="text-sm text-red-600">
          Could not load projects: {String(listError)}
        </p>
      )}
      <div className="project-table-shell">
        {listLoading ? <div className="project-table-loading" aria-label="Loading projects">{Array.from({ length: 12 }, (_, index) => <div key={index} />)}</div>
          : displayedProjects.length === 0 ? <div className="project-empty-state"><GitBranch size={28} /><h2>No projects found</h2><p>{activeTag || search || filter !== "all" ? "Try a different search or clear a filter." : "Add a folder to start tracking a project."}</p><button onClick={handleAddProject} className="primary-button"><Plus size={15} />Add Project</button></div>
          : projectGroups.map(([group, rows]) => <section className="project-table-group" key={group}>
            {groupBy !== "none" && <header className="project-group-heading"><FolderOpen size={14} /><h2>{group}</h2><span>{rows.length}</span></header>}
            <div className="project-table-scroll"><table className="project-table">
              <thead><tr>
                <th scope="col" aria-sort={sortKey === "name" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>{sortButton("Project", "name")}</th>
                {groupBy !== "folder" && <th scope="col" aria-sort={sortKey === "folder" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>{sortButton("Folder", "folder")}</th>}
                <th scope="col" aria-sort={sortKey === "status" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>{sortButton("Status", "status")}</th><th scope="col">Tags</th><th scope="col" className="project-number-cell">Open tasks</th><th scope="col"><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody>{rows.map(project => {
                const tags = projectTags(project.tags);
                const openCount = taskCounts.get(project.id) ?? 0;
                const folder = projectFolderGroup(project.path);
                return <tr key={project.id} className={cn("project-table-row", selectedProjectId === project.id && "is-selected", project.status === "Archived" && "is-archived")}>
                  <td className="project-table-name"><button onClick={() => { setSelectedProject(project.id); navigate(`/projects/${project.id}`); }} title={project.name}>{project.name}</button><small title={project.path}>{project.path}</small></td>
                  {groupBy !== "folder" && <td className="project-table-folder" title={project.path}>{folder}</td>}
                  <td><span className={`project-status-pill ${project.status.toLowerCase()}`}><i />{project.status}</span></td>
                  <td><div className="project-table-tags">{prioritizeProjectTags(project.tags).map(tag => <ProjectTag key={tag.toLowerCase()} tag={tag} />)}{tags.length > 3 && <span className="project-tag-overflow" title={tags.filter(tag => !prioritizeProjectTags(project.tags).includes(tag)).join(", ")}>+{tags.length - 3}</span>}</div></td>
                  <td className="project-number-cell"><span className={cn("project-task-count", openCount > 0 && "has-open-tasks")}>{openCount}</span></td>
                  <td><div className="project-row-actions">
                    <button className="project-action" aria-label={`Edit ${project.name}`} title="Edit project" onClick={() => setEditingProject(project)}><Edit size={14} /></button>
                    {project.git?.is_dirty && <button className="project-action" aria-label={`Quick commit ${project.name}`} title="Quick commit" onClick={() => setCommitProject({ id: project.id, name: project.name, message: "", status: null })}><GitCommitHorizontal size={14} /></button>}
                    <button className="project-action" aria-label={`Open ${project.name} folder`} title="Open folder" onClick={() => void api.projects.openPath(project.id).catch(console.error)}><FolderOpen size={14} /></button>
                    <button className="project-action" aria-label={`${project.status === "Archived" ? "Restore" : "Archive"} ${project.name}`} title={project.status === "Archived" ? "Restore" : "Archive"} onClick={() => handleArchive(project.id, project.status !== "Archived")}>{project.status === "Archived" ? <ArchiveRestore size={14} /> : <Archive size={14} />}</button>
                    <button className="project-action danger" aria-label={`Delete ${project.name}`} title="Delete project" onClick={() => handleDelete(project.id)}><Trash2 size={14} /></button>
                  </div></td>
                </tr>;
              })}</tbody>
            </table></div>
          </section>)}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2
              id="new-project-title"
              className="text-xl font-semibold text-gray-900 dark:text-white mb-1"
            >
              New Project
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Register an existing folder in your workspace.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              {directoryError && (
                <p
                  role="alert"
                  className="text-sm text-red-600 dark:text-red-400"
                >
                  {directoryError}
                </p>
              )}
              {createProject.isError && (
                <p
                  role="alert"
                  className="text-sm text-red-600 dark:text-red-400"
                >
                  Could not create project: {String(createProject.error)}
                </p>
              )}
              <div>
                <label
                  htmlFor="new-project-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Project Name
                </label>
                <input
                  id="new-project-name"
                  required
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="My Awesome Project"
                  autoFocus
                />
              </div>
              <div>
                <label
                  htmlFor="new-project-path"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Path
                </label>
                <input
                  id="new-project-path"
                  required
                  type="text"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  placeholder="/home/you/projects/my-project"
                />
                {isTauri() && (
                  <button
                    type="button"
                    onClick={handleBrowse}
                    disabled={pickingDirectory}
                    className="mt-2 text-sm text-purple-600 flex items-center gap-2"
                  >
                    <FolderOpen size={15} />
                    {pickingDirectory ? "Choosing folder…" : "Browse folders"}
                  </button>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    createProject.isPending ||
                    !newProjectName.trim() ||
                    !newProjectPath.trim()
                  }
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {createProject.isPending ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProject && <ProjectEditDialog project={editingProject} onClose={() => setEditingProject(null)} />}
      {/* Quick Commit Modal */}
      {commitProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              Quick Commit
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Stage all changes in{" "}
              <span className="font-mono">{commitProject.name}</span>, commit
              and push
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!commitProject.message.trim()) return;
                setCommitProject({ ...commitProject, status: "committing…" });
                try {
                  const result = await api.projects.gitCommit(
                    commitProject.id,
                    commitProject.message.trim(),
                  );
                  let status = result;
                  try {
                    const history = await invoke<WorkHistory>("project_history", { id: commitProject.id, refresh: true, page: 1 });
                    queryClient.setQueryData(["project-history", commitProject.id], history);
                  } catch {
                    status = `${result} (history refresh failed; refresh project work to update counts)`;
                  }
                  setCommitProject({ ...commitProject, status });
                  setTimeout(() => setCommitProject(null), 1500);
                } catch (error) {
                  setCommitProject({
                    ...commitProject,
                    status: `Failed: ${String(error)}`,
                  });
                }
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="commit-message"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Commit message
                </label>
                <input
                  id="commit-message"
                  type="text"
                  value={commitProject.message}
                  onChange={(e) =>
                    setCommitProject({
                      ...commitProject,
                      message: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  placeholder="feat: what changed"
                  autoFocus
                />
              </div>
              {commitProject.status && (
                <p
                  className={cn(
                    "text-sm",
                    commitProject.status.startsWith("Failed")
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400",
                  )}
                >
                  {commitProject.status}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCommitProject(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  <GitCommitHorizontal className="w-4 h-4" />
                  Commit & Push
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
