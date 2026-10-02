import {
  useProjects,
  useCreateProject,
  useDeleteProject,
  useUpdateProject,
  useProjectStats,
} from "@hooks/useApi";
import { CheckSquare, Clock } from "lucide-react";
import { api } from "@api/client";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isTauri } from "@tauri-apps/api/core";
import { cn, formatDuration } from "@utils/helpers";
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
  TerminalSquare,
} from "lucide-react";
import { useAppStore } from "@store/appStore";
import type { Project } from "../types";

export function Projects() {
  const navigate = useNavigate();
  const { data: projects, isLoading, error } = useProjects(false);
  const { data: archivedProjects } = useProjects(true);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const { selectedProjectId, setSelectedProject } = useAppStore();

  const dialogRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [pickingDirectory, setPickingDirectory] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState(".");
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<{
    id: number;
    name: string;
    tags: string;
  } | null>(null);
  const [commitProject, setCommitProject] = useState<{
    id: number;
    name: string;
    message: string;
    status: string | null;
  } | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");

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

  const displayedProjects = (
    filter === "archived" ? (archivedProjects ?? []) : (projects ?? [])
  )
    .filter((project) => filter !== "active" || project.status === "Active")
    .filter((project) => filter !== "archived" || project.status === "Archived")
    .filter((project) =>
      `${project.name} ${project.path} ${project.tags}`
        .toLowerCase()
        .includes(search.toLowerCase()),
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
            Your projects, branches, and progress in one place.
          </p>
        </div>
        <button onClick={handleAddProject} className="primary-button">
          <Plus className="w-4 h-4" />
          Add Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by name, path, or tag…"
            aria-label="Filter projects"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "archived"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === f
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          Could not load projects: {String(error)}
        </p>
      )}
      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))
        ) : displayedProjects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <GitBranch className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No projects found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {search || filter !== "all"
                ? "Try another search or filter."
                : "Add a local folder to start tracking your work."}
            </p>
            <button
              onClick={handleAddProject}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Create Project
            </button>
          </div>
        ) : (
          displayedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isSelected={selectedProjectId === project.id}
              onSelect={() => { setSelectedProject(project.id); navigate(`/projects/${project.id}`); }}
              onEdit={() =>
                setEditingProject({
                  id: project.id,
                  name: project.name,
                  tags: project.tags,
                })
              }
              onDelete={() => handleDelete(project.id)}
              onArchive={() =>
                handleArchive(project.id, project.status !== "Archived")
              }
              onCommit={() =>
                setCommitProject({
                  id: project.id,
                  name: project.name,
                  message: "",
                  status: null,
                })
              }
              onOpenPath={async () => {
                try {
                  await api.projects.openPath(project.id);
                } catch (e) {
                  console.error(e);
                }
              }}
              onOpenTerminal={async () => {
                try {
                  await api.projects.openTerminal(project.id);
                } catch (e) {
                  console.error(e);
                }
              }}
              isArchived={project.status === "Archived"}
            />
          ))
        )}
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

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Edit Project
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateProject.mutate({
                  id: editingProject.id,
                  data: { tags: editingProject.tags },
                });
                setEditingProject(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editingProject.tags}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      tags: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  placeholder="frontend, backend, api"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
                  setCommitProject({ ...commitProject, status: result });
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

function ProjectCard({
  project,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onArchive,
  onCommit,
  onOpenPath,
  onOpenTerminal,
  isArchived,
}: {
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onCommit: () => void;
  onOpenPath: () => void;
  onOpenTerminal: () => void;
  isArchived: boolean;
}) {
  const git = project.git;
  const { data: stats } = useProjectStats(project.id);

  return (
    <div
      className={cn(
        "project-card bg-white dark:bg-gray-800 rounded-xl p-5 border transition-all duration-200 flex flex-col",
        isSelected
          ? "border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/20"
          : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700",
        isArchived && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <GitBranch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              <button
                className="project-name"
                onClick={onSelect}
                aria-pressed={isSelected}
              >
                {project.name}
              </button>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {project.path}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            aria-label="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            className={cn(
              "p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500",
              isArchived && "text-green-500",
            )}
            aria-label={isArchived ? "Restore" : "Archive"}
          >
            {isArchived ? (
              <ArchiveRestore className="w-4 h-4" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Git Info */}
      {git && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <GitBranch className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="font-mono text-gray-700 dark:text-gray-300 truncate">
              {git.branch}
            </span>
            {git.ahead > 0 && (
              <span className="text-green-600 flex-shrink-0">↑{git.ahead}</span>
            )}
            {git.behind > 0 && (
              <span className="text-red-600 flex-shrink-0">↓{git.behind}</span>
            )}
            {git.stashes > 0 && (
              <span className="text-yellow-600 flex-shrink-0">
                ${git.stashes}
              </span>
            )}
            {git.is_dirty && (
              <span className="text-red-500 flex-shrink-0">●</span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommit();
            }}
            className={cn(
              "p-1.5 rounded-lg flex-shrink-0 transition-colors",
              git.is_dirty
                ? "text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                : "text-gray-300 dark:text-gray-600",
            )}
            aria-label="Quick commit"
            title={
              git.is_dirty ? "Stage all, commit and push" : "Nothing to commit"
            }
          >
            <GitCommitHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tags */}
      {project.tags && (
        <div className="mb-4 flex flex-wrap gap-1">
          {project.tags.split(",").map((tag) => (
            <span
              key={tag.trim()}
              className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
            >
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      {stats && (stats.open_tasks > 0 || stats.total_seconds > 0) && (
        <div className="mb-3 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <CheckSquare className="w-3.5 h-3.5 text-purple-500" />
            {stats.open_tasks} open
          </span>
          <span className="flex items-center gap-1.5 font-mono text-gray-600 dark:text-gray-300">
            <Clock className="w-3.5 h-3.5 text-green-500" />
            {formatDuration(stats.total_seconds)}
          </span>
        </div>
      )}

      {/* Status & Path */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-auto pt-2">
        <span
          className={cn(
            "px-2 py-0.5 rounded-full",
            project.status === "Active" &&
              "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
            project.status === "Paused" &&
              "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
            project.status === "Archived" &&
              "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400",
          )}
        >
          {project.status}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="icon-button"
            onClick={onOpenPath}
            aria-label={`Open ${project.name} folder`}
            title="Open folder"
          >
            <FolderOpen size={15} />
          </button>
          <button
            className="icon-button"
            onClick={onOpenTerminal}
            aria-label={`Open ${project.name} terminal`}
            title="Open terminal"
          >
            <TerminalSquare size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
