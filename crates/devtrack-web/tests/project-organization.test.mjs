import test from 'node:test';
import assert from 'node:assert/strict';
import { groupProjectsByFolder, sortProjects } from '../src/utils/projectOrganization.ts';

const project = (id, name, path, extra = {}) => ({
  id, name, path, status: 'Active', tags: '', last_accessed: null,
  created_at: '', ...extra,
});

test('projects are grouped by their collection folder', () => {
  const groups = groupProjectsByFolder([
    project(1, 'Alpha', '/mnt/data/dev/Learning/Alpha'),
    project(2, 'Beta', '/mnt/data/dev/Learning/Beta'),
    project(3, 'Gamma', '/mnt/data/dev/Testing/Gamma'),
    project(4, 'DevTrack', '/mnt/data/dev/The-No-hands-Company/projects/Testing/DevTrack'),
    project(5, 'Nexus App', '/mnt/data/dev/The-No-hands-Company/projects/Nexus-Systems/apps/App One'),
    project(6, 'Website', '/mnt/data/dev/The-No-hands-Company/tnhc.dev'),
  ]);
  assert.deepEqual(groups.map(([name, rows]) => [name, rows.length]), [
    ['Learning', 2], ['Nexus-Systems', 1], ['Testing', 2], ['tnhc.dev', 1],
  ]);
});

test('projects sort by status, path, or name without mutating the input', () => {
  const rows = [project(1, 'Zeta', '/dev/Zeta', { status: 'Paused' }), project(2, 'Alpha', '/dev/Alpha', { status: 'Active' })];
  assert.deepEqual(sortProjects(rows, 'name', 'asc').map(row => row.name), ['Alpha', 'Zeta']);
  assert.deepEqual(sortProjects(rows, 'status', 'asc').map(row => row.status), ['Active', 'Paused']);
  assert.deepEqual(rows.map(row => row.name), ['Zeta', 'Alpha']);
});
