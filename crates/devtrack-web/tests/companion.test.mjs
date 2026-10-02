import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBackup, emptyState, saveTask, normalizeRepository } from '../src/companion/model.ts';
import { classifyCommit, normalizeIssues, addedFunctions } from '../src/companion/github.ts';

test('mobile tasks reject invalid versions and preserve three-component alpha versions', () => {
  const state = emptyState();
  state.projects.push({ id:'p', name:'DevTrack', repository:'Zajfan/DevTrack', tags:'rust', notes:'' });
  const next = saveTask(state, { id:'t', project_id:'p', title:'Release', description:'Android', status:'todo', priority:'normal', target_version:'0.1.0-alpha.2', updated_at:'2026-10-02T00:00:00Z' });
  assert.equal(next.tasks[0].target_version, '0.1.0-alpha.2');
  assert.throws(() => saveTask(next, { ...next.tasks[0], target_version:'garbage' }), /version/i);
  assert.equal(next.tasks[0].target_version, '0.1.0-alpha.2');
});

test('desktop export import preserves versions, descriptions and project relationships', () => {
  const imported = parseBackup(JSON.stringify({projects:[{id:4,name:'DevTrack',path:'/dev/track',tags:'rust'}],tasks:[{id:8,project_id:4,title:'Android',description:'Offline',status:'todo',priority:'high',target_version:'0.2.0-alpha.1',created_at:'2026-10-01 12:00:00'}]}));
  assert.equal(imported.tasks[0].target_version,'0.2.0-alpha.1');
  assert.equal(imported.tasks[0].description,'Offline');
  assert.equal(imported.tasks[0].project_id, imported.projects[0].id);
  assert.equal(imported.projects[0].name,'DevTrack');
  const done = parseBackup(JSON.stringify({projects:[{id:4,name:'DevTrack',path:'/dev/track',tags:''}],tasks:[{id:9,project_id:4,title:'Finished',status:'Done',priority:'High',target_version:'0.1',created_at:'2026-10-01 12:00:00'}]}));
  assert.equal(done.tasks[0].status,'done');
  assert.equal(done.tasks[0].priority,'high');
});

test('mobile backup preserves notes and rejects orphan or duplicate tasks', () => {
  const state = {format:'devtrack-companion',version:1,projects:[{id:'p',name:'Test',repository:'owner/repo',tags:'Rust',notes:'Remember this'}],tasks:[{id:'t',project_id:'p',title:'Task',description:'',status:'todo',priority:'normal',target_version:'0.1',updated_at:'2026-10-02T00:00:00Z'}]};
  assert.deepEqual(parseBackup(JSON.stringify(state)), state);
  assert.throws(()=>parseBackup(JSON.stringify({...state,tasks:[{...state.tasks[0],project_id:'missing'}]})),/project/i);
  assert.throws(()=>parseBackup(JSON.stringify({...state,tasks:[state.tasks[0],state.tasks[0]]})),/duplicate/i);
  assert.throws(()=>parseBackup('{"projects":[],"tasks":[{"title":"bad"}]}'));
});

test('repository input accepts canonical GitHub URLs and rejects foreign hosts or paths',()=>{
  assert.equal(normalizeRepository('https://github.com/Zajfan/DevTrack.git'), 'Zajfan/DevTrack');
  assert.equal(normalizeRepository('Zajfan/DevTrack'), 'Zajfan/DevTrack');
  for(const input of ['https://evil.test/owner/repo','owner/repo/extra','https://github.com/owner/repo/issues']) assert.throws(()=>normalizeRepository(input));
});

test('GitHub planned work excludes pull requests and normalizes milestone versions',()=>{
  const issues=normalizeIssues([{number:2,title:'Mobile',html_url:'https://github.com/o/r/issues/2',created_at:'2026-10-01T00:00:00Z',milestone:{title:'v0.2.0-alpha.1'}},{number:3,title:'PR',pull_request:{url:'x'}}]);
  assert.equal(issues.length,1);
  assert.equal(issues[0].target_version,'0.2.0-alpha.1');
});

test('completed work classifies fixes and uses added declarations rather than calls',()=>{
  assert.equal(classifyCommit('fix: repair export',[]),'fix');
  assert.equal(classifyCommit('chore: update dependencies',[]),'maintenance');
  assert.equal(classifyCommit('docs: fix readme typo',[]),'maintenance');
  const patch='-function previous() {}\n+function previous() { changed(); }\n+export function addedFeature() {}\n+addedFeature();\n+const value = calculate();';
  assert.deepEqual(addedFunctions('src/main.ts',patch),['addedFeature']);
  assert.equal(classifyCommit('Implement new export',['addedFeature']),'feature');
});
