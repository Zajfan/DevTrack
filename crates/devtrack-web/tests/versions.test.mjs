import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions } from '../src/utils/versions.ts';
test('version sorting uses numeric components, prerelease precedence, and unscheduled last', () => {
  const input = ['', '1.10', '1.2', '0.1.0', '0.1.0-alpha.10', '0.1.0-alpha.2', '1.0', '0.1'];
  assert.deepEqual(input.sort(compareVersions), ['0.1.0-alpha.2', '0.1.0-alpha.10', '0.1.0', '0.1', '1.0', '1.2', '1.10', '']);
  assert.equal(compareVersions('1.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.0+build.1', '1.0+build.2'), 0);
});

test('newest order compares dates across local tasks and GitHub issues', async () => {
  const { compareCreatedNewest } = await import('../src/utils/versions.ts');
  const tasks = [ { id: 50, created_at: '2026-01-01 00:00:00' }, { id: -1, created_at: '2026-02-01T00:00:00Z' }, { id: -2, created_at: '2026-03-01T00:00:00Z' } ];
  assert.deepEqual(tasks.sort(compareCreatedNewest).map(t=>t.id), [-2,-1,50]);
});
