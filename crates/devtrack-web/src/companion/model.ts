export type CompanionProject = { id: string; name: string; repository: string; tags: string; notes: string };
export type CompanionTask = { id: string; project_id: string; title: string; description: string; status: 'todo' | 'done'; priority: string; target_version: string; updated_at: string };
export type CompanionState = { format: 'devtrack-companion'; version: 1; projects: CompanionProject[]; tasks: CompanionTask[] };

export const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
export const validVersion = (value: string) => value === '' || (value.length <= 128 && versionPattern.test(value) && !value.split('+')[0].split('-').slice(1).join('-').split('.').some(p => /^\d+$/.test(p) && p.length > 1 && p.startsWith('0')));
export const emptyState = (): CompanionState => ({ format: 'devtrack-companion', version: 1, projects: [], tasks: [] });

export function normalizeRepository(value: string): string {
  const input = value.trim().replace(/\.git\/?$/, '').replace(/\/$/, '');
  const repo = input.startsWith('https://github.com/') ? input.slice('https://github.com/'.length) : input;
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repo) || repo.split('/')[1] === '.' || repo.split('/')[1] === '..') throw new Error('Enter owner/repository or its GitHub repository URL.');
  return repo;
}

function text(value: unknown, field: string, maximum = 10000, optional = false): string {
  if (optional && (value === undefined || value === null)) return '';
  if (typeof value !== 'string' || value.length > maximum) throw new Error(`Invalid ${field}.`);
  return value;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid backup record.');
  return value as Record<string, unknown>;
}

export function parseBackup(json: string): CompanionState {
  if (json.length > 16 * 1024 * 1024) throw new Error('Backup is larger than 16 MB.');
  const root = record(JSON.parse(json));
  const mobile = root.format === 'devtrack-companion';
  if (root.format !== undefined && !mobile) throw new Error('Unrecognized backup format.');
  if (mobile && root.version !== 1) throw new Error('Unsupported backup version.');
  if (!Array.isArray(root.projects) || !Array.isArray(root.tasks) || root.projects.length > 10000 || root.tasks.length > 100000) throw new Error('Invalid backup projects or tasks.');
  const state = emptyState();
  const ids = new Map<string, string>();
  for (const raw of root.projects) {
    const p = record(raw);
    if (mobile ? typeof p.id !== 'string' : !Number.isSafeInteger(p.id)) throw new Error('Invalid project identity.');
    const source = String(p.id);
    if (ids.has(source)) throw new Error('Duplicate project identity.');
    const id = mobile ? text(p.id, 'project identity', 1000) : `desktop:${source}`;
    if (!id) throw new Error('Invalid project identity.');
    ids.set(source, id);
    const name = text(p.name, 'project name', 500).trim();
    if (!name) throw new Error('Project name is required.');
    const repository = mobile ? text(p.repository, 'repository', 300) : '';
    state.projects.push({ id, name, repository: repository ? normalizeRepository(repository) : '', tags: text(p.tags, 'tags', 2000, true), notes: mobile ? text(p.notes, 'notes', 2 * 1024 * 1024, true) : '' });
  }
  const taskIds = new Set<string>();
  for (const raw of root.tasks) {
    const t = record(raw);
    if (mobile ? typeof t.id !== 'string' : !Number.isSafeInteger(t.id)) throw new Error('Invalid task identity.');
    const id = mobile ? text(t.id, 'task identity', 1000) : `desktop:${t.id}`;
    if (!id || taskIds.has(id)) throw new Error('Duplicate or empty task identity.');
    taskIds.add(id);
    const project_id = ids.get(String(t.project_id));
    if (!project_id) throw new Error('Task belongs to a missing project.');
    const status = text(t.status, 'task status', 50).toLowerCase();
    if (!['todo', 'done', 'completed'].includes(status)) throw new Error('Invalid task status.');
    const priority = text(t.priority, 'priority', 50, true).toLowerCase() || 'normal';
    const task: CompanionTask = {
      id, project_id, title: text(t.title, 'task title', 1000).trim(), description: text(t.description, 'description', 100000, true),
      status: status === 'done' || status === 'completed' ? 'done' : 'todo', priority: priority === 'medium' ? 'normal' : priority,
      target_version: text(t.target_version, 'version', 128, true), updated_at: text(t.updated_at ?? t.created_at ?? '1970-01-01T00:00:00Z', 'timestamp', 100),
    };
    if (!task.title || !validVersion(task.target_version)) throw new Error('Invalid task title or version.');
    if (mobile && !['todo', 'done'].includes(String(t.status))) throw new Error('Invalid task status.');
    if (!Number.isFinite(Date.parse(task.updated_at))) throw new Error('Invalid task timestamp.');
    state.tasks.push(task);
  }
  return state;
}

export function saveTask(state: CompanionState, task: CompanionTask): CompanionState {
  if (!task.title.trim()) throw new Error('Task title is required.');
  if (!validVersion(task.target_version)) throw new Error('Use a version such as 0.1, 0.1.0 or 0.1.0-alpha.1.');
  if (!state.projects.some(p => p.id === task.project_id)) throw new Error('Project no longer exists.');
  return parseBackup(JSON.stringify({ ...state, tasks: [...state.tasks.filter(t => t.id !== task.id), { ...task, title: task.title.trim() }] }));
}
