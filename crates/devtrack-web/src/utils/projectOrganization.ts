import type { Project } from '../types';

export type ProjectSortKey = 'name' | 'folder' | 'status' | 'path' | 'lastAccessed';
export type SortDirection = 'asc' | 'desc';

export function projectFolderGroup(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean);
  const devIndex = parts.findIndex(part => part.toLocaleLowerCase() === 'dev');
  if (devIndex >= 0 && parts[devIndex + 1]) {
    const root = parts[devIndex + 1];
    if (root.toLocaleLowerCase() === 'the-no-hands-company') {
      const collection = parts[devIndex + 2];
      if (collection?.toLocaleLowerCase() === 'projects') return parts[devIndex + 3] ?? collection;
      return collection ?? root;
    }
    return root;
  }
  return parts.length > 1 ? parts[parts.length - 2] : 'Other';
}

export function groupProjectsByFolder(projects: Project[]): [string, Project[]][] {
  const groups = new Map<string, Project[]>();
  for (const project of projects) {
    const folder = projectFolderGroup(project.path);
    groups.set(folder, [...(groups.get(folder) ?? []), project]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true }))
    .map(([folder, rows]) => [folder, sortProjects(rows, 'name', 'asc')]);
}

export function sortProjects(projects: Project[], key: ProjectSortKey, direction: SortDirection): Project[] {
  const statusOrder: Record<string, number> = { Active: 0, Paused: 1, Archived: 2 };
  const value = (project: Project): string | number => {
    switch (key) {
      case 'folder': return projectFolderGroup(project.path);
      case 'status': return statusOrder[project.status] ?? 99;
      case 'path': return project.path;
      case 'lastAccessed': return project.last_accessed ? Date.parse(project.last_accessed) || 0 : 0;
      default: return project.name;
    }
  };
  return [...projects].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), undefined, { sensitivity: 'base', numeric: true });
    if (comparison === 0) return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
    return direction === 'asc' ? comparison : -comparison;
  });
}
