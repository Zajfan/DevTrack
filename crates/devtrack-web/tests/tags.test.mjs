import test from 'node:test';
import assert from 'node:assert/strict';
import { projectTags, hasProjectTag, projectTagHref } from '../src/utils/tags.ts';
test('tags are trimmed, empty tags removed, and duplicates combined', () => {
  assert.deepEqual(projectTags(' web, ,Rust, web, rust '), ['web','Rust']);
});
test('selected tags match complete tags case-insensitively', () => {
  assert.equal(hasProjectTag('webapp, frontend','web'),false);
  assert.equal(hasProjectTag(' WEB, frontend ','web'),true);
  assert.equal(hasProjectTag('web, frontend','front'),false);
});
test('tag links preserve spaces and reserved characters', () => {
  const tag = 'C++ & tools/#';
  const url = new URL(projectTagHref(tag),'https://app.local');
  assert.equal(url.pathname,'/projects');
  assert.equal(url.searchParams.get('tag'),tag);
});
