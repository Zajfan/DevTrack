import { invoke } from '@tauri-apps/api/core';
import { useProjectIssues, useSyncProjectIssues } from '../hooks/useRepository';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useSubtasks, useCreateSubtask, useUpdateSubtask, useDeleteSubtask, useProjects, useTaskTimeEntries, useTaskTotalTime, useActiveTimer, useStartTimer, useStopTimer, useTimerPause, useTimerResume, useTimeEntryDelete } from '@hooks/useApi';
import { useAppStore } from '@store/appStore';
import { Fragment, useState } from 'react';
import { compareVersions, compareCreatedNewest } from '../utils/versions';
import { cn, getPriorityColor, getStatusColor, formatDuration, formatTimestamp } from '@utils/helpers';
import {
  Plus,
  CheckSquare,
  Edit,
  Trash2,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
  Timer,
  FolderGit2,
  Pause,
  Play,
  ArrowUpDown,
} from 'lucide-react';
import type { Task } from '../types';

export function Tasks({ embedded = false }: { embedded?: boolean }) {
  const { selectedProjectId, setSelectedProject } = useAppStore();
  const { data: projects } = useProjects(false);
  const { data: tasks, isLoading } = useTasks(selectedProjectId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskVersion, setNewTaskVersion] = useState('');
  const [versionFilter, setVersionFilter] = useState('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Todo' | 'Done'>(embedded ? 'Todo' : 'all');
  const [sortBy, setSortBy] = useState<'created' | 'priority' | 'due' | 'version'>(embedded ? 'version' : 'created');

  const issueQuery = useProjectIssues(selectedProjectId, embedded);
  const syncIssues = useSyncProjectIssues(selectedProjectId);
  const [sourceFilter, setSourceFilter] = useState('all');
  const combinedTasks: Task[] = [...(tasks ?? []), ...(embedded ? (issueQuery.data?.issues ?? []).map(issue => ({ id: -issue.number, project_id: selectedProjectId!, title: issue.title, description: issue.description, status: 'Todo', priority: 'Medium', target_version: issue.target_version, created_at: issue.created_at, github_url: issue.url, github_number: issue.number, github_milestone: issue.milestone })) : [])];
  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  const sortVal = (t: Task) => {
    if (sortBy === 'priority') {
      return { High: 0, Medium: 1, Low: 2 }[t.priority] ?? 3;
    }
    if (sortBy === 'due') {
      if (!t.due_date) return 99991231;
      return parseInt(t.due_date.replace(/-/g, ''), 10);
    }
    return t.id; // created (id order)
  };

  const visibleTasks = combinedTasks
    .filter(t => sourceFilter === 'all' || (sourceFilter === 'github' ? !!t.github_url : !t.github_url))
    .filter((t) => statusFilter === 'all' || t.status === statusFilter)
    .filter((t) => versionFilter === 'all' || (t.target_version || '') === versionFilter)
    .sort((a, b) => sortBy === 'version' ? compareVersions(a.target_version || '', b.target_version || '') || (a.target_version || '').localeCompare(b.target_version || '') || a.id - b.id : sortBy === 'created' ? compareCreatedNewest(a,b) : sortVal(a) - sortVal(b));

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProjectId) return;
    setSaveError(null);
    createTask.mutate(
      { projectId: selectedProjectId, data: { title: newTaskTitle.trim(), description: newTaskDescription, priority: newTaskPriority, due_date: newTaskDueDate || undefined, target_version: newTaskVersion.trim() } },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setNewTaskTitle('');
          setNewTaskDescription('');
          setNewTaskPriority('Medium');
          setNewTaskDueDate('');
          setNewTaskVersion('');
        },
        onError: (error) => setSaveError(`Could not create task: ${String(error)}`),
      }
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setSaveError(null);
    updateTask.mutate(
      {
        id: editingTask.id,
        data: {
          title: editingTask.title.trim(),
          description: editingTask.description ?? '',
          priority: editingTask.priority,
          due_date: editingTask.due_date || undefined,
          target_version: editingTask.target_version || '',
        },
      },
      {
        onSuccess: () => setEditingTask(null),
        onError: (error) => setSaveError(`Could not save task: ${String(error)}`),
      }
    );
  };

  const handleToggleStatus = (task: Task) => {
    updateTask.mutate({ id: task.id, data: { status: task.status === 'Done' ? 'Todo' : 'Done' } });
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this task?')) {
      deleteTask.mutate(id);
    }
  };

  if (!selectedProjectId || !selectedProject) {
    return (
      <div className="max-w-xl mx-auto text-center py-12">
        <FolderGit2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Select a Project</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Choose which project's tasks you want to work with</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {(projects || []).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className="native-pane p-4 hover:border-purple-400 dark:hover:border-purple-600 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.path}</p>
            </button>
          ))}
          {!projects?.length && (
            <p className="col-span-full text-sm text-gray-500 dark:text-gray-400">
              No projects yet — create one on the Projects page first.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{embedded ? 'Planned work' : 'Tasks'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {embedded ? 'What’s left to build, grouped by target release.' : selectedProject.name}
            {selectedProject.git && <span className="ml-2 font-mono text-xs">[{selectedProject.git.branch}]</span>}
          </p>
        </div>
        <button onClick={() => { setSaveError(null); setShowCreateModal(true); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {embedded && <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap"><button className="secondary-button" disabled={syncIssues.isPending || issueQuery.isFetching} onClick={() => syncIssues.mutate(1)}>{syncIssues.isPending || issueQuery.isFetching ? 'Loading issues…' : 'Sync GitHub issues'}</button><select aria-label="Filter task source" className="task-version-select" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}><option value="all">Local & GitHub</option><option value="local">Local tasks</option><option value="github">GitHub issues</option></select></div>
        {(issueQuery.error || syncIssues.error || issueQuery.data?.notice) && <p className="repo-notice" role={issueQuery.error || syncIssues.error ? 'alert' : 'status'}>{String(syncIssues.error ?? issueQuery.error ?? issueQuery.data?.notice)}</p>}
        {issueQuery.data?.has_more && <button className="text-action" disabled={syncIssues.isPending} onClick={() => syncIssues.mutate(issueQuery.data!.next_page)}>Load more open issues</button>}
      </div>}
      {/* Sort / filter toolbar */}
      {!isLoading && combinedTasks.length ? (
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort
          </span>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(['version', 'created', 'priority', 'due'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-colors capitalize', sortBy === s ? 'bg-purple-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700')}
              >
                {s === 'created' ? 'Newest' : s}
              </button>
            ))}
          </div>
          <span className="text-gray-400">|</span>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {(['all', 'Todo', 'Done'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-colors', statusFilter === s ? 'bg-purple-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700')}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
          <select aria-label="Filter target version" value={versionFilter} onChange={e => setVersionFilter(e.target.value)} className="task-version-select">
            <option value="all">All versions</option>
            {[...new Set(combinedTasks.map(t => t.target_version || ''))].sort(compareVersions).map(v => <option key={v} value={v}>{v || 'Unscheduled'}</option>)}
          </select>
          <span className="text-gray-400 dark:text-gray-500 text-xs ml-auto">
            {visibleTasks.length} of {combinedTasks.length}
          </span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <TaskCardSkeleton key={i} />)}
        </div>
      ) : !combinedTasks.length ? (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No tasks yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first task for {selectedProject.name}</p>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Create Task
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {!visibleTasks.length && <p className="repo-notice">No tasks match these filters.</p>}
          {visibleTasks.map((task, index) => (
            <Fragment key={task.id}>
            {sortBy === 'version' && (index === 0 || visibleTasks[index - 1].target_version !== task.target_version) && <h2 className="task-version-heading">{task.target_version ? `Version ${task.target_version}` : 'Unscheduled'}<small>{visibleTasks.filter(t => t.target_version === task.target_version && t.status !== 'Done').length} remaining</small></h2>}
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => handleToggleStatus(task)}
              onEdit={() => { setSaveError(null); setEditingTask(task); }}
              onDelete={() => handleDelete(task.id)}
            />
            </Fragment>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTask) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            <form onSubmit={editingTask ? handleSaveEdit : handleCreate} className="space-y-4">
              {saveError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
              <div>
                <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  id="task-title"
                  type="text"
                  value={editingTask ? editingTask.title : newTaskTitle}
                  onChange={(e) => editingTask ? setEditingTask({ ...editingTask, title: e.target.value }) : setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  placeholder="Task title"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="task-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  id="task-desc"
                  value={editingTask ? (editingTask.description ?? '') : newTaskDescription}
                  onChange={(e) => editingTask ? setEditingTask({ ...editingTask, description: e.target.value }) : setNewTaskDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  placeholder="Task description"
                />
              </div>
              <div>
                <label htmlFor="task-version" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target version</label>
                <input id="task-version" type="text" maxLength={100} value={editingTask ? editingTask.target_version || '' : newTaskVersion} onChange={e => editingTask ? setEditingTask({ ...editingTask, target_version: e.target.value }) : setNewTaskVersion(e.target.value)} placeholder="1.0, 0.1.0, or 0.1.0-alpha.1" className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white" />
                <p className="text-xs text-gray-500 mt-1">Leave empty for unscheduled work.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select
                    id="task-priority"
                    value={editingTask ? editingTask.priority : newTaskPriority}
                    onChange={(e) => editingTask ? setEditingTask({ ...editingTask, priority: e.target.value }) : setNewTaskPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="task-due" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input
                    id="task-due"
                    type="date"
                    value={editingTask ? (editingTask.due_date ?? '') : newTaskDueDate}
                    onChange={(e) => editingTask ? setEditingTask({ ...editingTask, due_date: e.target.value || undefined }) : setNewTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowCreateModal(false); setEditingTask(null); }} className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" disabled={createTask.isPending || updateTask.isPending} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCardSkeleton() {
  return (
    <div className="native-pane p-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-5 h-5 rounded border-2 mt-1 bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onToggle, onEdit, onDelete }: { task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [issueLinkError, setIssueLinkError] = useState<string | null>(null);
  const { data: subtasks } = useSubtasks(expanded ? task.id : null);
  const { data: timeEntries } = useTaskTimeEntries(expanded ? task.id : null);
  const { data: totalTime } = useTaskTotalTime(expanded ? task.id : null);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const deleteEntry = useTimeEntryDelete();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const pauseTimer = useTimerPause();
  const resumeTimer = useTimerResume();
  const { data: activeTimerData } = useActiveTimer();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const doneCount = subtasks?.filter((s) => s.done).length ?? 0;
  const running = !!(activeTimerData && 'task_id' in activeTimerData && activeTimerData.task_id === task.id);

  const handleTimerButton = async () => {
    if (running) {
      await stopTimer.mutateAsync(task.id);
    } else {
      await startTimer.mutateAsync(task.id);
    }
  };

  if (task.github_url) return <div className="native-pane p-4 github-issue-row"><div className="flex justify-between gap-3"><div><h3 className="font-medium">{task.title}{task.target_version && <span className="task-version-badge">v{task.target_version}</span>}</h3><p className="text-xs text-gray-500 mt-2">GitHub issue #{task.github_number}{task.github_milestone && ` · ${task.github_milestone}`}</p></div><button className="text-action" onClick={async () => { try { await invoke('project_documentation_link', { id: task.project_id, url: task.github_url }); setIssueLinkError(null); } catch(e) { setIssueLinkError(String(e)); } }}>Open issue ↗</button></div>{task.description && <p className="text-xs text-gray-500 mt-3 whitespace-pre-wrap">{task.description.slice(0, 240)}</p>}{issueLinkError && <p role="alert" className="repo-notice">{issueLinkError}</p>}</div>;
  return (
    <div className={cn('native-pane p-4 transition-colors', task.status === 'Done' && 'opacity-60')}>
      <div className="flex items-start gap-4">
        <button
          onClick={onToggle}
          aria-label={task.status === 'Done' ? 'Mark as todo' : 'Mark as done'}
          className={cn('mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors', task.status === 'Done' ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-purple-500')}
        >
          {task.status === 'Done' && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn('font-medium text-gray-900 dark:text-white cursor-pointer', task.status === 'Done' && 'line-through text-gray-400 dark:text-gray-500')}
              onClick={() => setExpanded(!expanded)}
            >
              {task.title}
              {task.target_version && <span className="task-version-badge">v{task.target_version}</span>}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); handleTimerButton(); }}
                title={running ? 'Stop timer' : 'Start timer'}
                aria-label={running ? 'Stop timer' : 'Start timer'}
                className={cn('p-1.5 rounded transition-colors', running ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700')}
              >
                <Timer className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                aria-label="Edit task"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                aria-label="Delete task"
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? 'Collapse details' : 'Expand details'}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {task.description && !expanded && (
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{task.description}</p>
          )}
          <div className="mt-2.5 flex items-center gap-2.5 flex-wrap">
            <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium', getPriorityColor(task.priority))}>
              {task.priority}
            </span>
            <span className={cn('px-2 py-0.5 text-xs rounded-full font-medium', getStatusColor(task.status))}>
              {task.status}
            </span>
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString()}
              </span>
            )}
            {subtasks?.length ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {doneCount}/{subtasks.length} subtasks
              </span>
            ) : null}
          </div>

          {/* Expanded detail: description + subtasks + time history */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mb-4">{task.description}</p>
              )}
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Sub-tasks {subtasks?.length ? `(${doneCount}/${subtasks.length})` : ''}
                </h4>
                {timeEntries?.length ? (
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    total {formatDuration(totalTime ?? 0)}
                  </span>
                ) : null}
              </div>
              <div className="space-y-1.5 mb-3">
                {subtasks?.map((st) => (
                  <div key={st.id} className="flex items-center gap-2.5 group">
                    <button
                      onClick={() => updateSubtask.mutate({ id: st.id, data: { done: !st.done } })}
                      aria-label={st.done ? 'Mark subtask undone' : 'Mark subtask done'}
                      className={cn('w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors', st.done ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600 hover:border-purple-500')}
                    >
                      {st.done && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <span className={cn('text-sm flex-1', st.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200')}>
                      {st.title}
                    </span>
                    <button
                      onClick={() => deleteSubtask.mutate(st.id)}
                      aria-label="Delete subtask"
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {!subtasks?.length && <p className="text-sm text-gray-400 dark:text-gray-500">No sub-tasks yet</p>}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSubtaskTitle.trim()) return;
                  createSubtask.mutate(
                    { taskId: task.id, data: { title: newSubtaskTitle.trim() } },
                    { onSuccess: () => setNewSubtaskTitle('') }
                  );
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a sub-task…"
                  className="flex-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <button type="submit" className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </form>

              {/* Time history */}
              {timeEntries?.length ? (
                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    Time entries
                  </h4>
                  <div className="space-y-1.5">
                    {timeEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2.5 text-sm group">
                        <span className="text-xs text-gray-400 font-mono flex-shrink-0 w-24">
                          {formatTimestamp(Number(entry.start_time))}
                        </span>
                        <span className="font-mono text-gray-700 dark:text-gray-200 flex-1">
                          {formatDuration(entry.duration_seconds)}
                          {entry.end_time === null && <span className="ml-2 text-purple-500 text-xs">running</span>}
                        </span>
                        <button
                          onClick={() => { if (confirm('Delete this time entry?')) deleteEntry.mutate(entry.id); }}
                          aria-label="Delete time entry"
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-red-500 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}