import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, GitCommitHorizontal, CircleDot, Play, Square } from 'lucide-react';
import { useWorkspaceWork } from '../hooks/useWorkspaceWork';
import { useUpdateTask, useActiveTimer, useStartTimer, useStopTimer } from '../hooks/useApi';
import { compareVersions, compareCreatedNewest } from '../utils/versions';
import type { WorkItem } from '../utils/workspaceWork';

export function WorkspaceWorkStatus({ work }: { work: ReturnType<typeof useWorkspaceWork> }) {
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-xs text-gray-500 dark:text-gray-400">{work.isLoading || work.isFetching ? 'Loading repository work…' : 'Local tasks and loaded repository work. Refresh to fetch current GitHub data.'}</p>
      <button className="secondary-button" disabled={work.refreshing || work.isLoading} onClick={work.refresh}>{work.refreshing ? 'Refreshing…' : 'Refresh GitHub'}</button>
    </div>
    {(work.error || work.refreshError) && <p className="repo-notice" role="alert">Some work could not be loaded: {work.refreshError || work.error}. Available local and cached work remains visible.</p>}
    {work.notices.length > 0 && <details className="text-xs text-gray-500 dark:text-gray-400"><summary className="cursor-pointer">Repository loading details ({work.notices.length})</summary><ul className="mt-2 space-y-1">{work.notices.map((notice, i) => <li key={i}>{notice}</li>)}</ul></details>}
  </div>;
}

