import { useProjects, useCreateProject, useDeleteProject, useUpdateProject } from '@hooks/useApi';
import { useState } from 'react';
import { cn } from '@utils/helpers';
import { selectProjectDirectory } from '../components/NativeDialogs';
import {
  Plus,
  Search,
  GitBranch,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  Settings,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { useAppStore } from '@store/appStore';
import type { Project } from '../types';

export function Projects() {
  const { data: projects, isLoading, error } = useProjects(false);
  const { data: archivedProjects } = useProjects(true);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const { selectedProjectId, setSelectedProject } = useAppStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('.');
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: number; name: string; tags: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');

  const handleAddProject = async () => {
    setDirectoryError(null);
    createProject.reset();
    try {
      const path = await selectProjectDirectory();
      if (path) setNewProjectPath(path);
    } catch (error) {
      setDirectoryError(`Could not open the folder picker. Enter the project path below. ${String(error)}`);
    } finally {
      setShowCreateModal(true);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createProject.mutate(
      { name: newProjectName.trim(), path: newProjectPath },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setNewProjectName('');
          setNewProjectPath('.');
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      deleteProject.mutate(id);
    }
  };

  const handleArchive = (id: number, archive: boolean) => {
    updateProject.mutate({ id, data: { status: archive ? 'Archived' : 'Active' } });
  };

  const displayedProjects = filter === 'archived' 
    ? (archivedProjects || []) 
    : (projects || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your development projects</p>
        </div>
        <button
          onClick={handleAddProject}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
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
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'archived'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))
        ) : displayedProjects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <GitBranch className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects found</h3>
            <p className="text-gray-500 dark:text-gray-400">Get started by creating your first project</p>
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
              onSelect={() => setSelectedProject(project.id)}
              onEdit={() => setEditingProject({ id: project.id, name: project.name, tags: project.tags })}
              onDelete={() => handleDelete(project.id)}
              onArchive={() => handleArchive(project.id, project.status !== 'Archived')}
              isArchived={project.status === 'Archived'}
            />
          ))
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {directoryError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{directoryError}</p>}
              {createProject.isError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  Could not create project: {String(createProject.error)}
                </p>
              )}
              <div>
                <label htmlFor="new-project-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project Name
                </label>
                <input
                  id="new-project-name"
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  placeholder="My Awesome Project"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="new-project-path" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Path
                </label>
                <input
                  id="new-project-path"
                  type="text"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  placeholder="."
                />
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
                  disabled={createProject.isPending}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {createProject.isPending ? 'Creating...' : 'Create Project'}
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Edit Project</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateProject.mutate({ id: editingProject.id, data: { tags: editingProject.tags } });
              setEditingProject(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={editingProject.tags}
                  onChange={(e) => setEditingProject({ ...editingProject, tags: e.target.value })}
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
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  Save
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
  isArchived,
}: {
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  isArchived: boolean;
}) {
  const git = project.git;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border transition-all duration-200 cursor-pointer',
        isSelected
          ? 'border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700',
        isArchived && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <GitBranch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{project.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{project.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            aria-label="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
            className={cn('p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500', isArchived && 'text-green-500')}
            aria-label={isArchived ? 'Restore' : 'Archive'}
          >
            {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500"
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Git Info */}
      {git && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="w-4 h-4 text-gray-500" />
            <span className="font-mono text-gray-700 dark:text-gray-300">{git.branch}</span>
            {git.ahead > 0 && <span className="text-green-600">↑{git.ahead}</span>}
            {git.behind > 0 && <span className="text-red-600">↓{git.behind}</span>}
            {git.stashes > 0 && <span className="text-yellow-600">${git.stashes}</span>}
            {git.is_dirty && <span className="text-red-500">●</span>}
          </div>
        </div>
      )}

      {/* Tags */}
      {project.tags && (
        <div className="mb-4 flex flex-wrap gap-1">
          {project.tags.split(',').map((tag) => (
            <span key={tag.trim()} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
              {tag.trim()}
            </span>
          ))}
        </div>
      )}

      {/* Status & Path */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span className={cn(
          'px-2 py-0.5 rounded-full',
          project.status === 'Active' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
          project.status === 'Paused' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
          project.status === 'Archived' && 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
        )}>
          {project.status}
        </span>
        <span className="truncate max-w-[150px]">{project.path}</span>
      </div>
    </div>
  );
}