export function WorkspaceWorkPanel({ readOnly = false }: { readOnly?: boolean }) {
  const work = useWorkspaceWork();
  const navigate = useNavigate();
  const updateTask = useUpdateTask();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const { data: timer } = useActiveTimer();
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [project, setProject] = useState('all');
  const [version, setVersion] = useState('all');
  const [sort, setSort] = useState('version');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const priority = (item: WorkItem) => ({ High: 0, Medium: 1, Low: 2 }[item.priority] ?? 3);
  const visible = work.items.filter(item =>
    (source === 'all' || item.source === source) &&
    (status === 'all' || item.status === status) &&
    (project === 'all' || item.project_ids.includes(Number(project))) &&
    (version === 'all' || (item.target_version || '') === version) &&
    [item.title, item.description, item.project_name, item.commit?.category, item.commit?.scope,
      ...(item.commit?.files.flatMap(file => [file.path, ...file.functions_added]) ?? [])]
      .join(' ').toLowerCase().includes(search.trim().toLowerCase())
  ).sort((a, b) => sort === 'version' ? compareVersions(a.target_version || '', b.target_version || '') || a.title.localeCompare(b.title)
    : sort === 'priority' ? priority(a) - priority(b) : compareCreatedNewest(a, b));
  const run = async (action: () => Promise<unknown>) => {
    setActionError('');
    try { await action(); } catch (error) { setActionError(String(error)); }
  };
  const openItem = (item: WorkItem) => navigate(`/projects/${item.project_id}?tab=${item.source === 'commit' ? 'work' : 'planned'}`);
  return <section className="space-y-4" aria-label={readOnly ? 'Work report' : 'Workspace tasks'}>
    <WorkspaceWorkStatus work={work} />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Work totals">
      {[
        ['Open work', work.summary.open, `${work.summary.localOpen} local tasks · ${work.summary.githubOpen} GitHub issues`],
        ['Completed work', work.summary.completed, `${work.summary.localCompleted} local tasks · ${work.summary.commitCompleted} meaningful commits`],
        ['Projects with work', new Set(work.items.flatMap(item => item.project_ids)).size, 'Repository work counted once across totals'],
      ].map(([label, value, detail]) => <div key={label} className="native-pane p-4"><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="text-2xl font-semibold text-gray-900 dark:text-white">{work.isLoading ? '—' : value}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{detail}</p></div>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <input aria-label="Search work" placeholder="Search tasks, files or functions…" className="task-version-select flex-1 min-w-48" value={search} onChange={e => setSearch(e.target.value)} />
      <select aria-label="Filter work source" className="task-version-select" value={source} onChange={e => setSource(e.target.value)}><option value="all">All sources</option><option value="local">Local tasks</option><option value="github">GitHub issues</option><option value="commit">Meaningful commits</option></select>
      <select aria-label="Filter work status" className="task-version-select" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="Todo">Open</option><option value="Done">Completed</option></select>
      <select aria-label="Filter work project" className="task-version-select" value={project} onChange={e => setProject(e.target.value)}><option value="all">All projects</option>{work.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <select aria-label="Filter work version" className="task-version-select" value={version} onChange={e => setVersion(e.target.value)}><option value="all">All versions</option>{[...new Set(work.items.map(item => item.target_version || ''))].sort(compareVersions).map(v => <option key={v} value={v}>{v ? `v${v}` : 'Unscheduled / commit'}</option>)}</select>
      <select aria-label="Sort all tasks" className="task-version-select" value={sort} onChange={e => setSort(e.target.value)}><option value="version">Target version</option><option value="priority">Priority</option><option value="created">Newest created / committed</option></select>
    </div>
    {actionError && <p className="repo-notice" role="alert">Could not update task: {actionError}</p>}
    <p className="text-xs text-gray-500 dark:text-gray-400">Showing {visible.length} of {work.items.length} loaded work items. Commits are feature, fix, performance or added-function evidence; routine maintenance is excluded.</p>
    {!visible.length && <div className="native-pane p-6 text-sm text-gray-500 dark:text-gray-400">{work.isLoading || work.isFetching ? 'Loading work…' : work.items.length ? 'No work matches these filters.' : 'No work loaded yet. Add a task inside a project, or refresh GitHub.'}</div>}
    {(['Todo', 'Done'] as const).map(group => {
      const items = visible.filter(item => item.status === group);
      if (!items.length) return null;
      return <div key={group} className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{group === 'Todo' ? 'Open' : 'Completed'} ({items.length})</h3>
        {items.map(item => {
          const running = item.source === 'local' && timer && 'task_id' in timer && timer.task_id === item.id;
          return <div key={item.work_key} data-work-source={item.source} className="native-pane p-4 flex items-center gap-3">
            {item.source === 'local' && !readOnly ? <button disabled={updateTask.isPending} aria-label={group === 'Done' ? 'Reopen task' : 'Mark as done'} className="secondary-button" onClick={() => run(() => updateTask.mutateAsync({ id: item.id, data: { status: group === 'Todo' ? 'Done' : 'Todo' } }))}>{group === 'Done' ? <Check size={16} /> : <span className="w-4 h-4 rounded border border-current" />}</button>
              : item.source === 'commit' ? <GitCommitHorizontal size={18} className="shrink-0 text-green-500" /> : item.source === 'github' ? <CircleDot size={18} className="shrink-0 text-gray-400" /> : <Check size={18} className="shrink-0 text-green-500" />}
            <div className="flex-1 min-w-0">
              <button onClick={() => openItem(item)} className="text-left font-medium text-gray-900 dark:text-white hover:underline break-words">{item.title}</button>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <button className="text-action" onClick={() => openItem(item)}>{item.project_name}</button>
                <span>{item.source === 'local' ? `Local task · ${item.priority}` : item.source === 'github' ? `GitHub issue #${item.github_number} · read-only` : `${item.commit!.category} · ${item.commit!.sha.slice(0, 7)}`}</span>
                {item.target_version && <span className="task-version-badge">v{item.target_version}</span>}
                {item.due_date && <span>Due {item.due_date}</span>}
              </div>
            </div>
            {item.source === 'local' && !readOnly && (group === 'Todo' || running) && <button className="secondary-button" disabled={startTimer.isPending || stopTimer.isPending} aria-label={running ? 'Stop timer' : 'Start timer'} onClick={() => run(() => running ? stopTimer.mutateAsync(item.id) : startTimer.mutateAsync(item.id))}>{running ? <Square size={16} /> : <Play size={16} />}</button>}
          </div>;
        })}
      </div>;
    })}
  </section>;
}
